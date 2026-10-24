# Dorakada – Code Review Fix Prompts

Code review of the Dorakada project (React/Vite front end, `server.ts` Express server, `google-apps-script.gs` back end), 19 Oct 2026.

**How to use:** Send **Prompt 0** first, then send the other prompts one at a time, in order. Test the app after each one before sending the next. Prompts 1–9 are security-critical and must be finished before launch.

**Part 1 (Prompts 1–23)** fixes errors found in the current code.
**Part 2 (Prompts 24–33)** restructures the website: services only, one service ad per account, the new database sheets, PAYable card payments, the Platinum → Gold downgrade, booking privacy and Google-only login, the email system, the expired-plan lock, full account deletion, and removing unnecessary code. The owner decisions at the start of Part 2 are final.

Where Part 2 changes something Part 1 also mentions, **Part 2 wins**. In particular, PAYable replaces Payments.lk, every plan allows only one service ad, product ads and bank transfer are removed, and login is Google only.

### Recommended sending order

Part 2 rebuilds the database and removes whole features, so fixing old code first and then replacing it wastes work. Send the prompts in this order:

| Step | Prompts | Why |
|---|---|---|
| 1 | 0 | Context and standing rules |
| 2 | 1, 2, 3, 4, 7, 9 | Close the security holes and stop the Drive cleanup deleting files, right now |
| 3 | 24, 25 | Services only, one ad, new database |
| 4 | 28 | Google-only login, booking flow and contact privacy (replaces most of Prompt 8) |
| 5 | 26, 27 | PAYable payments and downgrade (covers Prompts 5 and 15) |
| 6 | 29, 30 | Emails and the expired-plan lock (covers Prompts 12 and 20) |
| 7 | 31 | Account deletion (replaces Prompt 6) |
| 8 | 10, 11, 13, 14, 16, 17, 18, 19 | Remaining bugs, applied to the NEW code. Skip any that no longer apply and say so |
| 9 | 32, 21, 22, 23 | Remove unnecessary code and clean up |
| 10 | 33, then Final check | Setup guide and final tests |

Prompts 5, 6, 8, 12, 15 and 20 are replaced by Part 2. Send them only if Antigravity says something in them is still missing.

| # | Problem | Severity |
|---|---|---|
| 1 | Back end accepts requests with no authentication | Critical |
| 2 | Proxy can be pointed at any URL | Critical |
| 3 | Plain-text passwords stored in the Sheet | Critical |
| 4 | Private user data returned to anyone | Critical |
| 5 | Paid plans can be activated without correct payment | Critical |
| 6 | `deleteUser` can wipe whole sheets | Critical |
| 7 | All bookings readable by anyone | Critical |
| 8 | Email verification can be bypassed | Critical |
| 9 | Image cleanup deletes booking photos and receipts | Critical |
| 10 | Double booking of the same slot | High |
| 11 | Duplicate member IDs (race condition) | High |
| 12 | Free trial can be renewed forever | High |
| 13 | Failed saves reported as success | High |
| 14 | Heavy maintenance work on every request | Medium |
| 15 | Checkout sessions stored in server memory | Medium |
| 16 | Wrong column used as member ID in bookings | Medium |
| 17 | Booking status stored in the browser | Medium |
| 18 | Plan limits differ between front end and back end | Medium |
| 19 | Silver/Gold duplicate tier | Medium |
| 20 | Contact form and email HTML issues | Medium |
| 21 | Duplicate helper functions | Low |
| 22 | Outdated docs, unused Firebase files and packages | Low |
| 23 | Old "FlashMyDeal" name and unused code | Low |
| **Part 2** | **Restructure** | |
| 24 | Services only, one service ad per account, Free / Gold / Platinum | Restructure |
| 25 | Rebuild the Google Sheet database with correct mapping | Restructure |
| 26 | Secure card payments with PAYable (payable.lk) | Restructure |
| 27 | Platinum → Gold downgrade: immediate, balance converted, no refund | Restructure |
| 28 | Booking flow, contact privacy, Google-only login | Restructure |
| 29 | Branded email system with MailApp.sendEmail() | Restructure |
| 30 | Expired plans: grace period, listing lock and hiding | Restructure |
| 31 | Full account deletion (sheet rows + Drive images + login) | Restructure |
| 32 | Remove unnecessary code | Restructure |
| 33 | Step-by-step setup guide for me | Restructure |

---

## Prompt 0 – Context (send first)

```
You are working on the Dorakada project: a Sri Lankan skilled-services marketplace.
- Front end: React + Vite + TypeScript in /src (main data layer: src/lib/appsScript.ts).
- Server: server.ts (Express). It proxies requests to a Google Apps Script web app and handles Payments.lk card checkouts. It is deployed on Vercel through api/index.ts.
- Back end: google-apps-script.gs (a Google Apps Script web app using Google Sheets as the database and Google Drive for images).
- Login: Firebase Authentication (src/lib/firebase.ts).
- Plans: FREE, GOLD (LKR 1,000/month), PLATINUM (LKR 1,800/month), defined in src/lib/subscriptionUtils.ts and in getPlanDefaults() in google-apps-script.gs.

I will send you a series of fixes from a code review, one at a time.
For each one: make the smallest change that fixes the problem, keep the existing UI and behaviour unless the fix needs a change, do not rename or move files unless asked, and tell me exactly which files and functions you changed.

Standing rules for every prompt:
1. If anything needs setup on my side (Google Apps Script, Google Sheets, Google Drive, Script Properties, Vercel, Firebase console, the PAYable merchant portal, DNS, email), STOP and give me clear numbered step-by-step instructions: exactly where to click, what to copy, and what value to paste where. Wait for me to confirm "done" before continuing. I will support you with any account access, keys or information you need. Never invent keys, merchant IDs or URLs.
2. If a decision is mine (marked "ASK ME" in a prompt, or anything unclear), ask me a short question with options before coding.
3. While you work, remove code that becomes unnecessary (old features, dead code, unused files and packages) instead of leaving it behind. List what you removed.
4. Never put secret keys in front-end code or commit them to the repository.
5. Before changing the live Google Sheet structure, tell me to make a backup copy of the Sheet first.
6. Any new column added to any Google Sheet must be added AFTER the last existing column. Never insert a column in the middle.
7. Read the "Owner decisions" at the start of Part 2 of FIX_PROMPTS.md before starting. They override anything in Part 1.

Do not start anything yet. Reply "Ready" when you understand.
```

---

## Prompt 1 – Back end has no authentication (Critical)

```
SECURITY FIX 1: The Google Apps Script back end has no authentication.

Problem:
- google-apps-script.gs is deployed with "Who has access: Anyone". Its URL is hard-coded in src/lib/appsScript.ts (getAppsScriptUrl fallback) and is visible to anyone who opens the site.
- doGet/doPost trust whatever email, uid or memberId the caller sends. Anyone can call saveUser, deleteUser, createListing, updateBookingStatus and so on for ANY account directly, without going through the app.

Required fix:
1. Make server.ts the only caller of the Apps Script:
   - Add a shared secret. Read APPS_SCRIPT_SECRET from the server environment (process.env) and from Apps Script Script Properties (PropertiesService.getScriptProperties().getProperty('API_SECRET')).
   - In server.ts, attach the secret to every request forwarded to Apps Script (for example as a "secret" field in the POST body and a "secret" query parameter for GET).
   - In google-apps-script.gs doGet/doPost, reject any request whose secret does not match, returning { error: 'Unauthorized' } before doing anything else.
2. Verify the logged-in user on the server:
   - Front end: in every call in src/lib/appsScript.ts that goes to /api/proxy, send the Firebase ID token in an "Authorization: Bearer <token>" header (use auth.currentUser.getIdToken()).
   - server.ts: verify the token with firebase-admin (verifyIdToken). Get the caller's email and uid from the verified token, NOT from the request body.
   - For every write action, and for reads of private data (getUser, getBookings), set the email/uid in the payload sent to Apps Script from the verified token. Overwrite anything the browser sent.
   - Public read actions (getListings, getServiceProviders, getServiceProvider) can stay unauthenticated, but must still go through the proxy with the secret.
3. Remove the hard-coded Apps Script URL from the front end. The browser should only ever call /api/proxy. Move the Apps Script URL into a server-only env var APPS_SCRIPT_URL. Also remove the localStorage override of the Apps Script URL (APPS_SCRIPT_URL_KEY).
4. Add APPS_SCRIPT_SECRET, APPS_SCRIPT_URL and the firebase-admin service account variables to .env.example, with empty values.

Acceptance check: calling the Apps Script /exec URL directly without the secret returns Unauthorized, and a logged-in user cannot change another user's profile through /api/proxy.
Tell me the manual steps: setting Script Properties, redeploying the Apps Script, and setting Vercel env vars.
```

---

## Prompt 2 – Open proxy (Critical)

