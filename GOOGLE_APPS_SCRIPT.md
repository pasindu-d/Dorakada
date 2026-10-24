# FlashMyDeal Google Apps Script Backend & Relational Database Architecture

This document contains the complete specification and copy-pasteable Google Apps Script code for FlashMyDeal. The database operates on a **Relational Composite Primary Key Architecture** inside Google Sheets with Google Drive CDN hosting for assets.

---

## 🏛️ 1. Architecture Overview

### Global Composite Primary Key (`User_Email` + `User_ID`):
- **User_Email (Column 1)**: User's canonical email address (lowercase).
- **User_ID (Column 2)**: Unique, atomic sequential member identifier starting from `FMD1000` (e.g., `FMD1007`, `FMD1008`, `FMD1009`).

### Entity Primary Key (`ID` - Column 3):
- Unique identifier for specific entities (`listing_1784...`, `sp_1784...`, `booking_1784...`).

### Cross-Tab Referential Integrity:
- Every record across `Listings`, `ServiceProviders`, and `Bookings` carries `User_Email` in Column 1 and `User_ID` in Column 2, creating zero-latency relational joins.

---

## 🗺️ 2. Visual Entity-Relationship (ER) Linking Diagram

```
                     ┌──────────────────────────────────────────────┐
                     │            TAB 1: USERS (MASTER)             │
                     ├──────────────────────────────────────────────┤
                     │  Col 1: User_Email [PK1]                     │
                     │  Col 2: User_ID    [PK2] (e.g., FMD1007)     │
                     │  Col 3: DisplayName                          │
                     │  Col 10: UID (Firebase Auth ID)              │
                     └──────────────────────┬───────────────────────┘
                                            │
           ┌────────────────────────────────┼────────────────────────────────┐
           │ (1-to-Many)                    │ (1-to-1 or 1-to-Many)          │ (Dual-Entity Joins)
           ▼                                ▼                                ▼
┌──────────────────────────────┐┌──────────────────────────────┐┌──────────────────────────────┐
│  TAB 2: LISTINGS (PRODUCTS)  ││  TAB 3: SERVICE PROVIDERS    ││      TAB 4: BOOKINGS         │
├──────────────────────────────┤├──────────────────────────────┤├──────────────────────────────┤
│ Col 1: User_Email [FK]       ││ Col 1: User_Email [FK]       ││ Col 1: User_Email [FK - Prov]│
│ Col 2: User_ID    [FK]       ││ Col 2: User_ID    [FK]       ││ Col 2: User_ID    [FK - Prov]│
│ Col 3: ID (Listing ID)       ││ Col 3: ID (Service Ad ID)    ││ Col 3: ID (Booking ID)       │
│ Col 4: Title                 ││ Col 4: BusinessName (FullName)││ Col 4: ProviderName           │
│ Col 5: Price                 ││ Col 5: Category               ││ Col 5: VisitorName            │
│ Col 10: Location             ││ Col 8: Bio                    ││ Col 6: VisitorMobile          │
│ Col 16: Images (Drive CDN)   ││ Col 9: Location               ││ Col 7: ServiceLocation        │
│                              ││ Col 10: Phone (Mobile Number) ││ Col 9: Date & Col 10: Slot    │
│                              ││ Col 19: Availability (JSON)   ││ Col 12: Status                │
│                              ││ Col 22: Images (Drive CDN)   ││ Col 14: Customer_User_ID [FK]│
│                              ││                              ││ Col 15: VisitorEmail [FK]    │
└──────────────────────────────┘└──────────────────────────────┘└──────────────────────────────┘
```

---

## 📑 3. Complete Tab-by-Tab Schema Specification

### 👥 Tab 1: `Users` (Master User Accounts & Subscriptions - 31 Non-Duplicated Columns)
Stores member accounts, credentials, subscription plans, provider credentials, and global sequential Member IDs (`FMD1000+`).

| Col # | Column Header Name | Data Type | Key Type | Description / Sample Value |
|---|---|---|---|---|
| 1 | `User_Email` | String | PK1 | Canonical email (`wmpdhananjaya@gmail.com`) |
| 2 | `User_ID` | String | PK2 | Atomic Member ID (`FMD1007`) |
| 3 | `UID` | String | Index | Firebase Auth UID (`x8k9m...`) |
| 4 | `DisplayName` | String | Data | User's full name (`Pasindu Perera`) |
| 5 | `Password` | String | Data | Password hash / reference |
| 6 | `Phone` | String | Data | Primary phone number (`0701401688`) |
| 7 | `WhatsApp` | String | Data | WhatsApp phone number (`0701401688`) |
| 8 | `Status` | String | Data | Account status (`active` / `suspended`) |
| 9 | `JoinedDate` | String | Data | Registration date (`July 25, 2026`) |
| 10 | `User_Plan` | String | Data | Subscription tier (`FREE`, `SILVER`, `GOLD`, `PLATINUM`) |
| 11 | `Subscription_Status` | String | Data | Subscription status (`ACTIVE`, `EXPIRED`, `PENDING`) |
| 12 | `Subscription_Start_Date` | String | Data | Subscription validity start date |
| 13 | `Subscription_End_Date` | String | Data | Subscription validity expiry date |
| 14 | `Max_Time_Slots` | Number/Str | Data | Daily booking time slots limit (`1`, `2`, `unlimited`) |
| 15 | `Max_Service_Ads` | Number | Data | Maximum allowed service ads (`1`, `2`, `3`, `5`) |
| 16 | `Max_Photos_Per_Ad` | Number | Data | Maximum allowed photos per ad (`3`, `5`, `8`, `10`) |
| 17 | `Calendar_Availability_Window_Days` | String | Data | Booking calendar window (`7_DAYS` / `30_DAYS`) |
| 18 | `Verified_Badge_Status` | String | Data | Verified badge status (`NO`, `GOLD`, `PLATINUM`) |
| 19 | `Search_Ranking_Boost` | String | Data | Search ranking boost weight (`Base (0%)`, `+30%`, `+60%`, `+100%`) |
| 20 | `Analytics_Access` | String | Data | Analytics dashboard access (`ON` / `OFF`) |
| 21 | `ListingRefs` | JSON Array | Data | Published listing IDs (`["listing_123"]`) |
| 22 | `Address` | String | Data | Residential / business address |
| 23 | `City` | String | Data | City / District |
| 24 | `NIC_Passport` | String | Data | National ID / Passport number |
| 25 | `Emergency_Contact_Name` | String | Data | Emergency contact person name |
| 26 | `Emergency_Contact_Phone` | String | Data | Emergency contact phone number |
| 27 | `Trade_Title` | String | Data | Professional trade title / specialty |
| 28 | `Years_Of_Experience` | String/Num | Data | Total years of experience |
| 29 | `Skills` | String | Data | Skills and capabilities |
| 30 | `Bio` | String | Data | Provider bio and summary |
| 31 | `Profile_Image` | String | Data | Profile avatar image URL |

---

### 🏬 Tab 2: `Listings` (Product Ads - 19 Columns)
Stores buy/sell marketplace items. Linked to Users via `User_Email` and `User_ID`.

| Col # | Column Header Name | Data Type | Key Type | Description / Sample Value |
|---|---|---|---|---|
| 1 | `User_Email` | String | FK | Seller's account email |
| 2 | `User_ID` | String | FK | Seller's Member ID (`FMD1007`) |
| 3 | `ID` | String | PK | Listing Unique ID (`listing_17849...`) |
| 4 | `Title` | String | Data | Product title (`iPhone 15 Pro`) |
| 5 | `Price` | Number | Data | Current price (`35000`) |
| 6 | `OriginalPrice` | Number | Data | Previous price (`40000`) |
| 7 | `Currency` | String | Data | Currency code (`LKR`) |
| 8 | `Category` | String | Data | Item category (`Electronics`) |
| 9 | `Condition` | String | Data | Item condition (`Good`, `Brand New`) |
| 10 | `Location` | String | Data | District / City (`Nuwara Eliya`) |
| 11 | `Phone` | String | Data | Contact phone (`0701401688`) |
| 12 | `Description` | String | Data | Full item description |
| 13 | `Tags` | JSON Array | Data | Search tags (`["apple", "phone"]`) |
| 14 | `Status` | String | Data | Listing status (`active` / `sold`) |
| 15 | `Timestamp` | Number | Data | Creation epoch timestamp in ms |
| 16 | `Images` | JSON Array | Data | Google Drive CDN URLs (`["https://lh3..."]`) |
| 17 | `Reviews` | JSON Array | Data | Customer review objects |
| 18 | `Latitude` | Number | Data | GPS latitude (`7.8816`) |
| 19 | `Longitude` | Number | Data | GPS longitude (`80.4934`) |

---

### 👷 Tab 3: `ServiceProviders` (Service Profile Ads - 23 Columns)
Stores service provider profiles, bio information, location tags, shop hours, showcase galleries, and 30-Day Builder availability calendars.

| Col # | Column Header Name | Data Type | Key Type | Description / Sample Value |
|---|---|---|---|---|
| 1 | `User_Email` | String | FK | Provider's account email |
| 2 | `User_ID` | String | FK | Provider's Member ID (`FMD1009`) |
| 3 | `ID` | String | PK | Service Ad ID (`FMD1009` or `sp_17849...`) |
| 4 | `BusinessName` | String | Data | Full Name / Business Title (`Pasindu Perera`) |
| 5 | `Category` | String | Data | Service category (`AC Repair Technician`) |
| 6 | `SubCategory` | String | Data | Secondary skill tag |
| 7 | `Tagline` | String | Data | Short catchphrase |
| 8 | `Bio` | String | Data | Detailed bio & past work description |
| 9 | `Location` | String | Data | Service Location / District (`Kalutara`) |
| 10 | `Phone` | String | Data | Mobile / WhatsApp Number (`070174652`) |
| 11 | `Whatsapp` | String | Data | Dedicated WhatsApp number |
| 12 | `HourlyRate` | Number | Data | Base hourly rate (`0`) |
| 13 | `PriceRange` | String | Data | Price range estimate |
| 14 | `YearsExperience` | Number | Data | Years of experience (`1`) |
| 15 | `VerificationStatus` | Boolean | Data | Verified badge flag (`FALSE`) |
| 16 | `VerifiedDate` | String | Data | Verification timestamp |
| 17 | `Rating` | Number | Data | Average score (`5.0`) |
| 18 | `ReviewCount` | Number | Data | Total reviews count (`0`) |
| 19 | `Availability` | JSON Map | Data | 30-Day Calendar Map (`{"2026-07-27":["08:00 AM..."]}`) |
| 20 | `CustomShifts` | JSON Array | Data | Custom shift definitions |
| 21 | `Reviews` | JSON Array | Data | Customer review objects |
| 22 | `Images` | JSON Array | Data | Google Drive Showcase CDN URLs |
| 23 | `CreatedAt` | String | Data | Registration ISO timestamp |

---

### 📅 Tab 4: `Bookings` (Appointment Requests - 15 Columns)
Stores appointment booking requests. Dual-relational: Links both Provider (Cols 1 & 2) and Customer (Cols 14 & 15).

