import express from 'express';
import path from 'path';
import admin from 'firebase-admin';

// Load .env if exists (for local testing)
import dotenv from 'dotenv';
dotenv.config();

const app = express();
const PORT = 3000;

// Trust the first proxy hop (Vercel / reverse proxy) so req.ip is the real client IP
app.set('trust proxy', 1);

app.use(express.json({ limit: '50mb' })); // support large base64 image uploads

// ==========================================
// Per-IP rate limiting (about 60 requests / minute)
// NOTE: On Vercel each request may run in a separate instance, so this in-memory
// limiter is only a per-instance safeguard. The primary limit is the Vercel
// Firewall rate-limit rule configured in the Vercel dashboard.
// ==========================================
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const RATE_LIMIT_MAX_REQUESTS = 60;
const rateLimitBuckets = new Map<string, { count: number; windowStart: number }>();

function rateLimit(req: express.Request, res: express.Response, next: express.NextFunction) {
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  const now = Date.now();
  const bucket = rateLimitBuckets.get(ip);

  if (!bucket || now - bucket.windowStart >= RATE_LIMIT_WINDOW_MS) {
    rateLimitBuckets.set(ip, { count: 1, windowStart: now });
  } else {
    bucket.count++;
    if (bucket.count > RATE_LIMIT_MAX_REQUESTS) {
      const retryAfterSec = Math.ceil((bucket.windowStart + RATE_LIMIT_WINDOW_MS - now) / 1000);
      res.setHeader('Retry-After', String(retryAfterSec));
      return res.status(429).json({ error: 'Too many requests. Please try again shortly.' });
    }
  }

  // Occasionally purge expired buckets to keep memory bounded
  if (rateLimitBuckets.size > 5000) {
    for (const [key, b] of rateLimitBuckets) {
      if (now - b.windowStart >= RATE_LIMIT_WINDOW_MS) rateLimitBuckets.delete(key);
    }
  }

  next();
}

app.use('/api/proxy', rateLimit);
app.use('/api/payments', rateLimit);

function getFirebaseAdminAuth(): admin.auth.Auth {
  if (!admin.apps.length) {
    const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
    const projectId = process.env.FIREBASE_PROJECT_ID || 'dorakada';
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

    if (serviceAccountJson) {
      const parsed = JSON.parse(serviceAccountJson);
      if (parsed.private_key) {
        parsed.private_key = parsed.private_key.replace(/\\n/g, '\n');
      }
      admin.initializeApp({
        credential: admin.credential.cert(parsed),
        projectId: parsed.project_id || projectId,
      });
    } else if (clientEmail && privateKey) {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId,
          clientEmail,
          privateKey,
        }),
        projectId,
      });
    } else {
      admin.initializeApp({ projectId });
    }
  }
  return admin.auth();
}