```
SECURITY FIX 2: /api/proxy in server.ts is an open proxy.

Problem: GET /api/proxy?url=... and POST /api/proxy { url, payload } fetch ANY URL the caller supplies. Anyone can use our server to fetch arbitrary websites (open relay / server-side request forgery).

Required fix:
- Ignore the "url" parameter from the client completely. Always use the server-side APPS_SCRIPT_URL env var (added in fix 1).
- Allow only a whitelist of action names, and return 400 for anything else:
  public GET: getListings, listings, getServiceProviders, serviceProviders, getServiceProvider
  authenticated: only the actions the app still uses after Part 2 (profile, service profile, availability, bookings, analytics, account deletion, contact form). Do NOT whitelist removed features: product listing actions, submitBankTransferReceipt or sendVerificationEmail.
- Remove the admin-only actions from the public whitelist: cleanUnusedImages, cleanDriveFolders, saveAdminSetting, getAdminSettings, getAnalytics for all users.
- Update every fetch('/api/proxy...') call in src/lib/appsScript.ts so it no longer sends the url.
- Add basic rate limiting per IP on /api/proxy and /api/payments/* (about 60 requests/minute). On Vercel each request can run in a fresh instance, so an in-memory limiter is not reliable. Use Vercel's firewall rate limiting or a small shared store, and ASK ME which I prefer.
- The PAYable webhook endpoint (/api/payments/payable-webhook, Prompt 26) must NOT require a Firebase token, because PAYable calls it, not a logged-in user. It is protected by checking the payment with the PAYable status API instead.
```

---

## Prompt 3 – Plain-text passwords in the Sheet (Critical)

```
SECURITY FIX 3: User passwords are stored in plain text in Google Sheets.

Problem:
- src/components/AuthModal.tsx copies the user's password into the profile ("password, // Capture password!" and "profile.password = password") on sign-up, login and the "Verify Instantly" button, then saves it with apiSaveUserProfile.
- google-apps-script.gs saveUser writes it into the "Password" column of the Users sheet, and getUser returns it to the browser.
- Firebase Authentication already handles passwords, so we never need to store them.

Required fix:
1. AuthModal.tsx: remove every place that puts the password into a profile object.
2. src/lib/appsScript.ts: remove password from the profile mapping (around the "password: raw.password || raw.Password" line and the "password: sanitized.password || 'OAUTH_GOOGLE_USER'" line) and never send it.
3. google-apps-script.gs:
   - saveUser: always write an empty value to the Password column, ignoring any incoming password.
   - getUser: never include password in the returned object.
   - Add a one-time function clearStoredPasswords() that blanks the Password column for all existing rows. Tell me to run it once from the Apps Script editor.
4. Remove "password" from the UserProfile type in src/types.ts if it exists, and fix the compile errors this causes.
```

---

## Prompt 4 – Private user data returned to anyone (Critical)

```
SECURITY FIX 4: getUser returns private data to anyone.

Problem: google-apps-script.gs getUser(searchKey) returns the full row (NIC/passport number, address, emergency contact name and phone, phone, WhatsApp) for any email, member ID or uid passed in. Anyone who knows an email address can read this.

Required fix:
- getUser must only return private fields when the verified caller (from fix 1) is that same user. The server should pass the verified email to Apps Script as callerEmail.
- Add a separate public profile shape (displayName, memberId, city, tradeTitle, yearsOfExperience, skills, bio, profileImage, verifiedBadgeStatus, userPlan) for anyone else.
- Make sure getServiceProviders never includes NIC, address, emergency contact, phone, WhatsApp or email fields (contact details are private, see Prompt 28).
- Check that the front end still works for viewing other providers.
```

---

## Prompt 5 – Paid plans activated without correct payment (Critical)

```
SECURITY FIX 5: Users can activate paid plans without paying the right amount.

NOTE: The payment gateway will be changed from Payments.lk to PAYable in Prompt 26. Apply the security rules below to whichever gateway code exists. If Prompt 26 is already done, apply them to the PAYable code. Do not build new Payments.lk features.

Problems:
a) POST /api/payments/create-checkout in server.ts uses amountLkr, planTier and months sent by the browser. Anyone can create a Platinum checkout for LKR 1.
b) After payment, the plan is activated in the BROWSER:
   - src/components/AccountPage.tsx (handlePaymentReturn) reads plan_tier, months and amount_lkr from the URL query string and calls apiSaveUserProfile with the new plan.
   - src/components/ProUpgradeModal.tsx and src/components/ExtraPhotosPurchaseModal.tsx do the same.
   A user can pay for 1 month of Gold, then edit the return URL to plan_tier=PLATINUM&months=12 and get Platinum for a year.
c) The same paid checkout ID can be "verified" and used again and again.
d) verify-checkout does not check that the paid amount matches the plan price.
e) The mid-cycle upgrade with "payableAmount === 0" activates Platinum with no payment at all, based only on credit calculated in the browser.

Required fix:
1. server.ts create-checkout: accept only { planTier, months } (or { adId, extraSlots } for photo slots). Calculate the price ON THE SERVER from a server-side copy of the price matrix (PAYMENT_MATRIX in src/lib/subscriptionUtils.ts and LKR 200 per extra photo slot). Ignore any amount sent by the client. Store the expected plan, months, amount and the verified user's email in the checkout "reference"/metadata.
2. Add a new server endpoint POST /api/payments/confirm { checkoutId } (requires the Firebase token from fix 1):
   - Fetch the checkout from Payments.lk and require status paid/succeeded.
   - Check that the amount equals the expected amount for the plan and months stored at creation.
   - Check that the payment belongs to the logged-in user.
   - Check that the checkout ID has not been used before. Record used IDs in a new "Payments" sheet: checkoutId, email, plan, months, amount, date.
   - Only then call Apps Script (with the secret) to set the user's plan, start date and end date, or to add the photo slots.
3. Front end: AccountPage, ProUpgradeModal and ExtraPhotosPurchaseModal must call /api/payments/confirm and then reload the profile. They must NOT set userPlan, subscription dates, limits or maxImagesForAdd themselves.
4. Apps Script saveUser: ignore userPlan, subscription dates, limits, badge and boost fields from normal profile saves. Only the server-confirmed payment action (and an admin action) may change them.
5. Move the mid-cycle credit calculation to the server, inside the confirm/create-checkout logic.

Acceptance check: editing the return URL, replaying an old checkout ID, or sending a fake amount does not change the user's plan.
```

---

## Prompt 6 – deleteUser can wipe whole sheets (Critical)

```
SECURITY FIX 6: deleteUser in google-apps-script.gs can delete unrelated data.

Problem: deleteUser(searchKey, email, userId) loops over EVERY sheet and deletes every row where ANY cell equals the search key. Sending searchKey = "active" or "GOLD" would delete most users and listings. Anyone can call it (see fix 1).

Required fix:
- Only allow deleting the verified caller's own account (email from the verified token).
- Delete only by exact match on the key columns:
  Users: User_Email (col 1) or User_ID (col 2).
  Listings and ServiceProviders: User_Email (col 1) or User_ID (col 2).
  bookings: provider User_Email/User_ID (cols 1–2) and customer Customer_User_ID/VisitorEmail (cols 14–15).
  Analytics: User_Email/User_ID.
- Never scan AdminSettings or any other sheet.
- Delete the Drive folder only when the folder name exactly matches "User_<User_ID>_<cleanEmail>".
- Use LockService around the delete.
```

---

## Prompt 7 – All bookings readable by anyone (Critical)

```
SECURITY FIX 7: getBookings returns all bookings when no key is given.

Problem: In google-apps-script.gs getBookings(searchKey), if searchKey is empty, isMatch = true for every row, so the whole bookings sheet is returned: customer names, phone numbers, addresses and messages.

Required fix:
- If no key is provided, return [].
- Only return bookings where the verified caller is the provider or the customer (callerEmail from fix 1).
- For a provider's public calendar (showing which slots are taken), add a separate action getBookedSlots(adId, fromDate, toDate) that returns only { date, slot } pairs with no personal data. Update BookingCalendarView / BookingModal to use it.
```

---

## Prompt 8 – Email verification can be bypassed (Critical)

```
SECURITY FIX 8: Email verification is bypassed.
(Owner decision: login will be Google only – see Prompt 28. If you are doing Prompt 28 anyway, simply remove email/password login and the "Verify Instantly" button here, and skip the rest of this prompt.)

Problem: In src/components/AuthModal.tsx:
- The "Verify Instantly (Verify Email Later)" button signs the user in and sets profile.verifiedStatus = true without the email ever being verified.
- In login mode, if !user.emailVerified but profile.verifiedStatus is true, the user is let in anyway.
- The Google sign-in path and the sign-up path also set verifiedStatus: true.

Required fix:
- Remove the "Verify Instantly" button and its handler.
- Use Firebase's user.emailVerified as the only source of truth for email verification. Do not let an unverified email/password user post ads or bookings. Google sign-in users count as verified.
- Rename the profile field so it is not confused with the paid "Verified" badge. Keep verifiedBadgeStatus for the plan badge and use emailVerified for email.
- The server (fix 1) should reject write actions from tokens where email_verified is false.
```

---

## Prompt 9 – Image cleanup deletes booking photos and receipts (Critical)