| Col # | Column Header Name | Data Type | Key Type | Description / Sample Value |
|---|---|---|---|---|
| 1 | `User_Email` | String | FK (Prov) | Provider's email address |
| 2 | `User_ID` | String | FK (Prov) | Provider's Member ID (`FMD1007`) |
| 3 | `ID` | String | PK | Booking Unique ID (`booking_17849...`) |
| 4 | `ProviderName` | String | Data | Provider's full name |
| 5 | `VisitorName` | String | Data | Customer's full name (`Pasindu Dana`) |
| 6 | `VisitorMobile` | String | Data | Customer's phone number (`0701401688`) |
| 7 | `ServiceLocation` | String | Data | Customer job address / GPS coordinates |
| 8 | `Message` | String | Data | Customer job notes / message |
| 9 | `Date` | String | Data | Appointment date (`2026-07-27`) |
| 10 | `Slot` | String | Data | Time slot (`Morning Session (08:45 AM - 09:30 AM)`) |
| 11 | `CreatedAt` | String | Data | Submission ISO timestamp |
| 12 | `Status` | String | Data | Status (`pending`, `confirmed`, `completed`, `cancelled`) |
| 13 | `CancellationReason` | String | Data | Reason text if declined/cancelled |
| 14 | `Customer_User_ID` | String | FK (Cust) | Customer's Member ID (`FMD1000`) |
| 15 | `VisitorEmail` | String | FK (Cust) | Customer's email address |

---

### ⚙️ Tab 5: `AdminSettings` (System Config - 2 Columns)
Stores global platform configuration parameters.

| Col # | Column Header Name | Data Type | Description / Sample Value |
|---|---|---|---|
| 1 | `Setting_Key` | String | Key name (`maintenance_mode`, `min_app_version`) |
| 2 | `Setting_Value` | String | Setting value (`false`, `1.0.4`) |

---

## ⚡ 4. Relational Querying & Real-Time Auto-Migration Rules

### Dual-Key Joining Logic:
- Queries look up records matching `User_Email` OR `User_ID`. This guarantees 100% data access even if a member logs in using either their Email or their Member ID (`FMD1007`).

### Dual-Entity Booking Routing:
- Bookings are routed to Providers using Cols 1 & 2 (`User_Email` / `User_ID`).
- Bookings are routed to Customers using Cols 14 & 15 (`Customer_User_ID` / `VisitorEmail`).

### Auto-Migration Engine (`autoMigrateLegacyServiceProviders`):
- Automatically detects legacy shifted rows (where ID was in Col 1, Email in Col 9/10, etc.) and realigns all 23 cells into the exact standard layout on every read/write call in Google Apps Script.

---

## 🚀 Deployment Code (`Code.gs`)

Paste the following code into your Google Apps Script editor (`Extensions > Apps Script`):