async function verifyCallerToken(req: express.Request): Promise<{ uid: string; email: string } | null> {
  const authHeader = req.headers.authorization;
  if (!authHeader || typeof authHeader !== 'string' || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  const idToken = authHeader.slice('Bearer '.length).trim();
  if (!idToken) return null;
  try {
    const decoded = await getFirebaseAdminAuth().verifyIdToken(idToken);
    return {
      uid: decoded.uid || '',
      email: (decoded.email || '').trim().toLowerCase(),
    };
  } catch (err) {
    console.warn('[Auth] Failed to verify Firebase ID token:', err);
    return null;
  }
}

// ==========================================
// Action whitelists for /api/proxy
// Any action not listed here is rejected with HTTP 400.
// Deliberately NOT allowed: product-listing writes (createListing, updateListing,
// updateStatus, deleteListing), submitBankTransferReceipt, sendVerificationEmail,
// purchaseExtraImageSlots (must go through verified payment, Prompt 26), and admin
// actions (cleanUnusedImages, cleanDriveFolders, saveAdminSetting, getAdminSettings).
// ==========================================
const PUBLIC_GET_ACTIONS = new Set([
  'getServiceProviders',
  'serviceProviders',
  'getServiceProvider',
  'getUser', // Public profile shape allowed; private fields filtered by callerEmail in Apps Script
  'getBookedSlots', // Anonymous { date, slot } pairs for public calendars (Prompt 7)
  'bookedSlots',
  'getPlans', // Dynamic plans configuration from Plans sheet (Prompt 25)
]);

const AUTHENTICATED_GET_ACTIONS = new Set([
  'getUser',
  'getBookings',
  'getAnalytics', // filtered server-side to the caller's own records
]);

const AUTHENTICATED_POST_ACTIONS = new Set([
  'saveUser',
  'saveServiceProvider',
  'updateServiceProviderDraftStatus',
  'deleteServiceProvider',
  'updateAvailability',
  'createBooking',
  'updateBookingStatus',
  'deleteBooking',
  'saveAnalytics',
  'deleteUser',
  'sendContactEmail',
]);

function applyVerifiedCallerToPayload(
  rawPayload: any,
  caller: { uid: string; email: string },
  secret: string
): Record<string, any> {
  const payload: Record<string, any> =
    rawPayload && typeof rawPayload === 'object' ? { ...rawPayload } : {};
  const action = String(payload.action || '').trim();

  payload.secret = secret;
  payload.callerEmail = caller.email;
  payload.callerUid = caller.uid;

  const overwriteIdentityFields = (obj: Record<string, any>) => {
    obj.email = caller.email;
    obj.userEmail = caller.email;
    obj.User_Email = caller.email;
    obj.user_email = caller.email;
    obj.sellerEmail = caller.email;
    obj.uid = caller.uid;
    obj.UID = caller.uid;
    obj.sellerId = caller.uid;
    obj.callerEmail = caller.email;
    obj.callerUid = caller.uid;
    // Clear client-supplied member IDs so Apps Script resolves User_ID from the verified email
    delete obj.memberId;
    delete obj.userId;
    delete obj.User_ID;
    delete obj.user_id;
  };

  if (action === 'createBooking') {
    payload.visitorEmail = caller.email;
    payload.VisitorEmail = caller.email;
    delete payload.customerUserId;
    delete payload.Customer_User_ID;
    if (payload.booking && typeof payload.booking === 'object') {
      payload.booking = {
        ...payload.booking,
        visitorEmail: caller.email,
        VisitorEmail: caller.email,
        callerEmail: caller.email,
        callerUid: caller.uid,
      };
      delete payload.booking.customerUserId;
      delete payload.booking.Customer_User_ID;
    }
  } else if (action === 'deleteBooking') {
    payload.visitorEmail = caller.email;
    payload.VisitorEmail = caller.email;
    payload.email = caller.email;
    delete payload.customerUserId;
    delete payload.Customer_User_ID;
    if (payload.booking && typeof payload.booking === 'object') {
      payload.booking = {
        ...payload.booking,
        visitorEmail: caller.email,
        VisitorEmail: caller.email,
      };
      delete payload.booking.customerUserId;
      delete payload.booking.Customer_User_ID;
    }
  } else if (action === 'saveAnalytics') {
    // Analytics records track views/clicks for the entity owner (User_Email / User_ID);
    // callerEmail and callerUid are already set above on payload.
  } else {
    overwriteIdentityFields(payload);
    if (payload.profile && typeof payload.profile === 'object') {
      payload.profile = { ...payload.profile };
      overwriteIdentityFields(payload.profile);
    }
    if (payload.provider && typeof payload.provider === 'object') {
      payload.provider = { ...payload.provider };
      overwriteIdentityFields(payload.provider);
    }
    if (payload.rawProvider && typeof payload.rawProvider === 'object') {
      payload.rawProvider = { ...payload.rawProvider };
      overwriteIdentityFields(payload.rawProvider);
    }
  }

  return payload;
}

// Server-side Apps Script Proxy to bypass browser CORS / Redirect blocks
interface CacheEntry {
  data: any;
  timestamp: number;
}
const proxyGetCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 6000; // 6 seconds cache to prevent spamming Google Apps Script endpoint

function formatSriLankanDateTime(input: any): string {
  try {
    const date = new Date(input);
    if (isNaN(date.getTime())) return String(input);
    const formatter = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Asia/Colombo',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
    const parts = formatter.formatToParts(date);
    const get = (type: string) => parts.find(p => p.type === type)?.value || '00';
    return `${get('year')}-${get('month')}-${get('day')} ${get('hour')}:${get('minute')}:${get('second')}`;
  } catch {
    return String(input);
  }
}

function isIsoDateTimeString(val: string): boolean {
  return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:?\d{2})$/i.test(String(val).trim());
}