```
BUG FIX 9: The 15-minute Drive cleanup deletes files it should keep.

Problem: google-apps-script.gs cleanUnusedDriveImages() collects image IDs only from the Listings and ServiceProviders sheets, then recursively trashes every other file under FlashMyDeal_Uploads. That includes:
- booking photos in FlashMyDeal_Uploads/Bookings/...
- bank transfer receipts and Bank_Transfer_Details.txt in User_.../Transfer_... folders
- photos uploaded for an ad that is still being saved (race condition)

Required fix:
- Only scan the "Listings" and "ServiceProfile" subfolders inside each User_ folder. Never touch Bookings or Transfer_ folders.
- Also treat image IDs in the bookings sheet "booking Images" column as active.
- Only trash files older than 24 hours (file.getDateCreated()).
- Remove setupUnusedImagesCleanupTrigger() from doGet/doPost. Create the trigger once, manually, and change it to run daily instead of every 15 minutes.
- Do not expose cleanUnusedImages / cleanDriveFolders as public actions.
Also check whether any booking photos or receipts are already in the Drive trash, and tell me how to restore them.
```

---

## Prompt 10 – Double booking (High)

```
BUG FIX 10: The same time slot can be booked twice.

Problem: google-apps-script.gs createBooking() appends a row without checking whether the provider's ad already has a pending or confirmed booking for the same date and slot. Two customers booking at the same time both succeed.

Required fix:
- Wrap createBooking in LockService.getScriptLock().waitLock(10000).
- Inside the lock, check the bookings sheet for a row with the same ad ID (col 17) or provider, the same Date (col 9), the same Slot (col 10), and status pending or confirmed. If one exists, return { error: 'SLOT_TAKEN' }.
- Also reject bookings for dates outside the provider's availability or plan calendar window, and dates in the past.
- Front end (BookingModal.tsx): show a clear "This slot was just booked, please choose another" message on SLOT_TAKEN and refresh the slots.
```

---

## Prompt 11 – Duplicate member IDs (High)

```
BUG FIX 11: Member IDs (FMD1000+) can be duplicated.

Problem: getOrGenerateUserId() in google-apps-script.gs reads member_id_seq from AdminSettings, then writes seq+1, with no lock. Two sign-ups at the same time can get the same FMD number.
Also, the front end has its own getOrAssignMemberId() (used in AuthModal.tsx) that can invent IDs on the client.

Required fix:
- Wrap the Tier 3 sequence generation in LockService.getScriptLock().
- Only the back end may create member IDs. Remove client-side ID generation and use the ID returned by saveUser.
- Ignore a client-supplied User_ID unless it already belongs to that email in the Users sheet (Tier 1 currently trusts any "FMD..." value sent by the client).
- Add a check function that lists any duplicate User_IDs currently in the Users sheet.
```

---

## Prompt 12 – Unlimited free trial (High)

```
BUG FIX 12: The 7-day FREE trial can be restarted forever.

Problem: In src/components/ProUpgradeModal.tsx executeUpgrade(), choosing FREE sets a new 7-day subscriptionEndDate every time. There is no record that the trial was already used, so an expired user can keep getting new 7-day trials.

Required fix:
- Add a Trial_Used_Date column to the Users sheet.
- The back end sets it the first time the FREE trial starts.
- If Trial_Used_Date is already set, switching to FREE must not extend the end date. After the trial ends, the listing follows the grace → locked → hidden timeline in Prompt 30 until a paid plan is bought.
- Plan changes must happen on the server (see fix 5), not in the browser.
- Update the UI text so the user understands the trial is one-time.
```

---

## Prompt 13 – Failed saves reported as success (High)

```
BUG FIX 13: Failed saves are reported to the user as successful.

Problems:
- server.ts POST /api/proxy: when the Apps Script request times out or fails, it returns 200 { success: true, warning: 'Request timed out or bypassed, handled locally' }. The front end then thinks the data was saved.
- GET /api/proxy returns 200 [] on fetch failure, so "no results" and "server down" look the same.
- src/lib/appsScript.ts keeps localStorage copies (flashmydeal_local_service_providers, flashmydeal_local_bookings_*, local users/listings/analytics) and sometimes shows them as if they were real data.

Required fix:
- On POST failure, return HTTP 502 { success: false, error: 'Could not reach the database, please try again' }.
- On GET failure, return HTTP 502 with an error unless a cached value exists; when serving cache, add a "stale": true flag.
- In src/lib/appsScript.ts, show an error toast on failure instead of silently using localStorage data. Keep localStorage only as a short-lived display cache, never as a source of truth.
- Remove the SEED_LISTINGS / local listings fallback and LOCAL_USERS_KEY user storage.
```

---

## Prompt 14 – Heavy work on every request (Medium)

```
PERFORMANCE FIX 14: Every Apps Script request runs maintenance jobs.

Problem: doGet and doPost in google-apps-script.gs call autoMigrateLegacyUsersTable(), autoMigrateLegacyServiceProviders(), checkAndUpdateExpiredSubscriptions() (which loops over all users) and setupUnusedImagesCleanupTrigger() (ScriptApp.getProjectTriggers) on EVERY request. Also getUser/getListings/getServiceProviders each re-read whole sheets several times. This makes the app slow and uses up the Apps Script quota.

Required fix:
- Remove these four calls from doGet/doPost.
- Run the migrations once by hand. Plan expiry is handled by the hourly updateListingStates trigger from Prompt 30; remove checkAndUpdateExpiredSubscriptions if that is done.
- Expiry is already computed when reading (getUserSubscriptionLookup), so listings stay correct between runs.
- Cache getListings and getServiceProviders results with CacheService for 60 seconds, and clear the cache on any write.
- In getOrGenerateUserId and getBookings, read each sheet once per request, not inside loops.
```

---

## Prompt 15 – Checkout sessions in server memory (Medium)

```
BUG FIX 15: Payment sessions are stored in memory.
(If Prompt 26 has replaced Payments.lk with PAYable, check that the new code also follows this: no payment state in server memory.)

Problem: server.ts keeps activeCheckoutSessions in a Map. On Vercel (api/index.ts) each request may run in a fresh instance, so lookups by ref/txn_ref fail. The Map is also never cleaned, so it grows forever on a long-running server.

Required fix:
- Remove activeCheckoutSessions.
- Always verify by the Payments.lk checkout ID. Put the checkout ID into the success/cancel return URL, using the placeholder Payments.lk supports, or by storing it before redirect.
- Store pending checkouts in the "Payments" sheet from fix 5 (status pending → paid → applied), not in memory.
```

---

## Prompt 16 – Wrong column used as member ID (Medium)

```
BUG FIX 16: Wrong column used as a member ID in bookings.

Problem: In google-apps-script.gs, getBookings() and createBooking() read rMemberId = spRow[14] from the ServiceProviders sheet. Column 15 is "IsShop" (TRUE/FALSE), not a member ID. Searches can match the wrong rows when the key is "true"/"false".
Also updateAvailability() falls back to column 19 (HourlyRate) if the Availability header is missing, and deleteServiceProvider() hard-codes the Images column as index 28.

Required fix:
- Remove the spRow[14] member-ID lookups. User_ID is column 2.
- Look up every column by header name (like getServiceProviders already does with getCol). Remove hard-coded index fallbacks that point to the wrong columns.
- Add one shared helper getHeaderIndex(sheet, name) and use it in all ServiceProviders and bookings functions.
```

---

## Prompt 17 – Booking status stored in the browser (Medium)

```
BUG FIX 17: Booking status is partly stored only in the browser.

Problem: src/lib/appsScript.ts writes booking status changes to localStorage ('flashmydeal_booking_status_overrides') and merges them over server data. A provider who accepts a booking on their phone may still see "pending" on their laptop, and the customer may see a different status from the provider.

Required fix:
- Remove the booking status overrides from localStorage.
- updateBookingStatus must wait for the server response and show an error if it fails.
- Only the provider of a booking may accept, decline or complete it. Only the customer or provider may cancel. Enforce this in Apps Script using the verified callerEmail from fix 1.
- Allowed status changes: pending→confirmed/cancelled, confirmed→completed/cancelled. Reject anything else.
```

---

## Prompt 18 – Plan limits differ between front end and back end (Medium)

```
CONSISTENCY FIX 18: Plan limits differ between the front end and the back end.
(The plan limits themselves change in Prompt 24: one service ad on every plan. Apply the "single source of truth" part of this fix using the Plans sheet from Prompt 25.)

Problems found:
- getUser() in google-apps-script.gs calculates maxProductAds from maxTimeSlots ('unlimited' ? 5 : ...), so GOLD users get 5 product ads instead of 3.
- AccountPage.tsx tells users "up to 365-day rolling calendar". Both files actually give paid plans a 30-day calendar window (calendarAvailabilityWindowDays '30_DAYS').
- The ad-limit error in saveServiceProvider still says "upgrade to PRO Service" (old plan name).
- saveServiceProvider uses a fallback of 5 ads for any non-FREE plan instead of the plan's real limit.
- Product listing limits (maxProductAds) are not enforced in createListing at all.

Required fix:
- Make ONE source of truth for plan limits: a plans config in google-apps-script.gs getPlanDefaults(). The front end should read limits from the user profile returned by the back end, and keep src/lib/subscriptionUtils.ts SUBSCRIPTION_TIERS only for display text and prices, kept in sync.
- getUser: return maxProductAds from getPlanDefaults, not from time slots.
- Enforce Photos_Allowed (plus Extra_Photo_Slots) in saveServiceProvider and photo uploads on the server. (Product listings are removed, so there is no maxProductAds.)
- Fix the calendar text in AccountPage.tsx to match the real 30-day window, or implement the longer window if I confirm I want it. Ask me before implementing.
- Change "PRO Service" to "Gold or Platinum" in error messages.
```