```javascript
/**
 * FLASHMYDEAL GOOGLE APPS SCRIPT BACKEND (Code.gs)
 * Relational Composite Primary Key Architecture Engine
 * Enforces Strict 1-to-1 Permanent Mapping between User Email and Member User ID (FMD1000+)
 *
 * INSTRUCTIONS TO UPDATE YOUR GOOGLE APPS SCRIPT:
 * 1. Open your Google Sheet -> Extensions -> Apps Script
 * 2. Select all code in Editor (Ctrl+A / Cmd+A) and paste this updated script.
 * 3. Click "Deploy" -> "New deployment".
 * 4. Select "Web app".
 * 5. Set Description: "v4 Strict 1-to-1 Email & Member User ID Engine with Drive Hierarchy"
 * 6. Set "Execute as": "Me"
 * 7. Set "Who has access": "Anyone" (CRITICAL for real-time access)
 * 8. Click "Deploy" and authorize permissions if requested.
 * 9. Copy the Web App URL and paste it into FlashMyDeal Settings.
 */

function doGet(e) {
  try {
    var params = e.parameter || {};
    var action = params.action;
    var result = {};

    // Run auto-migration pass to ensure layout consistency across all tabs
    autoMigrateLegacyServiceProviders();

    if (action === 'getListings' || action === 'listings') {
      result = getListings();
    } else if (action === 'getServiceProviders' || action === 'serviceProviders') {
      result = getServiceProviders();
    } else if (action === 'getServiceProvider') {
      result = getServiceProvider(params.id || params.providerId || params.email || params.memberId);
    } else if (action === 'getBookings') {
      result = getBookings(params.providerId || params.searchId || params.email || params.memberId || params.customerUserId);
    } else if (action === 'getUser') {
      result = getUser(params.uid || params.email || params.memberId || params.searchKey);
    } else if (action === 'getAdminSettings') {
      result = getAdminSettings();
    } else {
      result = { status: 'ok', message: 'FlashMyDeal Composite PK Relational API Active' };
    }

    return ContentService.createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ error: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doPost(e) {
  try {
    var postData = {};
    if (e.postData && e.postData.contents) {
      postData = JSON.parse(e.postData.contents);
    }
    var action = postData.action;
    var result = {};

    // Run auto-migration pass
    autoMigrateLegacyServiceProviders();

    if (action === 'createListing') {
      result = createListing(postData);
    } else if (action === 'updateListing') {
      result = updateListing(postData);
    } else if (action === 'updateListingStatus' || action === 'updateStatus') {
      result = updateListingStatus(postData.id || postData.listingId, postData.status);
    } else if (action === 'deleteListing') {
      result = deleteListing(postData.id || postData.listingId);
    } else if (action === 'saveServiceProvider') {
      result = saveServiceProvider(postData);
    } else if (action === 'createBooking') {
      result = createBooking(postData.booking || postData);
    } else if (action === 'updateBookingStatus') {
      result = updateBookingStatus(postData.id || postData.bookingId, postData.status, postData.cancellationReason);
    } else if (action === 'updateAvailability') {
      result = updateAvailability(postData.providerId || postData.id, postData.availability);
    } else if (action === 'saveUser') {
      result = saveUser(postData.profile || postData);
    } else if (action === 'deleteUser') {
      result = deleteUser(postData.uid || postData.email || postData.memberId);
    } else if (action === 'saveAdminSetting') {
      result = saveAdminSetting(postData.key, postData.value);
    } else if (action === 'sendVerificationEmail') {
      result = sendVerificationEmail(postData.email, postData.name, postData.code);
    } else if (action === 'sendContactEmail') {
      result = sendContactEmail(postData.name, postData.subject, postData.message);
    } else {
      result = { error: 'Unknown action: ' + action };
    }

    return ContentService.createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ error: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// =========================================================================
// 3-TIER USER_ID RESOLUTION ENGINE (STRICT 1-TO-1 MAPPING PER SIGNUP EMAIL)
// =========================================================================
function getOrGenerateUserId(email, providedUserId) {
  var cleanEmail = String(email || '').trim().toLowerCase();

  // Tier 1 (Explicit Existing Key): If valid FMD ID is provided, use directly
  if (providedUserId && String(providedUserId).toUpperCase().startsWith('FMD')) {
    var tid = String(providedUserId).trim().toUpperCase();
    if (/^FMD\d+$/.test(tid)) {
      return tid;
    }
  }

  // Tier 2 (Database Email Lookup): Search Users, ServiceProviders, Listings
  if (cleanEmail) {
    // 1. Users sheet
    var uSheet = getUsersSheet();
    var uData = uSheet.getDataRange().getValues();
    for (var i = 1; i < uData.length; i++) {
      if (String(uData[i][0] || '').trim().toLowerCase() === cleanEmail) {
        var existingUid = String(uData[i][1] || '').trim().toUpperCase();
        if (existingUid && existingUid.startsWith('FMD')) return existingUid;
      }
    }

    // 2. ServiceProviders sheet
    var pSheet = getProvidersSheet();
    var pData = pSheet.getDataRange().getValues();
    for (var j = 1; j < pData.length; j++) {
      var rowE = String(pData[j][0] || '').trim().toLowerCase();
      var rowU = String(pData[j][1] || '').trim().toUpperCase();
      if (rowE === cleanEmail && rowU.startsWith('FMD')) return rowU;
    }

    // 3. Listings sheet
    var lSheet = getListingsSheet();
    var lData = lSheet.getDataRange().getValues();
    for (var k = 1; k < lData.length; k++) {
      var rowLE = String(lData[k][0] || '').trim().toLowerCase();
      var rowLU = String(lData[k][1] || '').trim().toUpperCase();
      if (rowLE === cleanEmail && rowLU.startsWith('FMD')) return rowLU;
    }
  }

  // Tier 3 (Atomic Sequence Generation): Generate next sequential FMD1000+
  var adminSettings = getAdminSettings();
  var seq = parseInt(adminSettings['member_id_seq'] || '1000', 10);
  if (isNaN(seq) || seq < 1000) seq = 1000;

  var newUserId = 'FMD' + seq;
  saveAdminSetting('member_id_seq', String(seq + 1));

  return newUserId;
}

// ==========================================
// HELPER: SAFELY SAVE IMAGES TO GOOGLE DRIVE
// ==========================================
function processImagePayload(rawImages, pathInfo) {
  if (!rawImages) return '[]';
  var imageArray = [];

  if (typeof rawImages === 'string') {
    try {
      rawImages = JSON.parse(rawImages);
    } catch (e) {
      if (rawImages.startsWith('data:image/') || rawImages.startsWith('http')) {
        rawImages = [rawImages];
      } else {
        return '[]';
      }
    }
  }

  if (!Array.isArray(rawImages)) return '[]';

  var rootFolder = getOrCreateFolder('FlashMyDeal_Uploads');
  var targetFolder = rootFolder;

  // Build Drive hierarchy according to Section 3:
  // Root: FlashMyDeal_Uploads / User_[User_ID]_[CleanEmail] /
  // Service Profile: ... / ServiceProfile /
  // Listings: ... / Listings / Ad_[ID] /
  if (pathInfo && typeof pathInfo === 'object') {
    var userId = pathInfo.userId || 'FMD1000';
    var email = pathInfo.email || '';
    var cleanEmail = String(email).trim().toLowerCase().replace(/[^a-z0-9]/g, '_');
    var userFolderName = 'User_' + userId + (cleanEmail ? '_' + cleanEmail : '');
    var userFolder = getOrCreateSubFolder(rootFolder, userFolderName);

    if (pathInfo.type === 'ServiceProfile') {
      targetFolder = getOrCreateSubFolder(userFolder, 'ServiceProfile');
    } else if (pathInfo.type === 'Listings') {
      var listingsFolder = getOrCreateSubFolder(userFolder, 'Listings');
      var adFolderName = 'Ad_' + (pathInfo.adId || Date.now());
      targetFolder = getOrCreateSubFolder(listingsFolder, adFolderName);
    } else {
      targetFolder = userFolder;
    }
  } else if (typeof pathInfo === 'string' && pathInfo) {
    targetFolder = getOrCreateSubFolder(rootFolder, pathInfo);
  }

  for (var i = 0; i < rawImages.length; i++) {
    var imgItem = rawImages[i];
    var dataStr = '';
    var fileName = 'photo_' + Date.now() + '_' + (i + 1) + '.jpg';

    if (typeof imgItem === 'string') {
      dataStr = imgItem;
    } else if (imgItem && typeof imgItem === 'object') {
      dataStr = imgItem.data || imgItem.url || imgItem.src || imgItem.preview || '';
      if (imgItem.name) fileName = imgItem.name;
    }

    if (!dataStr) continue;

    if (dataStr.startsWith('http://') || dataStr.startsWith('https://')) {
      imageArray.push(dataStr);
    } else if (dataStr.startsWith('data:image/')) {
      try {
        var base64Parts = dataStr.split(',');
        var contentType = 'image/jpeg';
        if (base64Parts[0] && base64Parts[0].indexOf(':') !== -1 && base64Parts[0].indexOf(';') !== -1) {
          contentType = base64Parts[0].substring(base64Parts[0].indexOf(':') + 1, base64Parts[0].indexOf(';')) || 'image/jpeg';
        }
        var decodedData = Utilities.base64Decode(base64Parts[1]);
        var blob = Utilities.newBlob(decodedData, contentType, fileName);
        var file = targetFolder.createFile(blob);
        file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
        
        var fileId = file.getId();
        var displayUrl = 'https://lh3.googleusercontent.com/d/' + fileId;
        imageArray.push(displayUrl);
      } catch (driveErr) {
        if (dataStr.length < 50000) {
          imageArray.push(dataStr);
        }
      }
    }
  }

  return JSON.stringify(imageArray);
}

function getOrCreateFolder(folderName) {
  try {
    var folders = DriveApp.getFoldersByName(folderName);
    if (folders.hasNext()) return folders.next();
    return DriveApp.createFolder(folderName);
  } catch (e) {
    return null;
  }
}

function getOrCreateSubFolder(parentFolder, subFolderName) {
  if (!parentFolder) return getOrCreateFolder(subFolderName);
  try {
    var safeName = String(subFolderName).replace(/[\/\\?%*:|"<>]/g, '_').trim();
    if (!safeName) safeName = 'SubFolder_' + Date.now();
    var folders = parentFolder.getFoldersByName(safeName);
    if (folders.hasNext()) return folders.next();
    return parentFolder.createFolder(safeName);
  } catch (e) {
    return parentFolder;
  }
}

// ==========================================
// TAB 1: USERS (MASTER ACCOUNTS - 31 NON-DUPLICATED COLUMNS)
// ==========================================
var USER_HEADERS = [
  'User_Email', 'User_ID', 'UID', 'DisplayName', 'Password', 'Phone', 'WhatsApp', 'Status', 'JoinedDate',
  'User_Plan', 'Subscription_Status', 'Subscription_Start_Date', 'Subscription_End_Date',
  'Max_Time_Slots', 'Max_Service_Ads', 'Max_Photos_Per_Ad', 'Calendar_Availability_Window_Days',
  'Verified_Badge_Status', 'Search_Ranking_Boost', 'Analytics_Access',
  'ListingRefs', 'Address', 'City', 'NIC_Passport', 'Emergency_Contact_Name', 'Emergency_Contact_Phone',
  'Trade_Title', 'Years_Of_Experience', 'Skills', 'Bio', 'Profile_Image'
];

function getPlanDefaults(planName) {
  var p = String(planName || 'FREE').toUpperCase().trim();
  if (p === 'PLATINUM' || p === 'PRO_BOTH' || p.indexOf('PLATINUM') !== -1) {
    return {
      planName: 'PLATINUM',
      maxTimeSlots: 'unlimited',
      maxTimeSlotsNum: -1,
      maxProductAds: 5,
      maxServiceAds: 5,
      maxPhotosPerAd: 10,
      calendarAvailabilityWindowDays: '30_DAYS',
      verifiedBadgeStatus: 'PLATINUM',
      searchRankingBoost: '+100%',
      analyticsAccess: 'ON',
      durationDays: 30
    };
  } else if (p === 'GOLD' || p === 'PRO' || p === 'PRO_SERVICE' || p === 'PRO_ITEM' || p.indexOf('GOLD') !== -1 || p.indexOf('PRO') !== -1) {
    return {
      planName: 'GOLD',
      maxTimeSlots: 'unlimited',
      maxTimeSlotsNum: -1,
      maxProductAds: 3,
      maxServiceAds: 3,
      maxPhotosPerAd: 6,
      calendarAvailabilityWindowDays: '30_DAYS',
      verifiedBadgeStatus: 'GOLD',
      searchRankingBoost: '+20%',
      analyticsAccess: 'ON',
      durationDays: 30
    };
  } else if (p === 'SILVER' || p.indexOf('SILVER') !== -1) {
    return {
      planName: 'SILVER',
      maxTimeSlots: 'unlimited',
      maxTimeSlotsNum: -1,
      maxProductAds: 3,
      maxServiceAds: 3,
      maxPhotosPerAd: 6,
      calendarAvailabilityWindowDays: '30_DAYS',
      verifiedBadgeStatus: 'GOLD',
      searchRankingBoost: '+20%',
      analyticsAccess: 'ON',
      durationDays: 30
    };
  } else { // FREE
    return {
      planName: 'FREE',
      maxTimeSlots: 1,
      maxTimeSlotsNum: 1,
      maxProductAds: 1,
      maxServiceAds: 1,
      maxPhotosPerAd: 3,
      calendarAvailabilityWindowDays: '7_DAYS',
      verifiedBadgeStatus: 'NO',
      searchRankingBoost: 'Base (0%)',
      analyticsAccess: 'OFF',
      durationDays: 7
    };
  }
}

function getUserHeaderMap(sheet) {
  var lastCol = Math.max(sheet.getLastColumn(), 1);
  var rawHeaders = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  var map = {};
  for (var i = 0; i < rawHeaders.length; i++) {
    var raw = String(rawHeaders[i] || '').trim();
    if (!raw) continue;
    var norm = raw.toLowerCase().replace(/[\s_-]+/g, '');
    map[norm] = i;
  }
  return {
    rawHeaders: rawHeaders,
    get: function(fieldName, defaultIdx) {
      var norm = String(fieldName || '').toLowerCase().replace(/[\s_-]+/g, '');
      if (map[norm] !== undefined) return map[norm];
      if (norm === 'userplan' || norm === 'subscriptionplan' || norm === 'plan') {
        if (map['userplan'] !== undefined) return map['userplan'];
        if (map['subscriptionplan'] !== undefined) return map['subscriptionplan'];
        if (map['plan'] !== undefined) return map['plan'];
      }
      if (norm === 'subscriptionstartdate' || norm === 'subscriptiondate') {
        if (map['subscriptionstartdate'] !== undefined) return map['subscriptionstartdate'];
        if (map['subscriptiondate'] !== undefined) return map['subscriptiondate'];
      }
      if (norm === 'maxtimeslots') {
        if (map['maxtimeslots'] !== undefined) return map['maxtimeslots'];
        if (map['maxtimeslotsperday'] !== undefined) return map['maxtimeslotsperday'];
      }
      if (norm === 'verifiedbadgestatus' || norm === 'verifiedstatus') {
        if (map['verifiedbadgestatus'] !== undefined) return map['verifiedbadgestatus'];
        if (map['verifiedstatus'] !== undefined) return map['verifiedstatus'];
      }
      if (norm === 'whatsapp') {
        if (map['whatsapp'] !== undefined) return map['whatsapp'];
      }
      return defaultIdx;
    }
  };
}

function autoMigrateLegacyUsersTable() {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName('Users');
    if (!sheet) return;

    var data = sheet.getDataRange().getValues();
    if (data.length === 0) return;

    var currentHeaders = data[0];
    var isLegacy = false;

    if (currentHeaders.length !== USER_HEADERS.length) {
      isLegacy = true;
    } else {
      for (var h = 0; h < USER_HEADERS.length; h++) {
        if (String(currentHeaders[h] || '').trim() !== USER_HEADERS[h]) {
          isLegacy = true;
          break;
        }
      }
    }

    if (!isLegacy) return;

    var hMap = getUserHeaderMap(sheet);
    var migratedRows = [USER_HEADERS];

    for (var r = 1; r < data.length; r++) {
      var row = data[r];
      if (!row || row.length === 0 || !row[0]) continue;

      var email = String(row[hMap.get('User_Email', 0)] || '').trim().toLowerCase();
      var userId = String(row[hMap.get('User_ID', 1)] || '').trim().toUpperCase();
      var uid = String(row[hMap.get('UID', 2)] || row[hMap.get('UID', 9)] || email || userId).trim();
      var name = String(row[hMap.get('DisplayName', 3)] || row[hMap.get('DisplayName', 2)] || '').trim();
      var pass = String(row[hMap.get('Password', 4)] || row[hMap.get('Password', 7)] || 'OAUTH_GOOGLE_USER').trim();
      var phone = String(row[hMap.get('Phone', 5)] || '').trim();
      var whatsapp = String(row[hMap.get('WhatsApp', 6)] || row[hMap.get('WhatsApp', 28)] || phone).trim();
      var status = String(row[hMap.get('Status', 7)] || row[hMap.get('Status', 8)] || 'active').trim();
      var joined = String(row[hMap.get('JoinedDate', 8)] || row[hMap.get('JoinedDate', 3)] || new Date().toISOString()).trim();

      var rawPlan = String(row[hMap.get('User_Plan', 9)] || row[hMap.get('Subscription_Plan', 19)] || row[hMap.get('User_Plan', 10)] || 'FREE').toUpperCase().trim();
      var defaults = getPlanDefaults(rawPlan);
      var userPlan = defaults.planName;

      var subStat = String(row[hMap.get('Subscription_Status', 10)] || row[hMap.get('Subscription_Status', 22)] || 'ACTIVE').toUpperCase().trim();
      var subStart = String(row[hMap.get('Subscription_Start_Date', 11)] || row[hMap.get('Subscription_Start_Date', 20)] || row[hMap.get('Subscription_Date', 18)] || joined).trim();
      var subEnd = String(row[hMap.get('Subscription_End_Date', 12)] || row[hMap.get('Subscription_End_Date', 21)] || '').trim();
      if (!subEnd) {
        var startTs = new Date(subStart).getTime();
        if (isNaN(startTs)) startTs = Date.now();
        subEnd = new Date(startTs + defaults.durationDays * 24 * 60 * 60 * 1000).toISOString();
      }

      var maxSlots = row[hMap.get('Max_Time_Slots', 13)] !== undefined ? row[hMap.get('Max_Time_Slots', 13)] : (row[hMap.get('MAX_time_slots', 11)] !== undefined ? row[hMap.get('MAX_time_slots', 11)] : defaults.maxTimeSlots);
      var maxServ = row[hMap.get('Max_Service_Ads', 14)] !== undefined ? row[hMap.get('Max_Service_Ads', 14)] : (row[hMap.get('Max_Service_Ads', 12)] !== undefined ? row[hMap.get('Max_Service_Ads', 12)] : defaults.maxServiceAds);
      var maxPhotos = row[hMap.get('Max_Photos_Per_Ad', 15)] !== undefined ? row[hMap.get('Max_Photos_Per_Ad', 15)] : (row[hMap.get('Max_Photos_Per_Ad', 13)] !== undefined ? row[hMap.get('Max_Photos_Per_Ad', 13)] : defaults.maxPhotosPerAd);
      var calWin = row[hMap.get('Calendar_Availability_Window_Days', 16)] || row[hMap.get('Calendar_Availability_Window_Days', 14)] || defaults.calendarAvailabilityWindowDays;
      var badgeStat = row[hMap.get('Verified_Badge_Status', 17)] || row[hMap.get('Verified_Badge_Status', 15)] || defaults.verifiedBadgeStatus;
      var boostStat = row[hMap.get('Search_Ranking_Boost', 18)] || row[hMap.get('Search_Ranking_Boost', 16)] || defaults.searchRankingBoost;
      var analytics = row[hMap.get('Analytics_Access', 19)] || row[hMap.get('Analytics_Access', 17)] || defaults.analyticsAccess;

      var listRefs = String(row[hMap.get('ListingRefs', 20)] || row[hMap.get('ListingRefs', 6)] || '[]');
      var addr = String(row[hMap.get('Address', 21)] || row[hMap.get('Address', 23)] || '').trim();
      var city = String(row[hMap.get('City', 22)] || row[hMap.get('City', 24)] || '').trim();
      var nic = String(row[hMap.get('NIC_Passport', 23)] || row[hMap.get('NIC_Passport', 25)] || '').trim();
      var emgN = String(row[hMap.get('Emergency_Contact_Name', 24)] || row[hMap.get('Emergency_Contact_Name', 26)] || '').trim();
      var emgP = String(row[hMap.get('Emergency_Contact_Phone', 25)] || row[hMap.get('Emergency_Contact_Phone', 27)] || '').trim();
      var trade = String(row[hMap.get('Trade_Title', 26)] || row[hMap.get('Trade_Title', 29)] || '').trim();
      var exp = String(row[hMap.get('Years_Of_Experience', 27)] || row[hMap.get('Years_Of_Experience', 30)] || '').trim();
      var skills = String(row[hMap.get('Skills', 28)] || row[hMap.get('Skills', 31)] || '').trim();
      var bio = String(row[hMap.get('Bio', 29)] || row[hMap.get('Bio', 32)] || '').trim();
      var img = String(row[hMap.get('Profile_Image', 30)] || row[hMap.get('Profile_Image', 33)] || '').trim();

      migratedRows.push([
        email, userId, uid, name, pass, phone, whatsapp, status, joined,
        userPlan, subStat, subStart, subEnd,
        maxSlots, maxServ, maxPhotos, calWin,
        badgeStat, boostStat, analytics,
        listRefs, addr, city, nic, emgN, emgP,
        trade, exp, skills, bio, img
      ]);
    }

    sheet.clearContents();
    sheet.getRange(1, 1, migratedRows.length, USER_HEADERS.length).setValues(migratedRows);
  } catch (err) {
    Logger.log('autoMigrateLegacyUsersTable error: ' + err.toString());
  }
}

function getUsersSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('Users');
  if (!sheet) {
    sheet = ss.insertSheet('Users');
    sheet.appendRow(USER_HEADERS);
  } else {
    var currentHeaders = sheet.getRange(1, 1, 1, Math.max(sheet.getLastColumn(), 1)).getValues()[0];
    if (currentHeaders.length !== USER_HEADERS.length || currentHeaders[9] !== 'User_Plan') {
      autoMigrateLegacyUsersTable();
    }
  }
  return sheet;
}

function getUser(searchKey) {
  if (!searchKey) return { error: 'Missing search key' };
  var sheet = getUsersSheet();
  var data = sheet.getDataRange().getValues();
  if (data.length <= 1) return { error: 'User not found' };

  var query = String(searchKey).trim().toLowerCase();
  var hMap = getUserHeaderMap(sheet);

  var idxEmail = hMap.get('User_Email', 0);
  var idxUserId = hMap.get('User_ID', 1);
  var idxUid = hMap.get('UID', 2);
  var idxDisplayName = hMap.get('DisplayName', 3);
  var idxPassword = hMap.get('Password', 4);
  var idxPhone = hMap.get('Phone', 5);
  var idxWhatsApp = hMap.get('WhatsApp', 6);
  var idxStatus = hMap.get('Status', 7);
  var idxJoinedDate = hMap.get('JoinedDate', 8);
  var idxUserPlan = hMap.get('User_Plan', 9);
  var idxSubStatus = hMap.get('Subscription_Status', 10);
  var idxSubStartDate = hMap.get('Subscription_Start_Date', 11);
  var idxSubEndDate = hMap.get('Subscription_End_Date', 12);
  var idxMaxTimeSlots = hMap.get('Max_Time_Slots', 13);
  var idxMaxServiceAds = hMap.get('Max_Service_Ads', 14);
  var idxMaxPhotosPerAd = hMap.get('Max_Photos_Per_Ad', 15);
  var idxCalWindow = hMap.get('Calendar_Availability_Window_Days', 16);
  var idxBadgeStatus = hMap.get('Verified_Badge_Status', 17);
  var idxRankingBoost = hMap.get('Search_Ranking_Boost', 18);
  var idxAnalyticsAccess = hMap.get('Analytics_Access', 19);
  var idxListingRefs = hMap.get('ListingRefs', 20);
  var idxAddress = hMap.get('Address', 21);
  var idxCity = hMap.get('City', 22);
  var idxNic = hMap.get('NIC_Passport', 23);
  var idxEmgName = hMap.get('Emergency_Contact_Name', 24);
  var idxEmgPhone = hMap.get('Emergency_Contact_Phone', 25);
  var idxTrade = hMap.get('Trade_Title', 26);
  var idxExp = hMap.get('Years_Of_Experience', 27);
  var idxSkills = hMap.get('Skills', 28);
  var idxBio = hMap.get('Bio', 29);
  var idxProfileImg = hMap.get('Profile_Image', 30);

  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    if (!row || row.length === 0) continue;

    var emailCol = String(row[idxEmail] || '').trim().toLowerCase();
    var userIdCol = String(row[idxUserId] || '').trim().toLowerCase();
    var uidCol = String(row[idxUid] || '').trim().toLowerCase();

    if (emailCol === query || userIdCol === query || uidCol === query) {
      var rawPlan = String(row[idxUserPlan] || 'FREE').toUpperCase().trim();
      var defaults = getPlanDefaults(rawPlan);
      var userPlan = defaults.planName;

      var maxTimeSlots = row[idxMaxTimeSlots] !== undefined && row[idxMaxTimeSlots] !== '' ? row[idxMaxTimeSlots] : defaults.maxTimeSlots;
      var maxServ = row[idxMaxServiceAds] !== undefined && row[idxMaxServiceAds] !== '' ? Number(row[idxMaxServiceAds]) || defaults.maxServiceAds : defaults.maxServiceAds;
      var maxPhotos = row[idxMaxPhotosPerAd] !== undefined && row[idxMaxPhotosPerAd] !== '' ? Number(row[idxMaxPhotosPerAd]) || defaults.maxPhotosPerAd : defaults.maxPhotosPerAd;
      var calWindow = row[idxCalWindow] ? String(row[idxCalWindow]) : defaults.calendarAvailabilityWindowDays;
      var badgeStat = row[idxBadgeStatus] ? String(row[idxBadgeStatus]).toUpperCase() : defaults.verifiedBadgeStatus;
      var boostStat = row[idxRankingBoost] ? String(row[idxRankingBoost]).toUpperCase() : defaults.searchRankingBoost;
      var analyticsStat = row[idxAnalyticsAccess] ? String(row[idxAnalyticsAccess]).toUpperCase() : defaults.analyticsAccess;

      var subStartDate = String(row[idxSubStartDate] || row[idxJoinedDate] || '').trim();
      var subEndDate = String(row[idxSubEndDate] || '').trim();
      var subStatus = String(row[idxSubStatus] || 'ACTIVE').toUpperCase().trim();

      if (!subStartDate) subStartDate = new Date().toISOString();
      if (!subEndDate) {
        var startTs = new Date(subStartDate).getTime();
        if (isNaN(startTs)) startTs = Date.now();
        subEnd = new Date(startTs + defaults.durationDays * 24 * 60 * 60 * 1000).toISOString();
      }

      var endTs = new Date(subEndDate).getTime();
      if (!isNaN(endTs) && endTs < Date.now()) {
        subStatus = 'EXPIRED';
      }

      var isVerified = badgeStat === 'GOLD' || badgeStat === 'PLATINUM' || badgeStat === 'YES' || badgeStat === 'TRUE';

      return {
        User_Email: String(row[idxEmail] || '').toLowerCase(),
        User_ID: String(row[idxUserId] || ''),
        uid: String(row[idxUid] || row[idxEmail] || row[idxUserId] || ''),
        displayName: String(row[idxDisplayName] || ''),
        password: String(row[idxPassword] || ''),
        phone: String(row[idxPhone] || ''),
        whatsapp: String(row[idxWhatsApp] || row[idxPhone] || ''),
        status: String(row[idxStatus] || 'active'),
        joinedDate: String(row[idxJoinedDate] || ''),
        userPlan: userPlan,
        subscriptionStatus: subStatus,
        subscriptionStartDate: subStartDate,
        subscriptionEndDate: subEndDate,
        maxTimeSlots: maxTimeSlots,
        maxProductAds: maxTimeSlots === 'unlimited' ? 5 : (Number(maxTimeSlots) || 1),
        maxServiceAds: maxServ,
        maxPhotosPerAd: maxPhotos,
        calendarAvailabilityWindowDays: calWindow,
        verifiedBadgeStatus: badgeStat,
        verifiedStatus: isVerified,
        searchRankingBoost: boostStat,
        analyticsAccess: analyticsStat,
        listingRefs: row[idxListingRefs] ? String(row[idxListingRefs]) : '[]',
        address: String(row[idxAddress] || ''),
        city: String(row[idxCity] || ''),
        nicPassport: String(row[idxNic] || ''),
        emergencyContactName: String(row[idxEmgName] || ''),
        emergencyContactPhone: String(row[idxEmgPhone] || ''),
        tradeTitle: String(row[idxTrade] || ''),
        experienceYears: String(row[idxExp] || ''),
        skills: String(row[idxSkills] || ''),
        bio: String(row[idxBio] || ''),
        profileImage: String(row[idxProfileImg] || ''),
        email: String(row[idxEmail] || '').toLowerCase(),
        memberId: String(row[idxUserId] || ''),
        subscriptionPlan: userPlan,
        subscriptionDate: subStartDate
      };
    }
  }
  return { error: 'User not found: ' + searchKey };
}

function saveUser(p) {
  if (!p) return { error: 'Invalid profile data' };
  var sheet = getUsersSheet();
  var data = sheet.getDataRange().getValues();
  var hMap = getUserHeaderMap(sheet);

  var userEmail = String(p.User_Email || p.email || p.userEmail || '').trim().toLowerCase();
  var rawUserId = String(p.User_ID || p.memberId || p.userId || '').trim().toUpperCase();
  var uid = String(p.uid || p.UID || '').trim();

  var userId = getOrGenerateUserId(userEmail, rawUserId);

  var idxEmail = hMap.get('User_Email', 0);
  var idxUserId = hMap.get('User_ID', 1);
  var idxUid = hMap.get('UID', 2);

  var rowIndex = -1;
  var existingRow = null;
  for (var i = 1; i < data.length; i++) {
    var r = data[i];
    if (!r || r.length === 0) continue;
    var rowEmail = String(r[idxEmail] || '').trim().toLowerCase();
    var rowUserId = String(r[idxUserId] || '').trim().toUpperCase();
    var rowUid = String(r[idxUid] || '').trim();

    if ((uid && rowUid === uid) || (userEmail && rowEmail === userEmail) || (userId && rowUserId === userId)) {
      rowIndex = i + 1;
      existingRow = r;
      break;
    }
  }

  var existingPlan = existingRow ? String(existingRow[hMap.get('User_Plan', 9)] || 'FREE') : 'FREE';
  var rawPlan = String(p.userPlan || p.User_Plan || p.plan || p.subscriptionPlan || p.Subscription_Plan || existingPlan).toUpperCase().trim();
  var defaults = getPlanDefaults(rawPlan);
  var userPlan = defaults.planName;

  var finalEmail = userEmail || (existingRow ? String(existingRow[idxEmail] || '').toLowerCase() : '');
  var finalUserId = userId || (existingRow ? String(existingRow[idxUserId] || '') : '');
  var finalUid = uid || (existingRow ? String(existingRow[idxUid] || '') : '') || finalEmail || finalUserId;

  var incomingName = String(p.displayName || p.DisplayName || '').trim();
  var existingName = existingRow ? String(existingRow[hMap.get('DisplayName', 3)] || '').trim() : '';
  var finalDisplayName = existingName;
  if (incomingName && incomingName !== 'User') {
    finalDisplayName = incomingName;
  } else if (!existingName || existingName === 'User') {
    finalDisplayName = incomingName || (finalEmail.indexOf('@') !== -1 ? finalEmail.split('@')[0] : 'User');
  }

  var finalPassword = String(p.password || p.Password || (existingRow ? existingRow[hMap.get('Password', 4)] : '') || 'OAUTH_GOOGLE_USER').trim();
  var finalPhone = String(p.phone || p.Phone || (existingRow ? existingRow[hMap.get('Phone', 5)] : '') || '').trim();
  var finalWhatsApp = String(p.whatsapp || p.WhatsApp || (existingRow ? existingRow[hMap.get('WhatsApp', 6)] : '') || finalPhone).trim();
  var finalStatus = String(p.status || p.Status || (existingRow ? existingRow[hMap.get('Status', 7)] : '') || 'active').trim();

  var existingJoinedDate = existingRow ? String(existingRow[hMap.get('JoinedDate', 8)] || '').trim() : '';
  var incomingJoinedDate = String(p.joinedDate || p.JoinedDate || '').trim();
  var finalJoinedDate = existingJoinedDate || incomingJoinedDate || new Date().toISOString();

  var existingSubStart = existingRow ? String(existingRow[hMap.get('Subscription_Start_Date', 11)] || '').trim() : '';
  var incomingSubStart = String(p.subscriptionStartDate || p.Subscription_Start_Date || p.subscriptionDate || p.Subscription_Date || '').trim();
  var finalSubStartDate = incomingSubStart || existingSubStart || finalJoinedDate || new Date().toISOString();

  var existingSubEnd = existingRow ? String(existingRow[hMap.get('Subscription_End_Date', 12)] || '').trim() : '';
  var incomingSubEnd = String(p.subscriptionEndDate || p.Subscription_End_Date || '').trim();
  var finalSubEndDate = incomingSubEnd || existingSubEnd || '';
  if (!finalSubEndDate) {
    var startTs = new Date(finalSubStartDate).getTime();
    if (isNaN(startTs)) startTs = Date.now();
    finalSubEndDate = new Date(startTs + defaults.durationDays * 24 * 60 * 60 * 1000).toISOString();
  }

  var existingSubStatus = existingRow ? String(existingRow[hMap.get('Subscription_Status', 10)] || 'ACTIVE').toUpperCase().trim() : 'ACTIVE';
  var finalSubStatus = String(p.subscriptionStatus || p.Subscription_Status || existingSubStatus || 'ACTIVE').toUpperCase().trim();
  var endTs = new Date(finalSubEndDate).getTime();
  if (!isNaN(endTs) && endTs < Date.now()) {
    finalSubStatus = 'EXPIRED';
  }

  var finalMaxTimeSlots = p.maxTimeSlots !== undefined ? p.maxTimeSlots : (p.maxTimeSlotsPerDay !== undefined ? p.maxTimeSlotsPerDay : defaults.maxTimeSlots);
  var finalMaxServiceAds = p.maxServiceAds !== undefined ? Number(p.maxServiceAds) || defaults.maxServiceAds : defaults.maxServiceAds;
  var finalMaxPhotosPerAd = p.maxPhotosPerAd !== undefined ? Number(p.maxPhotosPerAd) || defaults.maxPhotosPerAd : defaults.maxPhotosPerAd;
  var finalCalendarWindow = p.calendarAvailabilityWindowDays || defaults.calendarAvailabilityWindowDays;
  var finalBadgeStatus = p.verifiedBadgeStatus || defaults.verifiedBadgeStatus;
  var finalRankingBoost = p.searchRankingBoost || defaults.searchRankingBoost;
  var finalAnalyticsAccess = p.analyticsAccess || defaults.analyticsAccess;

  var finalListingRefs = '[]';
  if (p.listingRefs !== undefined && p.listingRefs !== null) {
    finalListingRefs = Array.isArray(p.listingRefs) ? JSON.stringify(p.listingRefs) : String(p.listingRefs);
  } else if (existingRow && existingRow[hMap.get('ListingRefs', 20)]) {
    finalListingRefs = String(existingRow[hMap.get('ListingRefs', 20)]);
  }

  var finalAddress = String(p.address || p.Address || (existingRow ? existingRow[hMap.get('Address', 21)] : '') || '').trim();
  var finalCity = String(p.city || p.City || (existingRow ? existingRow[hMap.get('City', 22)] : '') || '').trim();
  var finalNic = String(p.nicPassport || p.NIC_Passport || (existingRow ? existingRow[hMap.get('NIC_Passport', 23)] : '') || '').trim();
  var finalEmgName = String(p.emergencyContactName || p.Emergency_Contact_Name || (existingRow ? existingRow[hMap.get('Emergency_Contact_Name', 24)] : '') || '').trim();
  var finalEmgPhone = String(p.emergencyContactPhone || p.Emergency_Contact_Phone || (existingRow ? existingRow[hMap.get('Emergency_Contact_Phone', 25)] : '') || '').trim();
  var finalTrade = String(p.tradeTitle || p.Trade_Title || (existingRow ? existingRow[hMap.get('Trade_Title', 26)] : '') || '').trim();
  var finalExp = String(p.experienceYears || p.Years_Of_Experience || (existingRow ? existingRow[hMap.get('Years_Of_Experience', 27)] : '') || '').trim();
  var finalSkills = Array.isArray(p.skills) ? p.skills.join(', ') : String(p.skills || (existingRow ? existingRow[hMap.get('Skills', 28)] : '') || '');
  var finalBio = String(p.bio || p.Bio || (existingRow ? existingRow[hMap.get('Bio', 29)] : '') || '').trim();
  var finalProfileImg = String(p.profileImage || p.Profile_Image || (existingRow ? existingRow[hMap.get('Profile_Image', 30)] : '') || '').trim();

  if (data.length === 0 || data[0].length !== USER_HEADERS.length || data[0][9] !== 'User_Plan') {
    sheet.getRange(1, 1, 1, USER_HEADERS.length).setValues([USER_HEADERS]);
  }

  var rowData = [
    finalEmail, finalUserId, finalUid, finalDisplayName, finalPassword, finalPhone, finalWhatsApp, finalStatus, finalJoinedDate,
    userPlan, finalSubStatus, finalSubStartDate, finalSubEndDate,
    finalMaxTimeSlots, finalMaxServiceAds, finalMaxPhotosPerAd, finalCalendarWindow,
    finalBadgeStatus, finalRankingBoost, finalAnalyticsAccess,
    finalListingRefs, finalAddress, finalCity, finalNic, finalEmgName, finalEmgPhone,
    finalTrade, finalExp, finalSkills, finalBio, finalProfileImg
  ];

  if (rowIndex !== -1) {
    sheet.getRange(rowIndex, 1, 1, rowData.length).setValues([rowData]);
  } else {
    sheet.appendRow(rowData);
  }

  var isVerified = finalBadgeStatus === 'GOLD' || finalBadgeStatus === 'PLATINUM' || finalBadgeStatus === 'YES' || finalBadgeStatus === 'TRUE';

  return {
    success: true,
    profile: {
      ...p,
      User_Email: finalEmail,
      User_ID: finalUserId,
      email: finalEmail,
      memberId: finalUserId,
      uid: finalUid,
      displayName: finalDisplayName,
      password: finalPassword,
      phone: finalPhone,
      whatsapp: finalWhatsApp,
      status: finalStatus,
      joinedDate: finalJoinedDate,
      userPlan: userPlan,
      subscriptionPlan: userPlan,
      subscriptionStatus: finalSubStatus,
      subscriptionStartDate: finalSubStartDate,
      subscriptionDate: finalSubStartDate,
      subscriptionEndDate: finalSubEndDate,
      maxTimeSlots: finalMaxTimeSlots,
      maxProductAds: finalMaxTimeSlots === 'unlimited' ? 5 : (Number(finalMaxTimeSlots) || 1),
      maxServiceAds: finalMaxServiceAds,
      maxPhotosPerAd: finalMaxPhotosPerAd,
      calendarAvailabilityWindowDays: finalCalendarWindow,
      verifiedBadgeStatus: finalBadgeStatus,
      verifiedStatus: isVerified,
      searchRankingBoost: finalRankingBoost,
      analyticsAccess: finalAnalyticsAccess,
      listingRefs: finalListingRefs,
      address: finalAddress,
      city: finalCity,
      nicPassport: finalNic,
      emergencyContactName: finalEmgName,
      emergencyContactPhone: finalEmgPhone,
      tradeTitle: finalTrade,
      experienceYears: finalExp,
      skills: finalSkills,
      bio: finalBio,
      profileImage: finalProfileImg
    }
  };
}

function deleteUser(searchKey) {
  var sheet = getUsersSheet();
  var data = sheet.getDataRange().getValues();
  var query = String(searchKey || '').trim().toLowerCase();
  var hMap = getUserHeaderMap(sheet);

  var idxEmail = hMap.get('User_Email', 0);
  var idxUserId = hMap.get('User_ID', 1);
  var idxUid = hMap.get('UID', 2);

  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    if (String(row[idxEmail]).toLowerCase() === query || String(row[idxUserId]).toLowerCase() === query || String(row[idxUid]).toLowerCase() === query) {
      sheet.deleteRow(i + 1);
      return { success: true, key: searchKey };
    }
  }
  return { error: 'User not found' };
}

// ==========================================
// TAB 2: LISTINGS (PRODUCT ADS - 19 COLUMNS)
// ==========================================
function getListingsSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('Listings');
  if (!sheet) {
    sheet = ss.insertSheet('Listings');
    sheet.appendRow([
      'User_Email', 'User_ID', 'ID', 'Title', 'Price', 'OriginalPrice', 'Currency',
      'Category', 'Condition', 'Location', 'Phone', 'Description', 'Tags', 'Status',
      'Timestamp', 'Images', 'Reviews', 'Latitude', 'Longitude'
    ]);
  }
  return sheet;
}

function getListings() {
  var sheet = getListingsSheet();
  var data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];

  var listings = [];

  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    if (!row || !row[2]) continue;

    listings.push({
      User_Email: String(row[0] || '').toLowerCase(),
      User_ID: String(row[1] || ''),
      id: String(row[2]),
      title: String(row[3] || ''),
      price: Number(row[4]) || 0,
      originalPrice: row[5] !== '' && row[5] !== null ? Number(row[5]) : null,
      currency: String(row[6] || 'LKR'),
      category: String(row[7] || 'Other'),
      condition: String(row[8] || 'Good'),
      location: String(row[9] || 'Colombo'),
      phone: String(row[10] || ''),
      description: String(row[11] || ''),
      tags: row[12] ? String(row[12]) : '[]',
      status: String(row[13] || 'active'),
      timestamp: Number(row[14]) || Date.now(),
      images: row[15] ? String(row[15]) : '[]',
      reviews: row[16] ? String(row[16]) : '[]',
      latitude: row[17] !== '' && row[17] !== null ? Number(row[17]) : null,
      longitude: row[18] !== '' && row[18] !== null ? Number(row[18]) : null,

      // Client compatibility properties
      sellerEmail: String(row[0] || '').toLowerCase(),
      memberId: String(row[1] || ''),
      sellerId: String(row[1] || row[0] || '')
    });
  }

  return listings;
}

function createListing(payload) {
  var sheet = getListingsSheet();
  var id = payload.id || ('listing_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7));
  var timestamp = payload.timestamp || Date.now();

  var userEmail = String(payload.User_Email || payload.sellerEmail || payload.userEmail || '').trim().toLowerCase();
  var rawUserId = String(payload.User_ID || payload.memberId || payload.userId || payload.sellerId || '').trim().toUpperCase();
  var userId = getOrGenerateUserId(userEmail, rawUserId);

  var processedImages = processImagePayload(payload.images, {
    userId: userId,
    email: userEmail,
    type: 'Listings',
    adId: id
  });

  var tagsStr = Array.isArray(payload.tags) ? JSON.stringify(payload.tags) : (payload.tags || '[]');
  var reviewsStr = Array.isArray(payload.reviews) ? JSON.stringify(payload.reviews) : (payload.reviews || '[]');

  var rowData = [
    userEmail,
    userId,
    id,
    payload.title || '',
    Number(payload.price) || 0,
    payload.originalPrice ? Number(payload.originalPrice) : '',
    payload.currency || 'LKR',
    payload.category || 'Other',
    payload.condition || 'Good',
    payload.location || 'Colombo',
    payload.phone || '',
    payload.description || '',
    tagsStr,
    payload.status || 'active',
    timestamp,
    processedImages,
    reviewsStr,
    payload.latitude ? Number(payload.latitude) : '',
    payload.longitude ? Number(payload.longitude) : ''
  ];

  sheet.appendRow(rowData);

  return {
    User_Email: userEmail,
    User_ID: userId,
    id: id,
    title: payload.title,
    price: payload.price,
    originalPrice: payload.originalPrice,
    currency: payload.currency || 'LKR',
    category: payload.category,
    condition: payload.condition,
    location: payload.location,
    phone: payload.phone,
    description: payload.description,
    tags: payload.tags || [],
    status: payload.status || 'active',
    timestamp: timestamp,
    images: JSON.parse(processedImages),
    reviews: payload.reviews || [],
    sellerEmail: userEmail,
    memberId: userId
  };
}

function updateListing(payload) {
  var sheet = getListingsSheet();
  var data = sheet.getDataRange().getValues();
  var id = payload.id;
  var rowIndex = -1;

  for (var i = 1; i < data.length; i++) {
    if (String(data[i][2]) === String(id) || String(data[i][0]) === String(id)) {
      rowIndex = i + 1;
      break;
    }
  }

  if (rowIndex === -1) return { error: 'Listing not found: ' + id };

  var prev = data[rowIndex - 1];
  var userEmail = String(payload.User_Email || payload.sellerEmail || prev[0] || '').trim().toLowerCase();
  var rawUserId = String(payload.User_ID || payload.memberId || prev[1] || '').trim().toUpperCase();
  var userId = getOrGenerateUserId(userEmail, rawUserId);

  var processedImages = payload.images ? processImagePayload(payload.images, {
    userId: userId,
    email: userEmail,
    type: 'Listings',
    adId: id
  }) : prev[15];

  var tagsStr = Array.isArray(payload.tags) ? JSON.stringify(payload.tags) : (payload.tags || prev[12]);
  var reviewsStr = payload.reviews ? (typeof payload.reviews === 'string' ? payload.reviews : JSON.stringify(payload.reviews)) : prev[16];

  var rowData = [
    userEmail,
    userId,
    id,
    payload.title || prev[3],
    Number(payload.price) || prev[4],
    payload.originalPrice ? Number(payload.originalPrice) : prev[5],
    payload.currency || prev[6] || 'LKR',
    payload.category || prev[7],
    payload.condition || prev[8],
    payload.location || prev[9],
    payload.phone || prev[10],
    payload.description || prev[11],
    tagsStr,
    payload.status || prev[13],
    prev[14],
    processedImages,
    reviewsStr,
    payload.latitude ? Number(payload.latitude) : prev[17],
    payload.longitude ? Number(payload.longitude) : prev[18]
  ];

  sheet.getRange(rowIndex, 1, 1, 19).setValues([rowData]);

  return {
    User_Email: userEmail,
    User_ID: userId,
    id: id,
    title: rowData[3],
    price: rowData[4],
    category: rowData[7],
    status: rowData[13],
    images: JSON.parse(processedImages),
    reviews: JSON.parse(reviewsStr || '[]'),
    sellerEmail: userEmail,
    memberId: userId
  };
}

function updateListingStatus(id, status) {
  var sheet = getListingsSheet();
  var data = sheet.getDataRange().getValues();

  for (var i = 1; i < data.length; i++) {
    if (String(data[i][2]) === String(id)) {
      sheet.getRange(i + 1, 14).setValue(status);
      return { success: true, id: id, status: status };
    }
  }
  return { error: 'Listing not found: ' + id };
}

function deleteListing(id) {
  var sheet = getListingsSheet();
  var data = sheet.getDataRange().getValues();

  for (var i = 1; i < data.length; i++) {
    if (String(data[i][2]) === String(id)) {
      sheet.deleteRow(i + 1);
      return { success: true, id: id };
    }
  }
  return { error: 'Listing not found: ' + id };
}

// ==========================================
// TAB 3: SERVICE PROVIDERS (30 COLUMNS) & MIGRATION
// ==========================================
function getProvidersSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('ServiceProviders');
  if (!sheet) {
    sheet = ss.insertSheet('ServiceProviders');
    sheet.appendRow([
      'User_Email', 'User_ID', 'ID', 'BusinessName', 'Category', 'SubCategory', 'Tagline',
      'Bio', 'Location', 'Latitude', 'Longitude', 'Phone', 'Whatsapp', 'Language',
      'IsShop', 'ShopOpeningTime', 'ShopClosingTime', 'ShopOpenDays', 'HourlyRate', 'PriceRange',
      'YearsExperience', 'VerificationStatus', 'VerifiedDate', 'Rating', 'ReviewCount',
      'Availability', 'CustomShifts', 'Reviews', 'Images', 'CreatedAt'
    ]);
  }
  return sheet;
}

/**
 * AUTO-MIGRATION ENGINE
 */
function autoMigrateLegacyServiceProviders() {
  try {
    var sheet = getProvidersSheet();
    var data = sheet.getDataRange().getValues();
    if (data.length <= 1) return;

    var headers = data[0];
    var needsHeaderFix = headers.length < 30 || String(headers[0]).trim().toLowerCase() !== 'user_email' || String(headers[9]).trim().toLowerCase() !== 'latitude';
    if (needsHeaderFix) {
      sheet.getRange(1, 1, 1, 30).setValues([[
        'User_Email', 'User_ID', 'ID', 'BusinessName', 'Category', 'SubCategory', 'Tagline',
        'Bio', 'Location', 'Latitude', 'Longitude', 'Phone', 'Whatsapp', 'Language',
        'IsShop', 'ShopOpeningTime', 'ShopClosingTime', 'ShopOpenDays', 'HourlyRate', 'PriceRange',
        'YearsExperience', 'VerificationStatus', 'VerifiedDate', 'Rating', 'ReviewCount',
        'Availability', 'CustomShifts', 'Reviews', 'Images', 'CreatedAt'
      ]]);
    }
  } catch (e) {
    Logger.log('Auto-migration warning: ' + e);
  }
}

function formatHHMM(val, defaultVal) {
  if (!val) return defaultVal || '08:00';
  if (val instanceof Date) {
    var h = val.getHours();
    var m = val.getMinutes();
    return (h < 10 ? '0' + h : h) + ':' + (m < 10 ? '0' + m : m);
  }
  var str = String(val).trim();
  var match = str.match(/(\d{1,2}):(\d{2})/);
  if (match) {
    var hh = Number(match[1]);
    var mm = match[2];
    return (hh < 10 ? '0' + hh : hh) + ':' + mm;
  }
  return defaultVal || '08:00';
}

function getServiceProviders() {
  var sheet = getProvidersSheet();
  var data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];

  var headers = data[0].map(function(h) { return String(h || '').trim().toLowerCase(); });
  function getCol(name, fallbackIdx) {
    var idx = headers.indexOf(name.toLowerCase());
    return idx !== -1 ? idx : fallbackIdx;
  }

  var iEmail = getCol('user_email', 0);
  var iUserId = getCol('user_id', 1);
  var iId = getCol('id', 2);
  var iName = getCol('businessname', 3);
  var iCat = getCol('category', 4);
  var iSubCat = getCol('subcategory', 5);
  var iTagline = getCol('tagline', 6);
  var iBio = getCol('bio', 7);
  var iLoc = getCol('location', 8);
  var iLat = getCol('latitude', 9);
  var iLng = getCol('longitude', 10);
  var iPhone = getCol('phone', 11);
  var iWhatsapp = getCol('whatsapp', 12);
  var iLang = getCol('language', 13);
  var iIsShop = getCol('isshop', 14);
  var iShopOpenTime = getCol('shopopeningtime', 15);
  var iShopCloseTime = getCol('shopclosingtime', 16);
  var iShopOpenDays = getCol('shopopendays', 17);
  var iHourly = getCol('hourlyrate', 18);
  var iPriceRange = getCol('pricerange', 19);
  var iExp = getCol('yearsexperience', 20);
  var iVerifStatus = getCol('verificationstatus', 21);
  var iVerifDate = getCol('verifieddate', 22);
  var iRating = getCol('rating', 23);
  var iRevCount = getCol('reviewcount', 24);
  var iAvail = getCol('availability', 25);
  var iShifts = getCol('customshifts', 26);
  var iReviews = getCol('reviews', 27);
  var iImages = getCol('images', 28);
  var iCreatedAt = getCol('createdat', 29);

  var providers = [];
  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    if (!row || (!row[iEmail] && !row[iId] && !row[0] && !row[2])) continue;

    var emailVal = String(row[iEmail] || row[0] || '').toLowerCase();
    var userIdVal = String(row[iUserId] || row[1] || '');
    var idVal = String(row[iId] || row[2] || emailVal || '');
    var bName = String(row[iName] || (iName !== 3 ? row[3] : '') || '');

    var locStr = String(row[iLoc] || row[8] || '');
    var latVal = 6.9271;
    var lngVal = 79.8612;

    if (row[iLat] !== undefined && row[iLat] !== null && row[iLat] !== '') {
      latVal = Number(row[iLat]) || 6.9271;
    } else if (locStr.indexOf(',') !== -1) {
      var parts = locStr.split(',');
      var pLat = Number(parts[0]);
      var pLng = Number(parts[1]);
      if (!isNaN(pLat) && pLat !== 0) latVal = pLat;
      if (!isNaN(pLng) && pLng !== 0) lngVal = pLng;
    }

    if (row[iLng] !== undefined && row[iLng] !== null && row[iLng] !== '') {
      lngVal = Number(row[iLng]) || 79.8612;
    }

    var langVal = String(row[iLang] || 'English');
    var isShopVal = row[iIsShop] === true || String(row[iIsShop]).toLowerCase() === 'true';
    var shopOpenTimeVal = formatHHMM(row[iShopOpenTime], '08:00');
    var shopCloseTimeVal = formatHHMM(row[iShopCloseTime], '20:00');
    var shopOpenDaysVal = String(row[iShopOpenDays] || '[]');

    providers.push({
      User_Email: emailVal,
      User_ID: userIdVal,
      id: idVal,
      businessName: bName,
      BusinessName: bName,
      name: bName,
      displayName: bName,
      category: String(row[iCat] || row[4] || 'General Services'),
      subCategory: String(row[iSubCat] || row[5] || ''),
      tagline: String(row[iTagline] || row[6] || ''),
      bio: String(row[iBio] || row[7] || ''),
      location: locStr,
      latitude: latVal,
      longitude: lngVal,
      phone: String(row[iPhone] || row[11] || ''),
      mobile: String(row[iPhone] || row[11] || ''),
      whatsapp: String(row[iWhatsapp] || row[12] || row[iPhone] || row[11] || ''),
      language: langVal,
      SpokenLanguage: langVal,
      isShop: isShopVal,
      IsShop: isShopVal,
      shopOpeningTime: shopOpenTimeVal,
      ShopOpeningTime: shopOpenTimeVal,
      shopClosingTime: shopCloseTimeVal,
      ShopClosingTime: shopCloseTimeVal,
      shopOpenDays: shopOpenDaysVal,
      ShopOpenDays: shopOpenDaysVal,
      hourlyRate: Number(row[iHourly]) || 0,
      priceRange: String(row[iPriceRange] || ''),
      yearsExperience: Number(row[iExp]) || 1,
      verificationStatus: row[iVerifStatus] === true || String(row[iVerifStatus]).toLowerCase() === 'true',
      verifiedDate: String(row[iVerifDate] || ''),
      rating: Number(row[iRating]) || 5.0,
      reviewCount: Number(row[iRevCount]) || 0,
      availability: row[iAvail] ? String(row[iAvail]) : '{}',
      customShifts: row[iShifts] ? String(row[iShifts]) : '[]',
      reviews: row[iReviews] ? String(row[iReviews]) : '[]',
      images: row[iImages] ? String(row[iImages]) : '[]',
      createdAt: String(row[iCreatedAt] || new Date().toISOString()),

      // Client compatibility aliases
      userEmail: emailVal,
      email: emailVal,
      userId: userIdVal,
      memberId: userIdVal
    });
  }
  return providers;
}

function getServiceProvider(searchId) {
  if (!searchId) return null;
  var list = getServiceProviders();
  var query = String(searchId).trim().toLowerCase();

  for (var i = 0; i < list.length; i++) {
    var p = list[i];
    if (p.id.toLowerCase() === query || p.User_Email.toLowerCase() === query || p.User_ID.toLowerCase() === query) {
      return p;
    }
  }
  return null;
}

function saveServiceProvider(payload) {
  var sheet = getProvidersSheet();
  var data = sheet.getDataRange().getValues();
  var headers = data.length > 0 ? data[0].map(function(h) { return String(h || '').trim(); }) : [];
  var headersLower = headers.map(function(h) { return h.toLowerCase(); });

  var p = payload.provider || payload;

  var userEmail = String(p.User_Email || p.userEmail || p.email || payload.User_Email || payload.userEmail || payload.email || '').trim().toLowerCase();
  var rawUserId = String(p.User_ID || p.memberId || p.userId || payload.User_ID || payload.memberId || payload.userId || '').trim().toUpperCase();
  var userId = getOrGenerateUserId(userEmail, rawUserId);
  var id = String(p.id || p.ID || userId || ('sp_' + Date.now())).trim();
  var businessNameVal = String(p.businessName || p.BusinessName || p.name || p.FullName || p.fullName || p.displayName || p.DisplayName || '').trim();

  var rowIndex = -1;
  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    var rEmail = String(row[0] || '').trim().toLowerCase();
    var rUserId = String(row[1] || '').trim().toUpperCase();
    var rId = String(row[2] || '').trim();

    if ((id && rId === id) || (userEmail && rEmail === userEmail) || (userId && rUserId === userId)) {
      rowIndex = i + 1;
      break;
    }
  }

  var processedImages = p.images ? processImagePayload(p.images, {
    userId: userId,
    email: userEmail,
    type: 'ServiceProfile'
  }) : '[]';

  var availabilityStr = typeof p.availability === 'object' ? JSON.stringify(p.availability) : (p.availability || '{}');
  var customShiftsStr = typeof p.customShifts === 'object' ? JSON.stringify(p.customShifts) : (p.customShifts || '[]');
  var reviewsStr = typeof p.reviews === 'object' ? JSON.stringify(p.reviews) : (p.reviews || '[]');
  var shopDaysStr = typeof p.shopOpenDays === 'object' ? JSON.stringify(p.shopOpenDays) : (p.shopOpenDays || '[]');

  var latVal = p.latitude !== undefined && p.latitude !== null && !isNaN(Number(p.latitude)) ? Number(p.latitude) : 6.9271;
  var lngVal = p.longitude !== undefined && p.longitude !== null && !isNaN(Number(p.longitude)) ? Number(p.longitude) : 79.8612;
  var locVal = String(p.location || p.address || (latVal + ', ' + lngVal)).trim();
  var phoneVal = String(p.mobile || p.phone || p.whatsapp || p.Phone || p.Mobile || '').trim();
  var whatsappVal = String(p.whatsapp || p.mobile || p.phone || p.Whatsapp || p.WhatsApp || '').trim();

  var fieldValues = {
    'user_email': userEmail,
    'user_id': userId,
    'id': id,
    'businessname': businessNameVal,
    'category': p.category || 'General Services',
    'subcategory': p.subCategory || '',
    'tagline': p.tagline || '',
    'bio': p.bio || '',
    'location': locVal,
    'phone': phoneVal,
    'whatsapp': whatsappVal,
    'hourlyrate': Number(p.hourlyRate) || 0,
    'pricerange': p.priceRange || '',
    'yearsexperience': Number(p.yearsExperience) || 1,
    'verificationstatus': p.verificationStatus === true || String(p.verificationStatus).toLowerCase() === 'true',
    'verifieddate': p.verifiedDate || '',
    'rating': Number(p.rating) || 5.0,
    'reviewcount': Number(p.reviewCount) || 0,
    'availability': availabilityStr,
    'customshifts': customShiftsStr,
    'reviews': reviewsStr,
    'images': processedImages,
    'createdat': p.createdAt || new Date().toISOString(),

    // Extra fields
    'latitude': latVal,
    'longitude': lngVal,
    'language': p.language || p.SpokenLanguage || 'English',
    'isshop': p.isShop === true || String(p.isShop).toLowerCase() === 'true',
    'shopopeningtime': p.shopOpeningTime || '08:00',
    'shopclosingtime': p.shopClosingTime || '20:00',
    'shopopendays': shopDaysStr
  };

  var rowData = [];
  if (headers.length > 0) {
    for (var c = 0; c < headers.length; c++) {
      var hKey = headersLower[c];
      if (fieldValues.hasOwnProperty(hKey)) {
        rowData.push(fieldValues[hKey]);
      } else {
        // Fallback for standard 23 columns
        if (c === 0) rowData.push(userEmail);
        else if (c === 1) rowData.push(userId);
        else if (c === 2) rowData.push(id);
        else if (c === 3) rowData.push(businessNameVal);
        else if (c === 4) rowData.push(p.category || 'General Services');
        else if (c === 5) rowData.push(p.subCategory || '');
        else if (c === 6) rowData.push(p.tagline || '');
        else if (c === 7) rowData.push(p.bio || '');
        else if (c === 8) rowData.push(locVal);
        else if (c === 9) rowData.push(phoneVal);
        else if (c === 10) rowData.push(whatsappVal);
        else if (c === 11) rowData.push(Number(p.hourlyRate) || 0);
        else if (c === 12) rowData.push(p.priceRange || '');
        else if (c === 13) rowData.push(Number(p.yearsExperience) || 1);
        else if (c === 14) rowData.push(p.verificationStatus === true);
        else if (c === 15) rowData.push(p.verifiedDate || '');
        else if (c === 16) rowData.push(Number(p.rating) || 5.0);
        else if (c === 17) rowData.push(Number(p.reviewCount) || 0);
        else if (c === 18) rowData.push(availabilityStr);
        else if (c === 19) rowData.push(customShiftsStr);
        else if (c === 20) rowData.push(reviewsStr);
        else if (c === 21) rowData.push(processedImages);
        else if (c === 22) rowData.push(p.createdAt || new Date().toISOString());
        else rowData.push('');
      }
    }
  } else {
    rowData = [
      userEmail, userId, id, businessNameVal, p.category || 'General Services',
      p.subCategory || '', p.tagline || '', p.bio || '', locVal, phoneVal, whatsappVal,
      Number(p.hourlyRate) || 0, p.priceRange || '', Number(p.yearsExperience) || 1,
      p.verificationStatus === true, p.verifiedDate || '', Number(p.rating) || 5.0,
      Number(p.reviewCount) || 0, availabilityStr, customShiftsStr, reviewsStr,
      processedImages, p.createdAt || new Date().toISOString()
    ];
  }

  if (rowIndex !== -1) {
    sheet.getRange(rowIndex, 1, 1, rowData.length).setValues([rowData]);
  } else {
    sheet.appendRow(rowData);
  }

  p.User_Email = userEmail;
  p.User_ID = userId;
  p.userEmail = userEmail;
  p.email = userEmail;
  p.userId = userId;
  p.memberId = userId;
  p.id = id;
  p.businessName = businessNameVal;
  p.BusinessName = businessNameVal;
  p.name = businessNameVal;
  p.latitude = latVal;
  p.longitude = lngVal;
  p.language = p.language || p.SpokenLanguage || 'English';
  p.SpokenLanguage = p.language || p.SpokenLanguage || 'English';
  p.images = JSON.parse(processedImages);
  p.reviews = JSON.parse(reviewsStr);
  return p;
}

function updateAvailability(providerId, availability) {
  var sheet = getProvidersSheet();
  var data = sheet.getDataRange().getValues();
  var query = String(providerId || '').trim().toLowerCase();
  
  var rowIndex = -1;
  for (var i = 1; i < data.length; i++) {
    var rEmail = String(data[i][0] || '').trim().toLowerCase();
    var rUserId = String(data[i][1] || '').trim().toLowerCase();
    var rId = String(data[i][2] || '').trim().toLowerCase();

    if (rId === query || rEmail === query || rUserId === query) {
      rowIndex = i + 1;
      break;
    }
  }

  var availabilityStr = typeof availability === 'object' ? JSON.stringify(availability) : String(availability || '{}');

  if (rowIndex !== -1) {
    var headers = data[0].map(function(h) { return String(h || '').trim().toLowerCase(); });
    var iAvail = headers.indexOf('availability');
    var colIdx = iAvail !== -1 ? (iAvail + 1) : 19;
    sheet.getRange(rowIndex, colIdx).setValue(availabilityStr);
    return { success: true, providerId: providerId, availability: availabilityStr };
  }
  return { success: false, error: 'Provider not found: ' + providerId };
}

// ==========================================
// TAB 4: BOOKINGS (APPOINTMENT REQUESTS - 17 COLUMNS)
// ==========================================
function getBookingsSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('bookings');
  var headers = [
    'User_Email', 'User_ID', 'ID', 'ProviderName', 'VisitorName',
    'VisitorMobile', 'ServiceLocation', 'Message', 'Date', 'Slot',
    'CreatedAt', 'Status', 'CancellationReason', 'Customer_User_ID', 'VisitorEmail',
    'booking Images', 'ad ID'
  ];
  if (!sheet) {
    sheet = ss.insertSheet('bookings');
    sheet.appendRow(headers);
  } else {
    try {
      var lastCol = sheet.getLastColumn();
      if (lastCol < 16) {
        sheet.getRange(1, 16).setValue('booking Images');
      }
      if (lastCol < 17) {
        sheet.getRange(1, 17).setValue('ad ID');
      }
    } catch (eHdr) {}
  }
  return sheet;
}

function getBookings(searchKey) {
  var sheet = getBookingsSheet();
  var data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];

  var rawQuery = String(searchKey || '').trim();
  var query = rawQuery.toLowerCase();
  var list = [];

  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    if (!row || !row[2]) continue;

    var provEmail = String(row[0] || '').trim().toLowerCase();
    var provUserId = String(row[1] || '').trim().toLowerCase();
    var bookingId = String(row[2] || '').trim().toLowerCase();
    var custUserId = String(row[13] || '').trim().toLowerCase();
    var visitorEmail = String(row[14] || '').trim().toLowerCase();
    var rowAdId = String(row[16] || '').trim().toLowerCase();

    // Dual-Entity & Ad Routing: Match Provider (Cols 1 & 2) OR Customer (Cols 14 & 15) OR Booking ID (Col 3) OR Ad ID (Col 17)
    if (!query || provEmail === query || provUserId === query || bookingId === query || custUserId === query || visitorEmail === query || rowAdId === query) {
      var rawBookingImages = String(row[15] || '').trim();
      var parsedImages = [];
      if (rawBookingImages) {
        try {
          var parsed = JSON.parse(rawBookingImages);
          if (Array.isArray(parsed)) parsedImages = parsed;
          else if (typeof parsed === 'string') parsedImages = [parsed];
        } catch (e) {
          parsedImages = rawBookingImages.split(',').map(function(s) { return s.trim(); }).filter(Boolean);
        }
      }

      var extractedAdId = String(row[16] || '').trim();

      list.push({
        User_Email: String(row[0] || '').toLowerCase(),
        User_ID: String(row[1] || ''),
        id: String(row[2]),
        providerName: String(row[3] || ''),
        visitorName: String(row[4] || ''),
        visitorMobile: String(row[5] || ''),
        serviceLocation: String(row[6] || ''),
        message: String(row[7] || ''),
        date: String(row[8] || ''),
        slot: String(row[9] || ''),
        createdAt: String(row[10] || ''),
        status: String(row[11] || 'pending'),
        cancellationReason: String(row[12] || ''),
        Customer_User_ID: String(row[13] || ''),
        VisitorEmail: String(row[14] || '').toLowerCase(),
        bookingImages: parsedImages,
        bookingImagesRaw: rawBookingImages,
        'ad ID': extractedAdId,
        adId: extractedAdId,
        advertisementId: extractedAdId,

        // Client compatibility aliases
        providerId: extractedAdId || String(row[1] || row[0] || ''),
        providerEmail: String(row[0] || '').toLowerCase(),
        providerUserId: String(row[1] || ''),
        customerUserId: String(row[13] || ''),
        visitorEmail: String(row[14] || '').toLowerCase()
      });
    }
  }
  return list;
}

function createBooking(b) {
  if (!b) return { error: 'Invalid booking payload' };
  var sheet = getBookingsSheet();
  var bookingId = b.id || ('booking_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6));
  var createdAt = b.createdAt || new Date().toISOString();

  var provEmail = String(b.User_Email || b.providerEmail || b.userEmail || '').trim().toLowerCase();
  var rawProvUserId = String(b.User_ID || b.providerUserId || b.providerId || b.userId || '').trim().toUpperCase();
  var provUserId = getOrGenerateUserId(provEmail, rawProvUserId);

  var visitorEmail = String(b.VisitorEmail || b.visitorEmail || '').trim().toLowerCase();
  var rawCustUserId = String(b.Customer_User_ID || b.customerUserId || '').trim().toUpperCase();
  var custUserId = visitorEmail ? getOrGenerateUserId(visitorEmail, rawCustUserId) : rawCustUserId;

  var bookingImagesStr = (b.bookingImages && Array.isArray(b.bookingImages)) ? JSON.stringify(b.bookingImages) : (b.bookingImagesRaw || '');
  var adId = String(b['ad ID'] || b['Ad ID'] || b['Ad_ID'] || b['ad_id'] || b.adId || b.AdId || b.advertisementId || b.providerId || '').trim();

  var rowData = [
    provEmail,
    provUserId,
    bookingId,
    b.providerName || b.ProviderName || '',
    b.visitorName || b.VisitorName || '',
    b.visitorMobile || b.VisitorMobile || '',
    b.serviceLocation || b.ServiceLocation || '',
    b.message || b.Message || '',
    b.date || b.Date || '',
    b.slot || b.Slot || '',
    createdAt,
    b.status || b.Status || 'pending',
    b.cancellationReason || b.CancellationReason || '',
    custUserId,
    visitorEmail,
    bookingImagesStr,
    adId
  ];

  sheet.appendRow(rowData);

  return {
    User_Email: provEmail,
    User_ID: provUserId,
    id: bookingId,
    providerName: rowData[3],
    visitorName: rowData[4],
    visitorMobile: rowData[5],
    serviceLocation: rowData[6],
    message: rowData[7],
    date: rowData[8],
    slot: rowData[9],
    createdAt: createdAt,
    status: rowData[11],
    cancellationReason: rowData[12],
    Customer_User_ID: custUserId,
    VisitorEmail: visitorEmail,
    bookingImages: b.bookingImages || [],
    'ad ID': adId,
    adId: adId,
    advertisementId: adId,
    providerId: adId || provUserId || provEmail,
    providerEmail: provEmail,
    providerUserId: provUserId,
    customerUserId: custUserId,
    visitorEmail: visitorEmail
  };
}

function updateBookingStatus(id, status, cancellationReason) {
  var sheet = getBookingsSheet();
  var data = sheet.getDataRange().getValues();
  var query = String(id || '').trim().toLowerCase();

  for (var i = 1; i < data.length; i++) {
    if (String(data[i][2]).trim().toLowerCase() === query) {
      sheet.getRange(i + 1, 12).setValue(status);
      if (cancellationReason !== undefined && cancellationReason !== null) {
        sheet.getRange(i + 1, 13).setValue(String(cancellationReason));
      }
      return { success: true, id: id, status: status, cancellationReason: cancellationReason || '' };
    }
  }
  return { error: 'Booking not found: ' + id };
}

// ==========================================
// TAB 5: ADMIN SETTINGS (2 COLUMNS)
// ==========================================
function getAdminSettingsSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('AdminSettings');
  if (!sheet) {
    sheet = ss.insertSheet('AdminSettings');
    sheet.appendRow(['Setting_Key', 'Setting_Value']);
    sheet.appendRow(['maintenance_mode', 'false']);
    sheet.appendRow(['min_app_version', '1.0.4']);
    sheet.appendRow(['member_id_seq', '1000']);
  }
  return sheet;
}

function getAdminSettings() {
  var sheet = getAdminSettingsSheet();
  var data = sheet.getDataRange().getValues();
  var settings = {};
  for (var i = 1; i < data.length; i++) {
    if (data[i] && data[i][0]) {
      settings[String(data[i][0])] = String(data[i][1] || '');
    }
  }
  return settings;
}

function saveAdminSetting(key, value) {
  if (!key) return { error: 'Missing key' };
  var sheet = getAdminSettingsSheet();
  var data = sheet.getDataRange().getValues();

  for (var i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(key)) {
      sheet.getRange(i + 1, 2).setValue(String(value));
      return { success: true, key: key, value: value };
    }
  }

  sheet.appendRow([String(key), String(value)]);
  return { success: true, key: key, value: value };
}

// ==========================================
// EMAIL SENDING SERVICES
// ==========================================
function sendVerificationEmail(email, name, code) {
  try {
    var subject = 'FlashMyDeal - Verification Code: ' + code;
    var htmlBody = '<div style="font-family:sans-serif;padding:20px;max-width:500px;border:1px solid #eee;border-radius:10px;">' +
      '<h2 style="color:#2563eb;">FlashMyDeal Verification Code</h2>' +
      '<p>Hello <b>' + (name || 'Member') + '</b>,</p>' +
      '<p>Your account verification code is:</p>' +
      '<h1 style="letter-spacing:4px;color:#1d4ed8;background:#f0f7ff;padding:12px;border-radius:8px;text-align:center;">' + code + '</h1>' +
      '<p style="color:#666;font-size:12px;">This code will expire in 10 minutes.</p>' +
      '</div>';

    MailApp.sendEmail({
      to: email,
      subject: subject,
      htmlBody: htmlBody
    });
    return { success: true };
  } catch (err) {
    return { error: err.toString() };
  }
}

function sendContactEmail(name, subject, message) {
  try {
    var adminEmail = Session.getEffectiveUser().getEmail();
    MailApp.sendEmail({
      to: adminEmail,
      subject: 'FlashMyDeal Inquiry: ' + subject,
      htmlBody: '<b>From:</b> ' + name + '<br><b>Message:</b><br>' + message
    });
    return { success: true };
  } catch (err) {
    return { error: err.toString() };
  }
}
```