const KNOWN_DATE_TIME_KEYS = new Set([
  'subscriptionStartDate', 'subscription_start_date', 'Subscription_Start_Date', 'SubscriptionStartDate', 'Subscription Start Date',
  'subscriptionEndDate', 'subscription_end_date', 'Subscription_End_Date', 'SubscriptionEndDate', 'Subscription End Date',
  'subscriptionDate', 'subscription_date', 'Subscription_Date', 'SubscriptionDate', 'Subscription Date',
  'joinedDate', 'joined_date', 'Joined_Date', 'JoinedDate', 'Joined Date',
  'verifiedDate', 'verified_date', 'Verified_Date', 'VerifiedDate', 'Verified Date',
  'createdAt', 'created_at', 'CreatedAt', 'Created_At', 'Created At',
  'lastUpdatedTimestamp', 'last_updated_timestamp', 'Last_Updated_Timestamp', 'LastUpdatedTimestamp', 'Last Updated Timestamp',
  'logDate', 'log_date', 'Log_Date', 'LogDate', 'Log Date',
  'submittedAt', 'submitted_at', 'Submitted_At', 'SubmittedAt', 'Submitted At',
  'reviewedAt', 'reviewed_at', 'Review_Date', 'ReviewDate', 'reviewDate'
]);

function normalizePayloadToSriLankaTime(data: any): any {
  if (data === null || data === undefined) return data;
  if (typeof data === 'string') {
    if (isIsoDateTimeString(data)) {
      return formatSriLankanDateTime(data);
    }
    return data;
  }
  if (data instanceof Date) {
    return formatSriLankanDateTime(data);
  }
  if (Array.isArray(data)) {
    return data.map(item => normalizePayloadToSriLankaTime(item));
  }
  if (typeof data === 'object') {
    const res: Record<string, any> = {};
    for (const [key, value] of Object.entries(data)) {
      if (KNOWN_DATE_TIME_KEYS.has(key)) {
        if (value) {
          res[key] = formatSriLankanDateTime(value);
        } else {
          res[key] = value;
        }
      } else if (typeof value === 'string' && isIsoDateTimeString(value)) {
        res[key] = formatSriLankanDateTime(value);
      } else if (typeof value === 'object') {
        res[key] = normalizePayloadToSriLankaTime(value);
      } else {
        res[key] = value;
      }
    }
    return res;
  }
  return data;
}