---

## Prompt 19 – Silver/Gold duplicate tier (Medium)

```
CLEANUP FIX 19: SILVER is a duplicate of GOLD.

Problem: SubscriptionTier = 'FREE' | 'SILVER' | 'GOLD' | 'PLATINUM'. SILVER has exactly the same limits as GOLD in both getPlanDefaults() (google-apps-script.gs) and SUBSCRIPTION_TIERS (src/lib/subscriptionUtils.ts), and is even titled "GOLD Plan" on the front end. getBoostTierWeight also has separate Silver/Gold branches with the same weight. Only FREE, GOLD and PLATINUM are sold.

Required fix:
- Remove SILVER as a separate tier. normalizeSubscriptionTier() and getPlanDefaults() should map any legacy 'SILVER', 'PRO', 'PRO_SERVICE' or 'PRO_ITEM' value to 'GOLD', and 'PRO_BOTH' to 'PLATINUM'.
- Update the SubscriptionTier type to 'FREE' | 'GOLD' | 'PLATINUM' and fix all compile errors.
- Add a one-time Apps Script function that rewrites SILVER/PRO values in the Users sheet User_Plan column to GOLD.
```

---

## Prompt 20 – Contact form and email HTML (Medium)

```
FIX 20: Contact form and outgoing emails.

Problems:
- src/components/ContactUs.tsx sends messages through formsubmit.co with the owner's personal Gmail address hard-coded in the front-end code (visible to anyone), and also saves every message to localStorage.
- The back-end action sendContactEmail exists but is unused. sendContactEmail and sendVerificationEmail can be called by anyone to send emails from our Google account (spam risk).
- sendContactEmail, sendVerificationEmail and submitBankTransferReceipt build HTML emails by joining user input (name, message, email, plan) without escaping, so HTML can be injected.
- submitBankTransferReceipt also has the admin email hard-coded.

Required fix:
- ContactUs.tsx: send through /api/proxy to the email system in Prompt 29 (email 21). Remove the formsubmit.co call, the hard-coded email and the localStorage copy.
- Apps Script: read the admin email from Script Properties (ADMIN_EMAIL) instead of hard-coding it.
- Add an escapeHtml() helper and use it on every user value placed in an email body.
- Rate-limit sendContactEmail (max 3 per IP per hour, enforced in server.ts) and validate field lengths (name ≤ 100, subject ≤ 150, message ≤ 3000 characters).
- sendVerificationEmail is not needed if we use Firebase email verification (fix 8). Remove it, or limit it to the verified caller's own email.
```

---

## Prompt 21 – Duplicate helper functions (Low)

```
CLEANUP FIX 21: Remove duplicated helper code.

Duplicates found:
- calculateDistanceKm and extractCoordsFromLocation are defined in AccountPage.tsx, BookingDetailsModal.tsx and ProviderDashboard.tsx. Move them into src/lib/geoUtils.ts and import them.
- formatSriLankanDateTime, isIsoDateTimeString and normalizePayloadToSriLankaTime are defined in both server.ts and src/lib/dateTimeUtils.ts. Create a shared module (for example src/shared/dateTime.ts) and import it in both, or keep the server copy and import it in the front end if the bundler allows.
- Plan limits exist in both getPlanDefaults() and SUBSCRIPTION_TIERS (see fix 18).
Do not change behaviour, only remove duplication. Run `npm run lint` afterwards and confirm 0 errors.
```

---

## Prompt 22 – Outdated docs, unused Firebase files and packages (Low)

```
CLEANUP FIX 22: Remove outdated and unused files and packages.

Problems:
- GOOGLE_APPS_SCRIPT.md contains an OLD copy of the back-end code that differs from google-apps-script.gs: 23 vs 32 ServiceProviders columns, sheet name 'Bookings' vs 'bookings', different photo limits and boosts, and a bug in getUser where "subEnd" is used instead of "subEndDate". Anyone deploying from it would deploy broken code.
- Firestore is initialised in src/lib/firebase.ts but never used. firestore.rules allows anyone to read and write everything ("allow read, write: if true").
- firebase-blueprint.json describes an unused Firestore schema.
- firebase-applet-config.json belongs to a different Firebase project ("soulmatch") and is unused.
- Unused npm dependencies: @google/genai, firebase-admin (keep it if fix 1 uses it), googleapis, google-auth-library, multer, @types/multer.

Required fix:
- Replace the code block in GOOGLE_APPS_SCRIPT.md with a short note: "The deployable source is google-apps-script.gs". Update the schema tables to match the real 32-column ServiceProviders sheet and 17-column bookings sheet.
- Remove the getFirestore import/export from src/lib/firebase.ts if nothing uses it.
- Change firestore.rules to deny all ("allow read, write: if false;") and deploy them, so the unused database cannot be abused.
- Delete firebase-blueprint.json and firebase-applet-config.json after confirming nothing imports them.
- Remove the unused packages from package.json and run npm install.
- Move the Firebase web config in src/lib/firebase.ts into VITE_FIREBASE_* environment variables.
```

---

## Prompt 23 – Old names and unused code (Low)

```
CLEANUP FIX 23: Leftover names and unused code.

Problems:
- The old name "FlashMyDeal" still appears in code, localStorage keys, email subjects ("FlashMyDeal - Verification Code", "Pending Booking Requests Notification - FlashMyDeal"), Drive folder names (FlashMyDeal_Uploads) and the server log message.
- `npx tsc --noEmit --noUnusedLocals` reports 196 unused variables/imports.
- package.json "name" is still "react-example".
- ProviderDashboard.tsx (~160 KB), ServiceMarketplace.tsx (~150 KB) and AccountPage.tsx (~150 KB) are very large single files.

Required fix:
- Rename all user-facing "FlashMyDeal" text (emails, page titles, messages) to "Dorakada".
- Do NOT rename the Drive root folder or localStorage keys yet, because existing data depends on them. List them for me instead.
- Remove the unused variables and imports reported by --noUnusedLocals.
- Set package.json name to "dorakada".
- Propose (do not do yet) how to split the three large components into smaller files.
```

---

# PART 2 – Website restructure

## Owner decisions (final – apply these everywhere)

1. **Services only.** Remove the item buy-and-sell (product ads) part of the website completely. The site is 100% for service providers.
2. **One service ad per account.** One Google account (email) = one User_ID = one service ad, on every plan.
3. **Plans:** FREE (7-day trial, one time only), GOLD LKR 1,000/month, PLATINUM LKR 1,800/month. Card payment only, through PAYable. **No bank transfer.**
4. **Provider details:** NIC number, NVQ level and any other certificates are all **optional** fields.
5. **Downgrade:** only PLATINUM → GOLD, done **immediately**. The unused Platinum balance is converted into extra Gold days. No money refund. The provider must tick and accept a simple agreement, and that acceptance is saved in the database.
6. **Privacy:** the public ad shows NO phone, WhatsApp, email or other contact details of the provider. The provider's contact details are sent to the customer in the booking confirmation email. The provider can see the customer's details as soon as a request arrives, and can contact them before confirming.
7. **Customers can track and cancel.** Every user has a "My Bookings" page showing the booking requests they sent, and they can send a cancellation at any time. A provider can also be a customer and book other providers.
8. **Login required, Google only.** Users must be logged in to send a booking request or list a service. Login is ONLY with a Google account. Remove email and password login completely.
9. **New columns go at the end.** Any new column added to any Google Sheet in the future must be added AFTER the last existing column. Never insert a column in the middle, because that breaks existing data.
10. **Late renewals:** when a plan (including the free trial) expires, the provider gets 2 days of full access (grace period). Then the listing is LOCKED: it stays in search for 30 days but the provider cannot edit it or see new booking requests until they renew. After those 30 days it is hidden from search, with all data kept. Renewing at any time restores everything exactly as it was. Full rules in Prompt 30.

---

## Prompt 24 – New plan rules: services only, one service ad per account