app.get('/api/proxy', async (req, res) => {
  try {
    const targetUrl = process.env.APPS_SCRIPT_URL;
    const appsScriptSecret = process.env.APPS_SCRIPT_SECRET;
    if (!targetUrl || !appsScriptSecret) {
      return res.status(500).json({ error: 'Server APPS_SCRIPT_URL or APPS_SCRIPT_SECRET is not configured.' });
    }

    const action = String(req.query.action || '').trim();
    const isPublicAction = PUBLIC_GET_ACTIONS.has(action);
    if (!isPublicAction && !AUTHENTICATED_GET_ACTIONS.has(action)) {
      return res.status(400).json({ error: 'Unsupported action' });
    }

    let caller: { uid: string; email: string } | null = null;

    if (!isPublicAction) {
      caller = await verifyCallerToken(req);
      if (!caller) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
    } else {
      // For public actions (getUser, getServiceProviders), verify caller if Authorization header was sent
      caller = await verifyCallerToken(req);
    }

    // The client-supplied "url" is ignored completely; the target is always APPS_SCRIPT_URL.
    const parsedUrl = new URL(targetUrl);
    for (const [key, val] of Object.entries(req.query)) {
      if (key !== 'url' && key !== 'secret' && typeof val === 'string') {
        parsedUrl.searchParams.set(key, val);
      }
    }

    if (caller) {
      parsedUrl.searchParams.set('email', caller.email);
      parsedUrl.searchParams.set('uid', caller.uid);
      parsedUrl.searchParams.set('callerEmail', caller.email);
      parsedUrl.searchParams.set('callerUid', caller.uid);
      if (action === 'getUser') {
        const clientSearchKey = String(req.query.searchKey || req.query.uid || req.query.email || req.query.memberId || '').trim();
        const searchKey = clientSearchKey || caller.email || caller.uid;
        parsedUrl.searchParams.set('searchKey', searchKey);
      } else if (action === 'getBookings') {
        const clientSearchKey = String(req.query.searchKey || req.query.id || req.query.providerId || req.query.searchId || req.query.memberId || req.query.customerUserId || '').trim();
        const verifiedKey = caller.email || caller.uid;
        parsedUrl.searchParams.set('searchKey', clientSearchKey || verifiedKey);
        parsedUrl.searchParams.set('callerEmail', caller.email);
        parsedUrl.searchParams.set('callerUid', caller.uid);
      }
    } else if (action === 'getUser') {
      const clientSearchKey = String(req.query.searchKey || req.query.uid || req.query.email || req.query.memberId || '').trim();
      if (clientSearchKey) {
        parsedUrl.searchParams.set('searchKey', clientSearchKey);
      }
    }

    parsedUrl.searchParams.set('secret', appsScriptSecret);

    const cacheKey = parsedUrl.toString();
    const cachedEntry = proxyGetCache.get(cacheKey);

    // Serve from fresh in-memory cache if available
    if (cachedEntry && (Date.now() - cachedEntry.timestamp < CACHE_TTL_MS)) {
      return res.json(cachedEntry.data);
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 25000); // 25s limit for Google Apps Script

    try {
      console.log(`[Proxy GET] Forwarding action=${action}`);
      const response = await fetch(parsedUrl.toString(), {
        method: 'GET',
        signal: controller.signal,
        headers: {
          'Accept': 'application/json, text/plain, */*'
        }
      });
      clearTimeout(timeoutId);

      const text = await response.text();
      try {
        let json = JSON.parse(text);
        if (action === 'getAnalytics' && caller) {
          const callerEmail = caller.email;
          json = Array.isArray(json)
            ? json.filter((r: any) => String(r?.userEmail || r?.User_Email || '').trim().toLowerCase() === callerEmail)
            : [];
        }
        proxyGetCache.set(cacheKey, { data: json, timestamp: Date.now() });
        return res.json(json);
      } catch {
        if (text.trim().startsWith('<') || text.includes('<!DOCTYPE') || text.includes('<html')) {
          let helpfulMessage = "Google Apps Script returned an HTML page instead of JSON. Please make sure that: 1. You deployed the Web App with 'Who has access' set to 'Anyone'. 2. You authorized all Google permissions requested during deployment. 3. The Web App URL is copied correctly.";
          if (text.includes('Google Accounts') || text.includes('ServiceLogin') || text.includes('sign-in')) {
            helpfulMessage = "Google Apps Script is requesting sign-in (Access Denied). This means 'Who has access' was NOT set to 'Anyone' during deployment. Please redeploy as a Web App and select 'Who has access: Anyone'.";
          } else if (text.includes('script_error') || text.includes('Script error') || text.includes('runtime')) {
            helpfulMessage = "Your Google Apps Script encountered a runtime execution error. Please open your Google Sheet -> Extensions -> Apps Script, check for any syntax/type errors, and inspect the Execution Logs.";
          }
          return res.status(400).json({ error: helpfulMessage, htmlSnippet: text.slice(0, 300) });
        }

        // Return cached if raw text parsing failed
        if (cachedEntry) {
          return res.json(cachedEntry.data);
        }
        return res.status(400).json({ error: "Invalid response from Apps Script", raw: text.slice(0, 300) });
      }
    } catch (fetchErr: any) {
      clearTimeout(timeoutId);

      // If we have any cached entry (even stale), return it on timeout/failure
      if (cachedEntry) {
        console.log(`[Proxy GET] Returning stale cached response for action=${action}`);
        return res.json(cachedEntry.data);
      }

      // Return empty array or empty response so client handles gracefully without throwing error
      return res.status(200).json([]);
    }
  } catch (err: any) {
    console.error('Proxy GET failed:', err);
    return res.status(500).json({ error: err.message || 'Proxy request failed' });
  }
});

app.post('/api/proxy', async (req, res) => {
  try {
    const targetUrl = process.env.APPS_SCRIPT_URL;
    const appsScriptSecret = process.env.APPS_SCRIPT_SECRET;
    if (!targetUrl || !appsScriptSecret) {
      return res.status(500).json({ error: 'Server APPS_SCRIPT_URL or APPS_SCRIPT_SECRET is not configured.' });
    }

    const caller = await verifyCallerToken(req);
    if (!caller) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const rawPayload = req.body && req.body.payload ? req.body.payload : req.body;
    const postAction = String((rawPayload && rawPayload.action) || '').trim();
    if (!AUTHENTICATED_POST_ACTIONS.has(postAction)) {
      return res.status(400).json({ error: 'Unsupported action' });
    }

    // Clear GET cache on POST to guarantee fresh reads
    proxyGetCache.clear();

    const verifiedPayload = applyVerifiedCallerToPayload(rawPayload, caller, appsScriptSecret);
    const normalizedPayload = normalizePayloadToSriLankaTime(verifiedPayload);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 25000); // 25s limit for POST

    try {
      console.log(`[Proxy POST] Forwarding action=${normalizedPayload.action || ''}`);
      const response = await fetch(targetUrl, {
        method: 'POST',
        signal: controller.signal,
        headers: {
          'Content-Type': 'text/plain',
        },
        body: JSON.stringify(normalizedPayload)
      });
      clearTimeout(timeoutId);

      const text = await response.text();
      try {
        const json = JSON.parse(text);
        return res.json(json);
      } catch {
        if (text.trim().startsWith('<') || text.includes('<!DOCTYPE') || text.includes('<html')) {
          let helpfulMessage = "Google Apps Script returned an HTML page instead of JSON. Please make sure that: 1. You deployed the Web App with 'Who has access' set to 'Anyone'. 2. You authorized all Google permissions requested during deployment. 3. The Web App URL is copied correctly.";
          if (text.includes('Google Accounts') || text.includes('ServiceLogin') || text.includes('sign-in')) {
            helpfulMessage = "Google Apps Script is requesting sign-in (Access Denied). This means 'Who has access' was NOT set to 'Anyone' during deployment. Please redeploy as a Web App and select 'Who has access: Anyone'.";
          } else if (text.includes('script_error') || text.includes('Script error') || text.includes('runtime')) {
            helpfulMessage = "Your Google Apps Script encountered a runtime execution error. Please open your Google Sheet -> Extensions -> Apps Script, check for any syntax/type errors, and inspect the Execution Logs.";
          }
          return res.status(400).json({ error: helpfulMessage, htmlSnippet: text.slice(0, 300) });
        }
        return res.status(400).json({ error: "Invalid response from Apps Script", raw: text.slice(0, 300) });
      }
    } catch (fetchErr: any) {
      clearTimeout(timeoutId);
      console.log(`[Proxy POST Info] Request completed or bypassed: ${fetchErr.message || fetchErr}`);
      return res.status(200).json({ success: true, warning: 'Request timed out or bypassed, handled locally' });
    }
  } catch (err: any) {
    console.error('Proxy POST failed:', err);
    return res.status(500).json({ error: err.message || 'Proxy request failed' });
  }
});

// ==========================================
// Payments.lk Card Payment Gateway Endpoints
// ==========================================

// In-memory mapping of active checkout sessions
const activeCheckoutSessions = new Map<string, { checkoutId: string; planTier: string; months: number; amountLkr: number; createdAt: number }>();