```
RESTRUCTURE 24: Services-only website, one service ad per account, new plan table.

Owner decisions (final):
- Remove the item buy-and-sell (product ads) feature COMPLETELY. The website is 100% for service providers.
- One Google account (email) = one User_ID = one service ad, on EVERY plan. More than one service ad per email or User_ID is strictly prohibited and must be impossible, not just hidden.

Plans (LKR):
| Feature | FREE | GOLD | PLATINUM |
|---|---|---|---|
| Price | 0 (7-day trial, one time only) | 1,000 / month | 1,800 / month |
| Service ads | 1 | 1 | 1 |
| Photos on the ad | 3 | 6 | 10 (+ LKR 200 per extra photo slot) |
| Booking slots per day | 1 | Unlimited | Unlimited |
| Booking calendar window | 7 days | 30 days | 30 days |
| Verified badge | No | Gold | Platinum |
| Search position | Standard | +20% boost | Top of results |
| Performance reports | No | Yes | Yes |

Paying ahead (Gold / Platinum): 1–2 months no discount, 3–4 months 5%, 5–6 months 10%, 7–8 months 12%, 9–11 months 15%, 12 months = 2 months free (Gold 10,000, Platinum 18,000). Keep the existing PAYMENT_MATRIX values from src/lib/subscriptionUtils.ts, but move them into the Plans sheet (Prompt 25).

Required changes:
1. Remove product ads everywhere: the Listings sheet functions (getListings, createListing, updateListing, updateListingStatus, deleteListing), ListingCard.tsx, ListingDetailModal.tsx, the product parts of AdPostingForm.tsx, product filters, product types in src/types.ts, maxProductAds, product analytics, and every menu link and text about "items", "buy & sell" or "product ads". Ask me before deleting the Listings sheet itself; archive it first.
2. Back end (google-apps-script.gs):
   - saveServiceProvider: if the caller (the verified email from Prompt 1) already has a service ad, UPDATE that row. Never append a second row. Use LockService so two quick submissions cannot create two rows.
   - Treat User_ID and User_Email as unique keys in the Providers sheet (Prompt 25). Reject any attempt to create a second ad with { error: 'ONE_AD_LIMIT' }.
   - Remove maxServiceAds from all plan code; it is always 1.
3. Front end:
   - Replace "Post Service Ad" / "List New Service Ad" / "Manage Ads" with ONE "My Service Profile" page: "Create" if none exists, "Edit" if it exists.
   - Remove MyServiceAdsModal and any multi-ad lists, ad counters, "x of 3 ads used" text and "upgrade for more ads" messages.
   - Update all plan cards, ProUpgradeModal, AccountPage and SubscriptionNoticeBanner to the table above.
4. Existing data: write a one-time Apps Script function findUsersWithMultipleAds() that lists every email/User_ID with more than one service ad. Show me the list and ASK ME which ad to keep for each (suggest: the one with bookings, else the newest). Move the others to an "Archived_Ads" sheet and trash their Drive images.
5. Extra photo slots (Platinum only) belong to the account's single ad.
```

---

## Prompt 25 – Rebuild the Google Sheet database

```
RESTRUCTURE 25: Rebuild the Google Sheet database with correct, header-based mapping.

Goals:
- Every website form field maps to exactly one named column, and every column is used.
- All code finds columns by HEADER NAME, never by number. Remove every hard-coded column index and every "auto-migration" that guesses shifted columns.
- I (the admin) can edit the Sheet directly and the website shows the change within about 1 minute ("real-time editable").
- RULE FOR THE FUTURE: any new column added to any sheet must be added AFTER the last existing column. Never insert a column in the middle. Write this rule as a comment at the top of google-apps-script.gs and in docs/DATA_MAP.md.

FIRST: tell me to make a backup copy of the current Sheet and Drive folder. Wait for my confirmation.

New sheet structure (adjust only if needed, and explain every change):

1. Users – one row per Google account
   User_ID (FMD1000+, unique), User_Email (unique, from Google), Firebase_UID, Display_Name, Google_Photo_URL, Phone, WhatsApp, Account_Status (active / suspended / deleted), Is_Admin (TRUE/FALSE), Joined_Date, Plan (FREE/GOLD/PLATINUM), Plan_Status (NONE/ACTIVE/EXPIRED/PENDING_PAYMENT), Plan_Start, Plan_End, Trial_Used_Date, Extra_Photo_Slots, Drive_Folder_ID, Terms_Accepted_Date, Last_Login, Notes_Admin,
   Downgrade_Agreed (TRUE/FALSE), Downgrade_Agreed_At, Downgrade_Agreement_Version, Downgrade_Old_Plan_End, Downgrade_Platinum_Days_Left, Downgrade_Balance_LKR, Downgrade_Gold_Days_Added, Downgrade_New_Plan_End
   (No passwords. Every user can be both a provider and a customer, so there is no fixed role.)

2. Providers – the ONE public service ad per user (NO contact details here)
   User_ID (unique), User_Email (unique), Ad_ID, Business_Name, Category, Sub_Skills, Tagline, Bio, Years_Experience, Languages, Service_Districts, Service_Radius_Km, Address_Area (town only), Latitude, Longitude, Is_Shop, Open_Days, Open_Time, Close_Time, Rate_Type (hourly / daily / per job / quote), Rate_From_LKR, Rate_To_LKR, Profile_Photo, Gallery_Images (JSON of Drive file IDs), Hidden_Images (JSON, for downgrades), Availability (JSON), Custom_Shifts (JSON), Status (draft / live / hidden), Verified_Badge, Rating, Review_Count, Created_At, Updated_At

3. Providers_Private – private data, never sent to the public website
   User_ID, Contact_Phone, Contact_WhatsApp, Contact_Email, Full_Legal_Name, Home_Address, NIC_Number (optional), NVQ_Level (optional), Certificates (optional, JSON of Drive file IDs with names), Emergency_Contact_Name, Emergency_Contact_Phone, Admin_Verification_Status (not_submitted / pending / approved / rejected), Admin_Verified_Date
   Contact_Phone, Contact_WhatsApp and Contact_Email are only sent to a customer inside the booking confirmation email and on the customer's confirmed booking (Prompt 28).

4. Bookings
   Booking_ID, Ad_ID, Provider_User_ID, Provider_Email, Customer_User_ID, Customer_Name, Customer_Email, Customer_Phone, Customer_WhatsApp, Service_Address, Service_Lat, Service_Lng, Job_Description, Booking_Images (JSON of Drive file IDs), Booking_Date, Time_Slot, Status (pending / confirmed / declined / cancel_requested / cancelled_by_customer / cancelled_by_provider / completed / no_show), Status_Reason, Cancel_Requested_At, Created_At, Updated_At, Reminder_Sent

5. Payments
   Payment_ID, User_ID, User_Email, Type (plan / extra_photos / downgrade), Plan, Months, Extra_Slots, Amount_LKR, Gateway (PAYable), Gateway_UID, Gateway_Status_Indicator, Gateway_Transaction_ID, Status (pending / paid / failed / applied), Created_At, Paid_At, Applied_At, Plan_Start_Applied, Plan_End_Applied, Raw_Status (short JSON, no card data)

6. Reviews – Review_ID, Booking_ID, Ad_ID, Customer_User_ID, Rating (1–5), Comment, Created_At, Status (visible / hidden)
   Only the customer of a COMPLETED booking can leave one review for that booking. Rating and Review_Count in Providers are recalculated on the server; nobody can set them directly.

7. Plans – CONFIG sheet I can edit
   Plan, Monthly_Price_LKR, Trial_Days, Photos_Allowed, Slots_Per_Day, Calendar_Days, Badge, Search_Boost, Analytics, Extra_Photo_Price_LKR; plus a Discounts table (Months, Discount_Percent).
   The server and back end must read prices and limits from THIS sheet (cached), so I can change a price without touching code. The front end shows prices returned by the back end, not hard-coded numbers.

8. Email_Log – Log_ID, Date, To, Template, Related_ID, Result (sent / failed / queued), Error
9. Email_Queue – for emails waiting because of the daily sending limit
10. Analytics – User_ID, Ad_ID, Date, Profile_Views, Booking_Requests, Confirmed_Bookings, Cancellations, Shares
    (Remove "phone reveals" and "WhatsApp clicks", because contacts are no longer shown publicly.)
11. Deletion_Log – Date, Deleted_User_ID, Rows_Deleted, Files_Trashed, Requested_By (no personal data)
12. AdminSettings – key / value (member_id_seq, maintenance_mode, agreement texts and versions, etc.)

Provider registration form (ServiceRegistration.tsx):
- Required: Business/display name, category, short bio, service districts, location on the map, contact phone, at least 1 photo, terms accepted.
- Optional: WhatsApp, NIC number, NVQ level, certificate uploads (any number, each with a name), years of experience, sub-skills, languages, rates, opening hours, emergency contact.
- Labels in English, Sinhala and Tamil (src/lib/translations.ts).
- Make clear on the form that contact details are private and are only shared with customers after a booking is confirmed.

Required implementation:
- One helper module in Apps Script: getSheet(name), getHeaders(name), rowToObject(row, headers), objectToRow(obj, headers), findRowBy(sheet, column, value), appendColumnIfMissing(sheet, header) (always adds at the END). Use it in EVERY function.
- setupDatabase(): creates any missing sheets with headers, freezes the header row, adds dropdown data validation (Plan, Plan_Status, Status columns, Category list), date formats, and protects ID and Payments columns from accidental edits (I am the only editor).
- migrateOldData(): copies data from the old sheets (Users 31 columns, ServiceProviders 32 columns, bookings 17 columns, Analytics) into the new structure. Move the provider phone, WhatsApp and email from the old public columns into Providers_Private. Do not copy passwords. Report how many rows moved and any rows it could not map. Run it on a COPY first.
- Real-time editing: an installable onEdit trigger that validates edits, recalculates limits when I change Plan or Plan_End, updates Updated_At, and clears the CacheService cache. The website reads with a cache of at most 60 seconds. Booking lists refresh every 60 seconds and when the browser tab regains focus.
- Store Drive images by FILE ID and each user's folder by Drive_Folder_ID. Never search Drive by folder name.
- Update src/types.ts to match the new columns exactly and remove old/duplicate fields.
- Produce docs/DATA_MAP.md: a table of form field → sheet → column, and which columns are public, private or admin-only.
```

---

## Prompt 26 – Secure card payments with PAYable (payable.lk)