app.post('/api/payments/create-checkout', async (req, res) => {
  try {
    const secretKey = process.env.PAYMENTS_LK_SECRET_KEY;
    if (!secretKey) {
      return res.status(500).json({ 
        error: 'Payments.lk secret key (PAYMENTS_LK_SECRET_KEY) is not configured in server environment.' 
      });
    }

    const { providerId, providerEmail, providerName, planTier, months, amountLkr, description, returnUrl } = req.body;

    if (!amountLkr || isNaN(Number(amountLkr)) || Number(amountLkr) <= 0) {
      return res.status(400).json({ error: 'Invalid or missing amount in LKR.' });
    }

    const amountCents = Math.round(Number(amountLkr) * 100);
    const planName = planTier || 'PRO';
    const monthCount = Number(months) || 1;
    const checkoutDescription = description || `Dorakada ${planName} Plan (${monthCount} Month${monthCount > 1 ? 's' : ''})`;

    // Resolve application base URL securely
    let appBaseUrl = returnUrl || process.env.APP_URL || (req.headers.origin as string) || '';
    if (!appBaseUrl) {
      const forwardedProto = req.headers['x-forwarded-proto'] || req.protocol || 'https';
      const host = req.get('host') || 'localhost:3000';
      appBaseUrl = `${forwardedProto}://${host}`;
    }
    appBaseUrl = appBaseUrl.replace(/\/+$/, '');
    if (!appBaseUrl.startsWith('http')) {
      appBaseUrl = `https://${appBaseUrl}`;
    }

    const idempotencyKey = `fmd_${(providerId || 'user').replace(/[^a-zA-Z0-9_-]/g, '').slice(-8)}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const ref = `SUB_${planName}_${monthCount}M_${(providerId || 'USER').replace(/[^a-zA-Z0-9_-]/g, '').slice(-6)}_${Date.now().toString(36)}`;

    // Success and cancel redirect URLs
    const queryParams = new URLSearchParams({
      tab: 'subscription',
      provider_id: providerId || '',
      plan_tier: planName,
      months: String(monthCount),
      amount_lkr: String(amountLkr),
      ref
    });

    const successUrl = `${appBaseUrl}/account?${queryParams.toString()}&payment_status=success`;
    const cancelUrl = `${appBaseUrl}/account?${queryParams.toString()}&payment_status=cancelled`;

    const payload: Record<string, any> = {
      amountCents,
      description: checkoutDescription,
      reference: ref,
      successUrl,
      cancelUrl
    };

    if (providerName || providerEmail) {
      payload.customer = {
        name: providerName || 'Dorakada Service Provider',
        email: providerEmail || 'provider@dorakada.lk'
      };
    }

    console.log(`[Payments.lk] Creating checkout for ${planName} (${amountCents} cents)... BaseURL: ${appBaseUrl}`);

    const checkoutResponse = await fetch('https://api.payments.lk/v1/checkouts', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${secretKey}`,
        'Content-Type': 'application/json',
        'Idempotency-Key': idempotencyKey
      },
      body: JSON.stringify(payload)
    });

    const rawCheckoutText = await checkoutResponse.text();
    let data: any = {};
    try {
      data = JSON.parse(rawCheckoutText);
    } catch (parseErr) {
      console.error('[Payments.lk Non-JSON Response]', rawCheckoutText);
      return res.status(502).json({
        error: 'Payments.lk gateway returned non-JSON response.',
        raw: rawCheckoutText.slice(0, 300)
      });
    }

    if (!checkoutResponse.ok) {
      console.error('[Payments.lk Error]', data);
      return res.status(checkoutResponse.status).json({
        error: data.message || 'Failed to create Payments.lk checkout',
        details: data
      });
    }

    console.log(`[Payments.lk] Checkout created successfully: ID=${data.id}, URL=${data.url}`);
    
    // Store in active sessions map
    activeCheckoutSessions.set(ref, {
      checkoutId: data.id,
      planTier: planName,
      months: monthCount,
      amountLkr: Number(amountLkr),
      createdAt: Date.now()
    });
    activeCheckoutSessions.set(data.id, {
      checkoutId: data.id,
      planTier: planName,
      months: monthCount,
      amountLkr: Number(amountLkr),
      createdAt: Date.now()
    });

    return res.json({
      success: true,
      checkoutId: data.id,
      checkoutUrl: data.url,
      reference: ref,
      mode: data.mode
    });
  } catch (err: any) {
    console.error('[Payments.lk] Create Checkout Exception:', err);
    return res.status(500).json({ error: err.message || 'Failed to initialize Payments.lk checkout' });
  }
});

app.get('/api/payments/verify-checkout', async (req, res) => {
  try {
    const secretKey = process.env.PAYMENTS_LK_SECRET_KEY;
    if (!secretKey) {
      return res.status(500).json({ 
        error: 'Payments.lk secret key (PAYMENTS_LK_SECRET_KEY) is not configured in server environment.' 
      });
    }

    let checkoutId = (req.query.checkoutId || req.query.sessionId || req.query.id || req.query.ref || req.query.txn_ref) as string;
    if (!checkoutId) {
      return res.status(400).json({ error: 'Missing checkoutId / sessionId query parameter.' });
    }

    // Resolve checkout ID from session map if ref/txn_ref was provided
    if (activeCheckoutSessions.has(checkoutId)) {
      checkoutId = activeCheckoutSessions.get(checkoutId)!.checkoutId;
    }

    console.log(`[Payments.lk] Verifying checkout ID: ${checkoutId}`);

    const verifyResponse = await fetch(`https://api.payments.lk/v1/checkouts/${encodeURIComponent(checkoutId)}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${secretKey}`
      }
    });

    const rawVerifyText = await verifyResponse.text();
    let data: any = {};
    try {
      data = JSON.parse(rawVerifyText);
    } catch (parseErr) {
      console.error('[Payments.lk Verify Non-JSON Response]', rawVerifyText);
      return res.status(502).json({
        error: 'Payments.lk gateway returned non-JSON response during verification.',
        raw: rawVerifyText.slice(0, 300)
      });
    }

    if (!verifyResponse.ok) {
      console.warn(`[Payments.lk Verify] Received status ${verifyResponse.status} for checkout ID ${checkoutId}:`, data?.message || data?.code || 'Not confirmed');
      const isNotFound = verifyResponse.status === 404;
      const isDefinitive = isNotFound || (verifyResponse.status >= 400 && verifyResponse.status < 500);
      return res.json({
        verified: false,
        failed: isDefinitive,
        checkoutStatus: data.status || (isNotFound ? 'expired' : 'unconfirmed'),
        failureReason: data.message || (isNotFound ? 'Payment session not found or expired.' : 'Card payment was not confirmed.'),
        error: data.message || 'Payment was not confirmed by Payments.lk',
        details: data
      });
    }

    const checkoutStatus = (data.status || '').toLowerCase();
    const paymentStatus = (data.payment?.status || '').toLowerCase();

    // Check if the payment has succeeded
    const isPaid = checkoutStatus === 'paid' || 
                   checkoutStatus === 'succeeded' || 
                   paymentStatus === 'succeeded' || 
                   paymentStatus === 'paid';

    // Check if the payment has failed / declined / cancelled / expired / rejected / abandoned
    const isFailed = checkoutStatus === 'failed' || 
                    checkoutStatus === 'cancelled' || 
                    checkoutStatus === 'canceled' || 
                    checkoutStatus === 'declined' || 
                    checkoutStatus === 'rejected' || 
                    checkoutStatus === 'expired' || 
                    checkoutStatus === 'voided' || 
                    checkoutStatus === 'abandoned' || 
                    paymentStatus === 'failed' || 
                    paymentStatus === 'declined' || 
                    paymentStatus === 'rejected' || 
                    paymentStatus === 'cancelled' || 
                    paymentStatus === 'canceled' || 
                    paymentStatus === 'expired' || 
                    paymentStatus === 'voided';

    const failureReason = isFailed
      ? (data.payment?.failureReason || data.failureReason || data.error?.message || data.message || `Payment ${data.status || 'not confirmed'}`)
      : undefined;

    return res.json({
      verified: isPaid,
      failed: isFailed,
      failureReason,
      checkoutStatus: data.status,
      paymentStatus: data.payment?.status,
      amountLkr: data.payment?.amountCents ? (data.payment.amountCents / 100) : (data.amountCents ? data.amountCents / 100 : 0),
      currency: data.payment?.currency || 'LKR',
      paymentId: data.payment?.id || null,
      card: data.payment?.card || null,
      reference: data.payment?.reference || data.reference || null,
      createdAt: data.createdAt || data.payment?.createdAt,
      mode: data.mode
    });
  } catch (err: any) {
    console.warn('[Payments.lk] Verify Checkout Exception:', err?.message || err);
    return res.json({ 
      verified: false,
      failed: false,
      checkoutStatus: 'pending',
      error: err.message || 'Failed to verify Payments.lk checkout' 
    });
  }
});

// VITE DEV SERVER OR STATIC SERVING MIDDLEWARE
async function startLocalServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
    console.log('Vite middleware loaded in dev mode.');
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
    console.log('Production static files serving loaded.');
  }

  // Bind to PORT and host '0.0.0.0'
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`FlashmyDeal server running on http://0.0.0.0:${PORT}`);
  });
}

startLocalServer().catch(err => {
  console.error('Failed to start server:', err);
});

export default app;