```
RESTRUCTURE 26: Replace Payments.lk with PAYable (payable.lk). Card payment only.

Owner decision: card payment ONLY. Remove the bank transfer option completely (submitBankTransferReceipt, the receipt upload UI, the Transfer_ Drive folders logic, and bank details text).

Background on PAYable IPG (verify against the official documentation and credentials PAYable gives me; ask me for them):
- Sandbox base: https://payable-apps.web.app/ipg/sandbox , Production base: https://payable-apps.web.app/ipg/production
- Create payment: POST with merchantKey, merchantToken, invoiceId, amount, currencyCode (LKR), orderDescription, customer details, returnUrl, webhookUrl, refererUrl, integrationType, integrationVersion. The response gives uid, statusIndicator and paymentPage (redirect the customer there).
- Check status: GET /status with uid and statusIndicator.
- Webhook: PAYable POSTs the result (payableTransactionId, payableOrderId, statusMessage SUCCESS/FAILURE...) to webhookUrl.
- Reference: https://github.com/payable/ipg-merchant-apis
If the documentation PAYable gives me differs (for example it requires a checkValue/hash or a business key), follow the official documentation and tell me.

STEP 0 – ASK ME, step by step, for:
  a) the sandbox merchantKey and merchantToken (and later the production ones),
  b) the domain the site runs on (for returnUrl, webhookUrl, refererUrl).
Tell me exactly where to set them: Vercel environment variables PAYABLE_MERCHANT_KEY, PAYABLE_MERCHANT_TOKEN, PAYABLE_ENV (sandbox/production). NEVER put them in front-end code.

Payment flow (all money logic on the server):
1. Front end sends POST /api/payments/create { type: 'plan', plan, months } or { type: 'extra_photos', slots } with the Firebase token. Nothing else.
2. server.ts:
   - verifies the Firebase token (Prompt 1),
   - reads the price from the Plans sheet (Prompt 25) and calculates the amount on the server (including the mid-cycle Gold → Platinum upgrade credit),
   - creates a unique invoiceId and a Payments row with status "pending", the expected amount, plan, months and user,
   - calls PAYable create-payment, stores uid and statusIndicator in the Payments row,
   - returns only paymentPage to the browser.
3. returnUrl = https://<domain>/account?tab=subscription&invoice=<invoiceId>. The return page ONLY shows "Checking your payment…" and calls POST /api/payments/confirm { invoiceId }. It never changes the plan itself.
4. Webhook endpoint POST /api/payments/payable-webhook: do NOT trust the webhook body alone. Use it only as a trigger: look up the Payments row, then call the PAYable status API with the stored uid and statusIndicator.
5. Confirm logic (shared by /confirm and the webhook):
   - status from the PAYable status API must be SUCCESS,
   - the paid amount and currency must equal the stored expected amount,
   - the Payments row must not already be "applied"; use LockService/idempotency so the same payment is never applied twice,
   - apply the plan (limits from the Plans sheet) or add the extra photo slots. Dates:
     - renewing the SAME plan while it is still ACTIVE: add the new days to the current Plan_End (stacking),
     - renewing during GRACE, LOCKED or HIDDEN (Prompt 30), or after the free trial: the new period starts NOW, so the provider does not lose paid days,
     - upgrading Gold → Platinum: the server-side credit calculation applies,
   - fill Plan_Start_Applied and Plan_End_Applied, mark the row "applied", and send the receipt email (Prompt 29).
6. Failed or cancelled payments: mark "failed", show a clear message, change nothing.
7. Remove all Payments.lk code: /api/payments/create-checkout, /api/payments/verify-checkout, the Payments.lk functions in src/lib/payments.ts, PAYMENTS_LK_SECRET_KEY, activeCheckoutSessions, and every place where the browser sets the plan or plan dates.
8. Test in the PAYable sandbox: success, failure, cancel, refreshing the return page twice, editing the return URL, and replaying an old invoice. Give me the results.
9. Give me a step-by-step checklist for switching from sandbox to production.
```

---

## Prompt 27 – Platinum → Gold downgrade (immediate, balance converted, no refund)

```
RESTRUCTURE 27: Immediate PLATINUM → GOLD downgrade with the unused balance converted into Gold days. No money refund.

Owner rules (final):
- The ONLY downgrade allowed is PLATINUM → GOLD. Gold → Free, Platinum → Free, and every other downgrade are not offered.
- A downgrade is only possible while the Platinum plan is ACTIVE (not during GRACE, LOCKED or HIDDEN, Prompt 30), and only once per Platinum period.
- The downgrade happens IMMEDIATELY.
- No money is refunded. Instead, the unused Platinum balance is converted into Gold time.
- The provider must accept a simple agreement before the downgrade. The acceptance is saved in the database.

Balance calculation (done on the SERVER only):
1. Platinum_Days_Left = whole days from now until the current Plan_End (round down; minimum 0).
2. Platinum daily value = the amount actually paid for the current Platinum period ÷ the number of days bought, taken from the Payments sheet. If several Platinum payments were stacked, use the total paid ÷ total days. If the Platinum time was not paid for (gift/admin), the value is 0.
3. Balance_LKR = Platinum_Days_Left × Platinum daily value (round to 2 decimals).
4. Gold daily price = Gold Monthly_Price_LKR from the Plans sheet ÷ 30.
5. Gold_Days_Added = round DOWN (Balance_LKR ÷ Gold daily price).
6. New Plan = GOLD, Plan_Start = now, Plan_End = now + Gold_Days_Added days (end of that day, Sri Lanka time).
Example: 10 Platinum days left, paid LKR 1,800 for 30 days → LKR 60/day → balance LKR 600 → Gold costs LKR 33.33/day → 18 Gold days.
Show this calculation to the provider on the confirmation screen BEFORE they agree.

Agreement:
- Confirmation screen showing: current plan and end date, days left, balance, Gold days they will get, the new end date, what changes (badge, search position, photos), and this text (store the text and its version number in AdminSettings so I can edit it):
  "I agree to downgrade my plan from Platinum to Gold immediately. The unused Platinum balance will be converted into Gold days as shown above. I understand that no money will be refunded, extra photo slots are forfeited, and photos above the Gold limit will be hidden."
- An "I agree" tick box (unticked by default) and a "Confirm downgrade" button that only works when ticked.
- Save in the Users sheet (new columns, added at the END): Downgrade_Agreed = TRUE, Downgrade_Agreed_At, Downgrade_Agreement_Version, Downgrade_Old_Plan_End, Downgrade_Platinum_Days_Left, Downgrade_Balance_LKR, Downgrade_Gold_Days_Added, Downgrade_New_Plan_End.
- Also add a Payments row: Type "downgrade", Amount_LKR 0, with the old and new end dates.

What changes:
- Photos above the Gold limit (6) are HIDDEN, not deleted (stored in Hidden_Images). The provider chooses which 6 stay visible; if they don't choose, the first 6 stay. Hidden photos are kept for 30 days in case they upgrade again, then trashed by the daily cleanup.
- Extra purchased photo slots are forfeited and Extra_Photo_Slots is set to 0.
- Badge changes to Gold, search position to the Gold boost.
- The provider's bookings are NOT affected.

Security: the downgrade runs on the server with the Firebase token, inside LockService. The browser never sets the plan. A provider can only downgrade their own account.
Send the "Plan downgraded" email (Prompt 29) with the full calculation. Add the downgrade rules to the Membership page FAQ.
```

---

## Prompt 28 – Booking flow, contact privacy and Google-only login

```
RESTRUCTURE 28: Booking flow, contact privacy and Google-only login.

A. Google-only login (owner decision)
- Login is ONLY "Sign in with Google" (Firebase GoogleAuthProvider). Remove email + password sign-up, login, password reset, the "Verify Instantly" button, email verification screens, and all password code (AuthModal.tsx and related).
- Google accounts are already email-verified, so remove the separate email verification process (and Prompt 8's email verification parts, if not done yet).
- In Firebase console, email/password sign-in should be disabled. Give me the step-by-step instructions.
- A user MUST be logged in to: send a booking request, create or edit a service profile, see "My Bookings", and buy a plan. Browsing and searching providers stays public.
- If a logged-out user clicks "Book" or "List my service", show the Google sign-in, then return them to what they were doing.
- On first sign-in, create the Users row (Prompt 25) and ask for their phone number (required to book or list) and WhatsApp (optional).

B. Contact privacy (owner decision)
- The public provider list, map, cards and ad page must NOT show the provider's phone, WhatsApp, email or any other contact detail. Remove the call / WhatsApp / email buttons and the "phone reveal" feature from the public pages.
- The back end must never send provider contact details in getServiceProviders / getServiceProvider. They come only from Providers_Private, and only in these two cases:
  1) the booking confirmation email to the customer (Prompt 29), and
  2) the customer's own CONFIRMED booking in "My Bookings".
- The provider sees the customer's name, phone, WhatsApp, email, service address and job description as soon as a booking REQUEST arrives (in the provider dashboard and the "new request" email), so the provider can contact the customer before confirming.

C. Customer side – "My Bookings" (every user)
- Every logged-in user has "My Bookings" showing all booking requests they have SENT: provider business name, service, date, time, status, and the provider's contact details only once confirmed.
- The customer can send a cancellation at ANY time for a pending or confirmed booking:
  - pending → becomes cancelled_by_customer immediately,
  - confirmed → becomes cancelled_by_customer immediately (the slot is freed),
  - the customer chooses a reason (list + optional note), saved in Status_Reason and Cancel_Requested_At,
  - the provider is emailed straight away (Prompt 29).
- The customer cannot cancel a booking that is already completed, declined or cancelled.

D. Provider side – received requests
- The provider dashboard shows received requests: Accept / Decline (with reason) / Mark completed / Cancel (with reason).
- Allowed status changes: pending → confirmed / declined / cancelled_by_customer; confirmed → completed / cancelled_by_provider / cancelled_by_customer / no_show. Reject anything else on the server.
- Only the provider of the ad can accept, decline or complete. Only the customer or the provider can cancel. Check this on the server with the verified email (Prompt 1).

E. A provider is also a customer
- The same account can list a service AND book other providers. Show both "My Service Profile" and "My Bookings" in the account menu.
- A user cannot book their own service ad.

F. Terms, privacy and consent
- Add a Terms of Use page and a Privacy Policy page (footer links). They should cover: what data we collect from providers and customers, that contact details are shared only after a booking is confirmed (and customer details are shared with the provider on request), how payments and the no-refund downgrade work, the expired-plan lock, and how to delete an account.
- Sri Lanka's Personal Data Protection Act, No. 9 of 2022 applies because we collect NIC numbers, phone numbers and addresses. Write the drafts in plain English, mark them "DRAFT – to be reviewed", and tell me to have them checked by a lawyer before launch.
- On first sign-in, the user must tick "I agree to the Terms of Use and Privacy Policy". Save the date in Terms_Accepted_Date and the version in a new Terms_Version column (added at the END of the Users sheet).

G. Booking request form
- Required: date, time slot, service address/location, job description. Optional: up to 2 photos.
- Name, email and phone come from the logged-in user's profile (editable phone).
- Use the slot check from Prompt 10 so the same slot cannot be booked twice.
```

---

## Prompt 29 – Branded email system with MailApp.sendEmail()

```
RESTRUCTURE 29: Build a customised email system in google-apps-script.gs using MailApp.sendEmail().

Design:
- One function sendTemplatedEmail(templateName, toEmail, data) that builds a branded HTML email (Dorakada name/logo, colours, clear title, details table, one main button linking to the right page on the website, footer with contact info and "This is an automated message") plus a plain-text version (the "body" option).
- Escape every user-supplied value with escapeHtml() before putting it in the HTML.
- Sender name "Dorakada" (MailApp "name" option). Reply-to from Script Properties (SUPPORT_EMAIL). ASK ME for the support email address and logo URL.
- Before sending, check MailApp.getRemainingDailyQuota(). If the quota is used up, put the email in the Email_Queue sheet and send it from a time-driven trigger later. Tell me the daily limit for my Google account type (a normal Gmail account allows far fewer emails per day than Google Workspace) and whether I should switch to Workspace.
- Log every email in Email_Log.
- Wrap sending in try/catch so an email failure never breaks a booking or payment.
- English templates. ASK ME if I also want Sinhala/Tamil versions based on the user's chosen language.

Emails (provider = service provider, customer = person who books):
Account
 1. Welcome after first Google sign-in (to the user).
 2. Service profile published / updated (to the provider).
 3. Admin verification of NIC/NVQ/certificates approved or rejected, with reason (to the provider; only if they submitted documents).
 4. Account deleted confirmation (Prompt 31).
Bookings
 5. New booking request:
    - to PROVIDER: customer name, phone, WhatsApp, email, service address, date, time, job description, photos link, buttons to Accept / Decline in the dashboard. (The provider may contact the customer before confirming.)
    - to CUSTOMER: "Request sent, waiting for the provider", booking summary, link to My Bookings and Cancel. NO provider contact details yet.
 6. Booking confirmed:
    - to CUSTOMER: provider business name, provider CONTACT DETAILS (phone, WhatsApp, email from Providers_Private), date, time, address, cancel link.
    - to PROVIDER: confirmation copy with the customer's details.
 7. Booking declined by provider: to CUSTOMER with reason and a link to find other providers. No provider contact details.
 8. Booking cancelled by customer: to PROVIDER with reason (the slot is now free).
 9. Booking cancelled by provider: to CUSTOMER with reason.
10. Reminder 24 hours before the booking: to both (daily trigger at 8:00 AM Sri Lanka time; set Reminder_Sent).
11. Pending request not answered in 24 hours: reminder to PROVIDER.
12. Booking completed: to CUSTOMER with a "Rate this provider" link.
Payments & plans (card payments through PAYable only)
13. Payment successful + receipt (invoice ID, plan, months, amount, plan start and end): to PROVIDER, copy to the admin email.
14. Payment failed or cancelled: to PROVIDER.
15. Extra photo slots purchased: receipt to PROVIDER.
16. Free trial started / ends tomorrow: to PROVIDER.
17. Plan expiring in 3 days and in 1 day: to PROVIDER (daily trigger). The same applies to the free trial.
18. Plan expired – grace period started (2 days of full access left, renew link): to PROVIDER.
18a. Listing locked (grace period over): to PROVIDER, explaining what is locked, that the ad stays in search for 30 days, and the renew link.
18b. Waiting requests: when a booking request arrives for a LOCKED listing, tell the PROVIDER "You have N booking requests waiting – renew to view them" (no customer details), at most once per day.
18c. Ad will be hidden from search in 7 days and in 1 day: to PROVIDER.
18d. Ad hidden from search (data kept, renew to restore): to PROVIDER.
18e. Booking request auto-declined (provider did not respond within 48 hours): to CUSTOMER, with a link to find other providers. Do not mention the provider's plan status.
19. Plan downgraded Platinum → Gold: to PROVIDER, with days left, balance, Gold days added, new end date, the agreement text they accepted and "no money refund".
Admin
20. Daily summary to the admin email: new users, new ads, bookings, cancellations, payments, failed emails.
21. Contact form messages from the website (replacing formsubmit.co), sent to the admin email.

Also:
- Remove the old emails: sendPendingBookingNotifications, sendVerificationEmail, the old sendContactEmail, all "FlashMyDeal" subjects, the formsubmit.co contact form and the hard-coded personal email address.
- Create sendAllTestEmails(myEmail) that sends one of each template to me for review. Tell me when to run it.
```

---

## Prompt 30 – Expired plans: grace period, listing lock and hiding

```
RESTRUCTURE 30: What happens when a provider does not renew on time (paid plans AND the free trial).

Owner rules (final):

Timeline after Plan_End:
| Stage | When | Listing in search | Provider can edit ad | New booking requests |
|---|---|---|---|---|
| ACTIVE | until Plan_End | Yes (normal ranking) | Yes | Accepted and visible |
| GRACE | Plan_End → +2 days | Yes (normal ranking) + warning banner | Yes | Accepted and visible |
| LOCKED | +2 days → +32 days (30 days) | Yes, ranked below all active listings | No | Accepted but HIDDEN from provider; auto-declined after 48 hours |
| HIDDEN | after +32 days | No (data kept) | No | Not possible (ad not shown) |

- The FREE trial follows the same timeline: 7-day trial → 2 days grace → locked 30 days → hidden. The trial cannot be restarted (Prompt 12), so "renewal" means buying Gold or Platinum.
- Renewing (a confirmed PAYable payment, Prompt 26) at ANY stage immediately returns the listing to ACTIVE, exactly as it was (same text, photos, availability, reviews, rating). Requests still waiting and not yet auto-declined become visible to the provider at once.

While LOCKED, the provider:
- CANNOT: edit the service profile, photos, availability or shifts; accept, decline or view NEW booking requests; see analytics.
- SEES: a banner "Your plan has expired. You have N booking requests waiting – renew to view them." showing only the number, no customer names or details.
- CAN STILL:
  - log in, view their plan, renew/pay, and see and download payment receipts (add a "Receipts" list built from the Payments sheet, with a printable receipt page per payment),
  - see CONFIRMED bookings made before the lock, with full customer details, and complete or cancel them,
  - delete their account (Prompt 31),
  - use the website as a CUSTOMER: browse, book other providers, and use My Bookings. The lock only affects their own listing.

Requests received while LOCKED:
- The customer can still send a request. They see the normal "Request sent, waiting for the provider" message. Never tell the customer the provider's plan has expired.
- The request is stored with status "pending" and is hidden from the provider.
- If the provider has not renewed within 48 hours of Created_At, an hourly trigger sets the status to "auto_declined" with Status_Reason "Provider did not respond in time" and emails the customer (Prompt 29, email 18e).
- Store the 48 hours in AdminSettings (AUTO_DECLINE_HOURS = 48) so I can change it.

Database (add new columns at the END of each sheet, never in the middle):
- Users: Grace_Ends_At, Locked_At, Hide_From_Search_At, Hidden_At, Listing_State (ACTIVE / GRACE / LOCKED / HIDDEN), Last_Renewed_At
- Providers: Listing_State (copy kept in sync for fast public reads), Search_Visible (TRUE/FALSE)
- Bookings: Auto_Decline_At, Received_While_Locked (TRUE/FALSE), Auto_Declined_At
- Add "auto_declined" to the Bookings Status dropdown.
- AdminSettings: GRACE_DAYS = 2, LOCKED_VISIBLE_DAYS = 30, AUTO_DECLINE_HOURS = 48 (read these instead of hard-coding the numbers).

Triggers:
- Hourly trigger updateListingStates(): moves each user to GRACE / LOCKED / HIDDEN based on Plan_End and the AdminSettings values, fills the date columns, sends the matching emails once (Prompt 29: 18, 18a, 18c, 18d), and clears the cache.
- Hourly trigger autoDeclineWaitingRequests(): auto-declines hidden requests older than AUTO_DECLINE_HOURS and emails the customers.
- On renewal (payment applied): reset Listing_State to ACTIVE, clear Grace_Ends_At / Locked_At / Hide_From_Search_At / Hidden_At, set Last_Renewed_At, set Search_Visible TRUE, and clear the cache.

Server-side enforcement (not only hiding buttons in the UI):
- saveServiceProvider, updateAvailability, photo uploads and booking accept/decline for NEW requests must return { error: 'LISTING_LOCKED' } when Listing_State is LOCKED or HIDDEN.
- getBookings for a LOCKED provider returns: confirmed bookings in full + only a COUNT of waiting requests.
- getServiceProviders: GRACE and LOCKED listings are returned (LOCKED ranked last); HIDDEN listings are never returned.
- Booking creation is blocked for HIDDEN listings.

Front end:
- GRACE: yellow banner "Your plan expired on <date>. Renew within <N> days to keep full access." with a Renew button.
- LOCKED: red banner with the waiting-requests count, a Renew button, and greyed-out edit controls with the tooltip "Renew your plan to edit".
- HIDDEN: banner "Your listing is hidden from search. Renew to restore it."
- Update the Membership FAQ with these rules.
Test the full timeline by temporarily setting GRACE_DAYS, LOCKED_VISIBLE_DAYS and AUTO_DECLINE_HOURS to minutes, then set them back.
```

---

## Prompt 31 – Full account deletion (sheet rows + Drive images + login)

```
RESTRUCTURE 31: Fix the logic for deleting a profile and ALL its data.

Who can delete:
- The user, from Account → Settings → "Delete my account". They must sign in with Google again (re-authenticate) and type DELETE to confirm.
- The admin, by running adminDeleteUser(User_ID) or setting Account_Status = "deleted" in the Users sheet (the onEdit trigger then runs the deletion).

Deletion steps (server verifies the Firebase token, then Apps Script runs deleteAccountCompletely(User_ID) inside LockService):
1. Find the user ONLY by exact User_ID / User_Email in the Users sheet. Never match by any other cell value.
2. Send the "Account deleted" email FIRST (while we still have the address).
3. Future bookings (pending/confirmed) where this user is the provider OR the customer: cancel them and email the OTHER person (Prompt 29).
4. Past bookings: keep the row for the other person's history, but anonymise this user's personal data (name → "Deleted user", phone/WhatsApp/email/address blank). Trash this user's booking photos.
5. Delete the user's rows from Providers, Providers_Private, Reviews written by them, Analytics and Users.
6. Payments: keep the rows for accounting (amount, date, plan, invoice, downgrade record) but replace the email with "deleted". ASK ME if a legal retention period applies.
7. Drive: trash the user's folder using the stored Drive_Folder_ID (DriveApp.getFolderById(id).setTrashed(true)), including gallery photos, hidden photos and certificate uploads, plus any booking images they uploaded as a customer. Never search folders by name.
8. Firebase: delete the login with firebase-admin auth.deleteUser(uid) on the server.
9. Write one row to Deletion_Log (date, User_ID, rows deleted, files trashed, requested by). No personal data.
10. Clear the cache so the ad disappears from the website immediately.
If a step fails, log it, continue with the remaining steps, and report which steps failed so I can finish them by hand.

Smaller deletions:
- Removing one photo or certificate trashes that Drive file immediately.
- Deleting only the service profile (keeping the account): remove the Providers and Providers_Private rows, trash gallery images, cancel future bookings and notify the customers.
- Remove the old deleteUser function that scans every sheet and every cell.
Test with a dummy account and show me which rows and files were removed.
```

---

## Prompt 32 – Remove unnecessary code

```
RESTRUCTURE 32: Remove all unnecessary code after the restructure.

Go through the whole project and remove code that is no longer used. Make a list first and ASK ME to approve it. Expected items:
- Product / item buy-and-sell feature (all components, types, sheet functions, filters, texts).
- Email + password login, password reset, "Verify Instantly", email verification screens, and all password handling.
- Bank transfer payment (submitBankTransferReceipt, receipt upload UI, Transfer_ folder logic).
- Payments.lk code (server endpoints, src/lib/payments.ts, PAYMENTS_LK_SECRET_KEY, activeCheckoutSessions).
- Public contact buttons, "phone reveal" and WhatsApp-click tracking on public pages.
- SILVER tier and old PRO / PRO_SERVICE / PRO_ITEM / PRO_BOTH names (after migration).
- Multi-ad code: MyServiceAdsModal, maxServiceAds, maxProductAds, ad counters, per-ad limit checks.
- Old Google Sheet code: autoMigrateLegacyUsersTable, autoMigrateLegacyServiceProviders, hard-coded column indexes, old USER_HEADERS (only after migrateOldData has run successfully).
- localStorage fallback data: SEED_LISTINGS, local users/listings/analytics/providers/bookings copies, booking status overrides, the Apps Script URL override.
- Old email functions and the formsubmit.co contact form.
- Unused Firebase files (firestore.rules → deny all, firebase-blueprint.json, firebase-applet-config.json) and getFirestore.
- Unused npm packages (@google/genai, googleapis, google-auth-library, multer, @types/multer; keep firebase-admin).
- The unused variables/imports reported by `npx tsc --noEmit --noUnusedLocals` (196 before the restructure).
- Debug console.log statements in production code (keep error logs only).
- The old code copy inside GOOGLE_APPS_SCRIPT.md.
After removing: run `npm run lint` and `npm run build`, fix all errors, and show me the before/after size of the main files.
```

---

## Prompt 33 – Step-by-step setup guide for me

```
RESTRUCTURE 33: Write a setup guide for me and walk me through it.

Create docs/SETUP_GUIDE.md with numbered, beginner-friendly steps (where to click, what to copy, what to paste) for everything I must do outside the code, in this order:
1. Backing up the current Google Sheet and Drive folder.
2. Creating the new sheets (setupDatabase) and migrating data (migrateOldData), first on a copy.
3. Apps Script: Script Properties to add (API_SECRET, ADMIN_EMAIL, SUPPORT_EMAIL, etc.), deploying a NEW version of the web app, the access setting to choose, and the permissions to approve.
4. Apps Script triggers (onEdit, hourly updateListingStates and autoDeclineWaitingRequests, daily plan expiry check, daily booking reminders, unanswered-request reminders, daily image cleanup, email queue, daily admin summary): exact function names and times.
5. Firebase console: enable Google sign-in only, disable email/password, add authorised domains, create the service account key for firebase-admin.
6. Vercel: every environment variable name, what value goes in it, and where to get that value.
7. PAYable: getting sandbox keys, setting the webhook URL, testing, and switching to production.
8. Email: checking the daily sending limit and running sendAllTestEmails.
9. Final launch checklist and how to roll back if something breaks.
Then walk me through it ONE STEP AT A TIME in chat, waiting for me to say "done" after each step.
```

---

## Final check (send after all fixes)

```
All fixes are done. Please do a final check:
1. Run `npm run lint` and `npm run build` and fix any errors.
2. List every environment variable and Apps Script Script Property the app now needs, and where each one is set.
3. Walk through these tests and tell me the expected result of each:
   - Calling the Apps Script URL directly without the secret.
   - A logged-in user trying to edit or delete another user's ad, profile or booking.
   - Editing the payment return URL to a higher plan, and reusing an old checkout ID.
   - Two customers booking the same slot at the same moment.
   - An unverified email account trying to post an ad.
   - An expired FREE user trying to restart the trial.
   - The expiry timeline: grace banner, lock after 2 days, waiting-request count, auto-decline after 48 hours with customer email, hidden after 30 locked days, and full restore on renewal.
   - A locked provider still seeing confirmed bookings, downloading receipts and booking another provider as a customer.
   - A user trying to create a second service ad (from the website and by calling the API directly).
   - A PAYable sandbox payment: success, failure, cancel, return page refreshed twice, old invoice replayed.
   - Downgrading Platinum to Gold: Gold days added from the balance, new end date, agreement saved in the Users sheet, hidden photos, email received.
   - A logged-out visitor trying to book or list a service (must be asked to sign in with Google; no email/password option exists).
   - The public ad page and API response: no provider phone, WhatsApp or email anywhere.
   - A customer viewing My Bookings and cancelling a pending and a confirmed booking; the provider receiving the cancellation email.
   - A provider booking another provider's service, and trying to book their own (must be blocked).
   - Each email template arriving correctly; provider contact details appear only in the confirmation email.
   - Deleting a test account: which sheet rows, Drive files and Firebase login were removed.
   - Editing a price in the Plans sheet and seeing it on the website within 1 minute.
4. List the manual deployment steps in order: Apps Script redeploy, Script Properties, triggers, Vercel env vars, Firebase settings, PAYable settings, Firestore rules, one-time migration and cleanup functions.
5. Confirm docs/SETUP_GUIDE.md and docs/DATA_MAP.md are up to date.
```
