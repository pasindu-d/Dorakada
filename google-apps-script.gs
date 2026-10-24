// =========================================================================================
// RULE FOR THE FUTURE:
// Any new column added to any sheet must be added AFTER the last existing column (at the far right).
// Never insert a column in the middle. All code reads columns by HEADER NAME, never by index.
// =========================================================================================

/**
 * FLASHMYDEAL / DORAKADA GOOGLE APPS SCRIPT BACKEND (Code.gs)
 * Header-Based Real-Time Architecture Engine
 * 12 Standardized Database Sheets with Zero Hardcoded Column Indices
 */

var CACHE_TTL_SECONDS = 60;

var DATABASE_SCHEMAS = {
  Users: [
    'User_ID', 'User_Email', 'Firebase_UID', 'Display_Name', 'Google_Photo_URL',
    'Phone', 'WhatsApp', 'Account_Status', 'Is_Admin', 'Joined_Date',
    'Plan', 'Plan_Status', 'Plan_Start', 'Plan_End', 'Trial_Used_Date',
    'Extra_Photo_Slots', 'Drive_Folder_ID', 'Terms_Accepted_Date', 'Last_Login', 'Notes_Admin',
    'Downgrade_Agreed', 'Downgrade_Agreed_At', 'Downgrade_Agreement_Version', 'Downgrade_Old_Plan_End',
    'Downgrade_Platinum_Days_Left', 'Downgrade_Balance_LKR', 'Downgrade_Gold_Days_Added', 'Downgrade_New_Plan_End',
    'Terms_Version'
  ],
  Providers: [
    'User_ID', 'User_Email', 'Ad_ID', 'Business_Name', 'Category',
    'Sub_Skills', 'Tagline', 'Bio', 'Years_Experience', 'Languages',
    'Service_Districts', 'Service_Radius_Km', 'Address_Area', 'Latitude', 'Longitude',
    'Is_Shop', 'Open_Days', 'Open_Time', 'Close_Time', 'Rate_Type',
    'Rate_From_LKR', 'Rate_To_LKR', 'Profile_Photo', 'Gallery_Images', 'Hidden_Images',
    'Availability', 'Custom_Shifts', 'Status', 'Verified_Badge', 'Rating',
    'Review_Count', 'Created_At', 'Updated_At'
  ],
  Providers_Private: [
    'User_ID', 'Contact_Phone', 'Contact_WhatsApp', 'Contact_Email', 'Full_Legal_Name',
    'Home_Address', 'NIC_Number', 'NVQ_Level', 'Certificates',
    'Emergency_Contact_Name', 'Emergency_Contact_Phone',
    'Admin_Verification_Status', 'Admin_Verified_Date'
  ],
  Bookings: [
    'Booking_ID', 'Ad_ID', 'Provider_User_ID', 'Provider_Email',
    'Customer_User_ID', 'Customer_Name', 'Customer_Email', 'Customer_Phone', 'Customer_WhatsApp',
    'Service_Address', 'Service_Lat', 'Service_Lng', 'Job_Description', 'Booking_Images',
    'Booking_Date', 'Time_Slot', 'Status', 'Status_Reason', 'Cancel_Requested_At',
    'Created_At', 'Updated_At', 'Reminder_Sent'
  ],
  Payments: [
    'Payment_ID', 'User_ID', 'User_Email', 'Type', 'Plan',
    'Months', 'Extra_Slots', 'Amount_LKR', 'Gateway', 'Gateway_UID',
    'Gateway_Status_Indicator', 'Gateway_Transaction_ID', 'Status',
    'Created_At', 'Paid_At', 'Applied_At', 'Plan_Start_Applied', 'Plan_End_Applied', 'Raw_Status'
  ],
  Reviews: [
    'Review_ID', 'Booking_ID', 'Ad_ID', 'Customer_User_ID',
    'Rating', 'Comment', 'Created_At', 'Status'
  ],
  Plans: [
    'Plan', 'Monthly_Price_LKR', 'Trial_Days', 'Photos_Allowed',
    'Slots_Per_Day', 'Calendar_Days', 'Badge', 'Search_Boost',
    'Analytics', 'Extra_Photo_Price_LKR'
  ],
  Email_Log: [
    'Log_ID', 'Date', 'To', 'Template', 'Related_ID', 'Result', 'Error'
  ],
  Email_Queue: [
    'Queue_ID', 'Queued_At', 'To', 'Subject', 'Html_Body', 'Related_ID', 'Attempts'
  ],
  Analytics: [
    'User_ID', 'Ad_ID', 'Date', 'Profile_Views',
    'Booking_Requests', 'Confirmed_Bookings', 'Cancellations', 'Shares'
  ],
  Deletion_Log: [
    'Log_ID', 'Date', 'Deleted_User_ID', 'Rows_Deleted', 'Files_Trashed', 'Requested_By'
  ],
  AdminSettings: [
    'Key', 'Value', 'Description'
  ]
};

/**
 * Universal Sheet Getter
 */
function getSheet(name) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(name);
  if (!sheet) {
    if (name === 'Providers') sheet = ss.getSheetByName('ServiceProviders');
    else if (name === 'Bookings') sheet = ss.getSheetByName('bookings') || ss.getSheetByName('AppointmentRequests');
    else if (name === 'Users') sheet = ss.getSheetByName('users');
  }
  return sheet;
}

/**
 * Get headers of a sheet
 */
function getHeaders(sheetOrName) {
  var sheet = typeof sheetOrName === 'string' ? getSheet(sheetOrName) : sheetOrName;
  if (!sheet) return [];
  var lastCol = Math.max(sheet.getLastColumn(), 1);
  var raw = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  return raw.map(function(h) { return String(h || '').trim(); });
}

/**
 * Map header names to their 0-based column index
 */
function getHeaderIndexMap(headers) {
  var map = {};
  for (var i = 0; i < headers.length; i++) {
    var h = String(headers[i] || '').trim();
    if (h) {
      map[h] = i;
      map[h.toLowerCase()] = i;
      map[h.toLowerCase().replace(/[\s_-]+/g, '')] = i;
    }
  }
  return map;
}

/**
 * Convert a row array to an object using sheet headers
 */
function rowToObject(row, headers) {
  var obj = {};
  for (var i = 0; i < headers.length; i++) {
    var h = headers[i];
    if (h) {
      obj[h] = (i < row.length) ? row[i] : '';
    }
  }
  return obj;
}

/**
 * Convert an object to a row array ordered according to headers
 */
function objectToRow(obj, headers) {
  var row = [];
  var objKeys = Object.keys(obj);
  var lowerKeyMap = {};
  for (var k = 0; k < objKeys.length; k++) {
    var key = objKeys[k];
    lowerKeyMap[key.toLowerCase()] = obj[key];
    lowerKeyMap[key.toLowerCase().replace(/[\s_-]+/g, '')] = obj[key];
  }

  for (var i = 0; i < headers.length; i++) {
    var h = headers[i];
    var val = '';
    if (obj.hasOwnProperty(h)) {
      val = obj[h];
    } else if (lowerKeyMap.hasOwnProperty(h.toLowerCase())) {
      val = lowerKeyMap[h.toLowerCase()];
    } else if (lowerKeyMap.hasOwnProperty(h.toLowerCase().replace(/[\s_-]+/g, ''))) {
      val = lowerKeyMap[h.toLowerCase().replace(/[\s_-]+/g, '')];
    }
    if (val === undefined || val === null) val = '';
    row.push(val);
  }
  return row;
}

/**
 * Find 1-based row index in a sheet where column equals value
 */
function findRowBy(sheet, columnName, value) {
  if (!sheet) return -1;
  var data = sheet.getDataRange().getValues();
  if (data.length <= 1) return -1;
  var headers = data[0].map(function(h) { return String(h || '').trim(); });
  var colIdx = -1;
  var target = String(columnName).trim().toLowerCase();
  for (var c = 0; c < headers.length; c++) {
    var hNorm = headers[c].toLowerCase().replace(/[\s_-]+/g, '');
    if (headers[c].toLowerCase() === target || hNorm === target.replace(/[\s_-]+/g, '')) {
      colIdx = c;
      break;
    }
  }
  if (colIdx === -1) return -1;
  var searchVal = String(value).trim().toLowerCase();
  for (var r = 1; r < data.length; r++) {
    if (String(data[r][colIdx] || '').trim().toLowerCase() === searchVal) {
      return r + 1; // 1-based row index
    }
  }
  return -1;
}

/**
 * Always append missing column to the END of the sheet
 */
function appendColumnIfMissing(sheet, headerName) {
  var headers = getHeaders(sheet);
  var cleanTarget = String(headerName).trim().toLowerCase().replace(/[\s_-]+/g, '');
  for (var i = 0; i < headers.length; i++) {
    if (headers[i].toLowerCase().replace(/[\s_-]+/g, '') === cleanTarget) {
      return i + 1;
    }
  }
  var nextCol = Math.max(sheet.getLastColumn() + 1, 1);
  sheet.getRange(1, nextCol).setValue(headerName);
  return nextCol;
}

/**
 * REAL-TIME REAL-EDIT TRIGGER (Installable onEdit)
 * Clears cache instantly and recalculates limits when admin directly modifies Sheet.
 */
function onEditTrigger(e) {
  try {
    var cache = CacheService.getScriptCache();
    cache.remove('plans_config_v1');

    if (!e || !e.range) return;
    var sheet = e.range.getSheet();
    var sheetName = sheet.getName();

    var headers = getHeaders(sheet);
    var hMap = getHeaderIndexMap(headers);

    // Update Updated_At timestamp if column exists
    if (hMap['updated_at'] !== undefined) {
      var row = e.range.getRow();
      if (row > 1) {
        var upCol = hMap['updated_at'] + 1;
        if (e.range.getColumn() !== upCol) {
          sheet.getRange(row, upCol).setValue(new Date().toISOString());
        }
      }
    }

    // Auto-update Plan_Status if admin edits Plan or Plan_End in Users sheet
    if (sheetName === 'Users' && e.range.getRow() > 1) {
      var col = e.range.getColumn();
      var planCol = (hMap['plan'] !== undefined) ? hMap['plan'] + 1 : -1;
      var planEndCol = (hMap['plan_end'] !== undefined) ? hMap['plan_end'] + 1 : -1;

      if (col === planCol || col === planEndCol) {
        var rIdx = e.range.getRow();
        var rowValues = sheet.getRange(rIdx, 1, 1, headers.length).getValues()[0];
        var uObj = rowToObject(rowValues, headers);

        var endVal = uObj['Plan_End'];
        if (endVal && hMap['plan_status'] !== undefined) {
          var endTs = new Date(endVal).getTime();
          if (!isNaN(endTs)) {
            var newStatus = endTs > Date.now() ? 'ACTIVE' : 'EXPIRED';
            sheet.getRange(rIdx, hMap['plan_status'] + 1).setValue(newStatus);
          }
        }
      }
    }
  } catch (err) {
    Logger.log('onEditTrigger error: ' + err);
  }
}

/**
 * DEFAULT PLANS CONFIGURATION FALLBACK
 */
function getDefaultPlansConfig() {
  return {
    plans: {
      FREE: {
        planName: 'FREE',
        monthlyPriceLKR: 0,
        trialDays: 7,
        photosAllowed: 3,
        slotsPerDay: '1',
        calendarDays: 7,
        badge: 'NONE',
        searchBoost: 'Standard (0%)',
        analytics: 'OFF',
        extraPhotoPriceLKR: 0
      },
      GOLD: {
        planName: 'GOLD',
        monthlyPriceLKR: 1000,
        trialDays: 0,
        photosAllowed: 6,
        slotsPerDay: 'unlimited',
        calendarDays: 30,
        badge: 'GOLD',
        searchBoost: '+20% boost',
        analytics: 'ON',
        extraPhotoPriceLKR: 0
      },
      PLATINUM: {
        planName: 'PLATINUM',
        monthlyPriceLKR: 1800,
        trialDays: 0,
        photosAllowed: 10,
        slotsPerDay: 'unlimited',
        calendarDays: 30,
        badge: 'PLATINUM',
        searchBoost: 'Top of results (+100%)',
        analytics: 'ON',
        extraPhotoPriceLKR: 200
      }
    },
    discounts: [
      { months: 1, discountPercent: 0 },
      { months: 3, discountPercent: 5 },
      { months: 6, discountPercent: 10 },
      { months: 9, discountPercent: 15 },
      { months: 12, discountPercent: 16.67 }
    ]
  };
}

/**
 * GET LIVE PLANS CONFIGURATION (Cached with 60s TTL)
 */
function getPlansConfig() {
  var cache = CacheService.getScriptCache();
  var cached = cache.get('plans_config_v1');
  if (cached) {
    try {
      return JSON.parse(cached);
    } catch (e) {}
  }

  var sheet = getSheet('Plans');
  if (!sheet) {
    return getDefaultPlansConfig();
  }

  var data = sheet.getDataRange().getValues();
  if (data.length <= 1) {
    return getDefaultPlansConfig();
  }

  var headers = data[0].map(function(h) { return String(h || '').trim(); });
  var hMap = getHeaderIndexMap(headers);

  var plans = {};
  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    var pName = String(row[hMap['plan']] || '').trim().toUpperCase();
    if (pName === 'FREE' || pName === 'GOLD' || pName === 'PLATINUM') {
      plans[pName] = {
        planName: pName,
        monthlyPriceLKR: Number(row[hMap['monthly_price_lkr']]) || 0,
        trialDays: Number(row[hMap['trial_days']]) || 0,
        photosAllowed: Number(row[hMap['photos_allowed']]) || (pName === 'PLATINUM' ? 10 : (pName === 'GOLD' ? 6 : 3)),
        slotsPerDay: String(row[hMap['slots_per_day']] || (pName === 'FREE' ? '1' : 'unlimited')).trim(),
        calendarDays: Number(row[hMap['calendar_days']]) || (pName === 'FREE' ? 7 : 30),
        badge: String(row[hMap['badge']] || (pName === 'FREE' ? 'NONE' : pName)).trim(),
        searchBoost: String(row[hMap['search_boost']] || (pName === 'PLATINUM' ? 'Top of results (+100%)' : (pName === 'GOLD' ? '+20% boost' : 'Standard (0%)'))).trim(),
        analytics: String(row[hMap['analytics']] || (pName === 'FREE' ? 'OFF' : 'ON')).trim(),
        extraPhotoPriceLKR: Number(row[hMap['extra_photo_price_lkr']]) || (pName === 'PLATINUM' ? 200 : 0)
      };
    }
  }

  var defs = getDefaultPlansConfig().plans;
  for (var k in defs) {
    if (!plans[k]) plans[k] = defs[k];
  }

  var result = {
    plans: plans,
    discounts: [
      { months: 1, discountPercent: 0 },
      { months: 3, discountPercent: 5 },
      { months: 6, discountPercent: 10 },
      { months: 9, discountPercent: 15 },
      { months: 12, discountPercent: 16.67 }
    ]
  };

  try {
    cache.put('plans_config_v1', JSON.stringify(result), CACHE_TTL_SECONDS);
  } catch (cErr) {}

  return result;
}

/**
 * SETUP DATABASE (Prompt 25):
 * Ensures all 12 sheets exist with their exact headers, freezes row 1, sets validations & initial data.
 */
function setupDatabase() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheetNames = Object.keys(DATABASE_SCHEMAS);
  var createdSheets = [];
  var updatedSheets = [];

  for (var i = 0; i < sheetNames.length; i++) {
    var name = sheetNames[i];
    var headers = DATABASE_SCHEMAS[name];
    var sheet = ss.getSheetByName(name);
    var isNew = false;

    if (!sheet) {
      sheet = ss.insertSheet(name);
      isNew = true;
      createdSheets.push(name);
    } else {
      updatedSheets.push(name);
    }

    sheet.setFrozenRows(1);

    var existingHeaders = getHeaders(sheet);
    if (existingHeaders.length === 0 || isNew) {
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      var headerRange = sheet.getRange(1, 1, 1, headers.length);
      headerRange.setFontWeight('bold');
      headerRange.setBackground('#F3F4F6');
      headerRange.setFontColor('#111827');
    } else {
      for (var h = 0; h < headers.length; h++) {
        appendColumnIfMissing(sheet, headers[h]);
      }
    }

    if (name === 'Plans') {
      var pData = sheet.getDataRange().getValues();
      if (pData.length <= 1) {
        var defPlans = [
          ['FREE', 0, 7, 3, '1', 7, 'NONE', 'Standard (0%)', 'OFF', 0],
          ['GOLD', 1000, 0, 6, 'unlimited', 30, 'GOLD', '+20% boost', 'ON', 0],
          ['PLATINUM', 1800, 0, 10, 'unlimited', 30, 'PLATINUM', 'Top of results (+100%)', 'ON', 200]
        ];
        sheet.getRange(2, 1, defPlans.length, headers.length).setValues(defPlans);

        sheet.getRange(6, 1, 1, 2).setValues([['Months', 'Discount_Percent']]);
        sheet.getRange(6, 1, 1, 2).setFontWeight('bold');
        var defDiscounts = [
          [1, 0],
          [3, 5],
          [6, 10],
          [9, 15],
          [12, 16.67]
        ];
        sheet.getRange(7, 1, defDiscounts.length, 2).setValues(defDiscounts);
      }
    } else if (name === 'AdminSettings') {
      var aData = sheet.getDataRange().getValues();
      if (aData.length <= 1) {
        var defSettings = [
          ['member_id_seq', '1000', 'Sequence counter for FMD Member User IDs'],
          ['maintenance_mode', 'FALSE', 'Set to TRUE to place public site in maintenance mode'],
          ['downgrade_agreement_version', 'v1.0', 'Active version of Platinum to Gold downgrade agreement'],
          ['downgrade_agreement_text', 'I agree to downgrade my plan from Platinum to Gold immediately. The unused Platinum balance will be converted into Gold days as shown above. I understand that no money will be refunded, extra photo slots are forfeited, and photos above the Gold limit will be hidden.', 'Legal agreement text presented to users before confirming downgrade']
        ];
        sheet.getRange(2, 1, defSettings.length, headers.length).setValues(defSettings);
      }
    } else if (name === 'Users') {
      var uHeaders = getHeaders(sheet);
      var uHMap = getHeaderIndexMap(uHeaders);
      if (uHMap['plan'] !== undefined) {
        var planRule = SpreadsheetApp.newDataValidation()
          .requireValueInList(['FREE', 'GOLD', 'PLATINUM'], true)
          .setAllowInvalid(false)
          .build();
        sheet.getRange(2, uHMap['plan'] + 1, 500, 1).setDataValidation(planRule);
      }
      if (uHMap['plan_status'] !== undefined) {
        var planStatRule = SpreadsheetApp.newDataValidation()
          .requireValueInList(['NONE', 'ACTIVE', 'EXPIRED', 'PENDING_PAYMENT'], true)
          .setAllowInvalid(false)
          .build();
        sheet.getRange(2, uHMap['plan_status'] + 1, 500, 1).setDataValidation(planStatRule);
      }
      if (uHMap['account_status'] !== undefined) {
        var accStatRule = SpreadsheetApp.newDataValidation()
          .requireValueInList(['active', 'suspended', 'deleted'], true)
          .setAllowInvalid(false)
          .build();
        sheet.getRange(2, uHMap['account_status'] + 1, 500, 1).setDataValidation(accStatRule);
      }
    } else if (name === 'Providers') {
      var prHeaders = getHeaders(sheet);
      var prHMap = getHeaderIndexMap(prHeaders);
      if (prHMap['status'] !== undefined) {
        var statRule = SpreadsheetApp.newDataValidation()
          .requireValueInList(['draft', 'live', 'hidden'], true)
          .setAllowInvalid(false)
          .build();
        sheet.getRange(2, prHMap['status'] + 1, 500, 1).setDataValidation(statRule);
      }
      if (prHMap['verified_badge'] !== undefined) {
        var badgeRule = SpreadsheetApp.newDataValidation()
          .requireValueInList(['NONE', 'GOLD', 'PLATINUM'], true)
          .setAllowInvalid(false)
          .build();
        sheet.getRange(2, prHMap['verified_badge'] + 1, 500, 1).setDataValidation(badgeRule);
      }
      if (prHMap['rate_type'] !== undefined) {
        var rateRule = SpreadsheetApp.newDataValidation()
          .requireValueInList(['hourly', 'daily', 'per_job', 'quote'], true)
          .setAllowInvalid(false)
          .build();
        sheet.getRange(2, prHMap['rate_type'] + 1, 500, 1).setDataValidation(rateRule);
      }
    } else if (name === 'Bookings') {
      var bkHeaders = getHeaders(sheet);
      var bkHMap = getHeaderIndexMap(bkHeaders);
      if (bkHMap['status'] !== undefined) {
        var bkStatRule = SpreadsheetApp.newDataValidation()
          .requireValueInList(['pending', 'confirmed', 'declined', 'cancel_requested', 'cancelled_by_customer', 'cancelled_by_provider', 'completed', 'no_show'], true)
          .setAllowInvalid(false)
          .build();
        sheet.getRange(2, bkHMap['status'] + 1, 500, 1).setDataValidation(bkStatRule);
      }
    }
  }

  Logger.log('setupDatabase completed successfully. Created: ' + createdSheets.join(', ') + ' | Updated: ' + updatedSheets.join(', '));
  return {
    success: true,
    createdSheets: createdSheets,
    updatedSheets: updatedSheets
  };
}

/**
 * MIGRATE OLD DATA (Prompt 25):
 * Migrates old Users, ServiceProviders, and Bookings data safely into the new header-based schema.
 */
function migrateOldData() {
  setupDatabase();

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var report = {
    usersMigrated: 0,
    providersMigrated: 0,
    privateRecordsCreated: 0,
    bookingsMigrated: 0,
    analyticsMigrated: 0
  };

  // 1. Migrate Users
  var oldUsersSheet = ss.getSheetByName('Users') || ss.getSheetByName('users');
  var newUsersSheet = ss.getSheetByName('Users');
  if (oldUsersSheet && newUsersSheet) {
    var uData = oldUsersSheet.getDataRange().getValues();
    if (uData.length > 1) {
      var uHeaders = uData[0].map(function(h) { return String(h || '').trim(); });
      var uHMap = getHeaderIndexMap(uHeaders);

      var isOldUsersSchema = uHeaders.indexOf('User_Plan') !== -1 || uHeaders.indexOf('MAX_time_slots') !== -1 || uHeaders.indexOf('Password') !== -1;
      if (isOldUsersSchema) {
        for (var i = 1; i < uData.length; i++) {
          var row = uData[i];
          var email = String(row[uHMap['user_email'] !== undefined ? uHMap['user_email'] : 0] || '').trim().toLowerCase();
          var userId = String(row[uHMap['user_id'] !== undefined ? uHMap['user_id'] : 1] || '').trim().toUpperCase();
          if (!email && !userId) continue;

          var existingRow = findRowBy(newUsersSheet, 'User_Email', email);
          if (existingRow === -1 && userId) {
            existingRow = findRowBy(newUsersSheet, 'User_ID', userId);
          }

          var rawPlan = String(row[uHMap['user_plan'] !== undefined ? uHMap['user_plan'] : 9] || 'FREE').toUpperCase().trim();
          var cleanPlan = 'FREE';
          if (rawPlan === 'PLATINUM' || rawPlan === 'PRO_BOTH') cleanPlan = 'PLATINUM';
          else if (rawPlan === 'GOLD' || rawPlan === 'SILVER' || rawPlan.indexOf('PRO') !== -1) cleanPlan = 'GOLD';

          var userObj = {
            User_ID: userId || getOrGenerateUserId(email, ''),
            User_Email: email,
            Firebase_UID: String(row[uHMap['uid'] !== undefined ? uHMap['uid'] : 2] || ''),
            Display_Name: String(row[uHMap['displayname'] !== undefined ? uHMap['displayname'] : 3] || ''),
            Google_Photo_URL: String(row[uHMap['profile_image'] !== undefined ? uHMap['profile_image'] : 30] || ''),
            Phone: String(row[uHMap['phone'] !== undefined ? uHMap['phone'] : 5] || ''),
            WhatsApp: String(row[uHMap['whatsapp'] !== undefined ? uHMap['whatsapp'] : 6] || ''),
            Account_Status: String(row[uHMap['status'] !== undefined ? uHMap['status'] : 7] || 'active').toLowerCase(),
            Is_Admin: email === 'pasindud869@gmail.com' ? 'TRUE' : 'FALSE',
            Joined_Date: String(row[uHMap['joineddate'] !== undefined ? uHMap['joineddate'] : 8] || new Date().toISOString()),
            Plan: cleanPlan,
            Plan_Status: String(row[uHMap['subscription_status'] !== undefined ? uHMap['subscription_status'] : 10] || 'ACTIVE').toUpperCase(),
            Plan_Start: String(row[uHMap['subscription_start_date'] !== undefined ? uHMap['subscription_start_date'] : 11] || ''),
            Plan_End: String(row[uHMap['subscription_end_date'] !== undefined ? uHMap['subscription_end_date'] : 12] || ''),
            Trial_Used_Date: '',
            Extra_Photo_Slots: 0,
            Drive_Folder_ID: '',
            Terms_Accepted_Date: String(row[uHMap['joineddate'] !== undefined ? uHMap['joineddate'] : 8] || new Date().toISOString()),
            Last_Login: new Date().toISOString(),
            Notes_Admin: ''
          };

          var newHeaders = getHeaders(newUsersSheet);
          var rowValues = objectToRow(userObj, newHeaders);

          if (existingRow !== -1) {
            newUsersSheet.getRange(existingRow, 1, 1, rowValues.length).setValues([rowValues]);
          } else {
            newUsersSheet.appendRow(rowValues);
          }
          report.usersMigrated++;
        }
      }
    }
  }

  // 2. Migrate ServiceProviders -> Providers (public) & Providers_Private (confidential)
  var oldSpSheet = ss.getSheetByName('ServiceProviders');
  var newProvSheet = ss.getSheetByName('Providers');
  var newPrivSheet = ss.getSheetByName('Providers_Private');

  if (oldSpSheet && newProvSheet && newPrivSheet) {
    var spData = oldSpSheet.getDataRange().getValues();
    if (spData.length > 1) {
      var spHeaders = spData[0].map(function(h) { return String(h || '').trim(); });
      var spHMap = getHeaderIndexMap(spHeaders);

      for (var s = 1; s < spData.length; s++) {
        var spRow = spData[s];
        var spEmail = String(spRow[spHMap['user_email'] !== undefined ? spHMap['user_email'] : 0] || '').trim().toLowerCase();
        var spUserId = String(spRow[spHMap['user_id'] !== undefined ? spHMap['user_id'] : 1] || '').trim().toUpperCase();
        var adId = String(spRow[spHMap['id'] !== undefined ? spHMap['id'] : 2] || '').trim();
        if (!spEmail && !spUserId && !adId) continue;

        var bName = String(spRow[spHMap['businessname'] !== undefined ? spHMap['businessname'] : 3] || '').trim();
        var cat = String(spRow[spHMap['category'] !== undefined ? spHMap['category'] : 4] || 'General Services').trim();
        var subCat = String(spRow[spHMap['subcategory'] !== undefined ? spHMap['subcategory'] : 5] || '').trim();
        var tagline = String(spRow[spHMap['tagline'] !== undefined ? spHMap['tagline'] : 6] || '').trim();
        var bio = String(spRow[spHMap['bio'] !== undefined ? spHMap['bio'] : 7] || '').trim();
        var loc = String(spRow[spHMap['location'] !== undefined ? spHMap['location'] : 8] || '').trim();
        var lat = Number(spRow[spHMap['latitude'] !== undefined ? spHMap['latitude'] : 9]) || 6.9271;
        var lng = Number(spRow[spHMap['longitude'] !== undefined ? spHMap['longitude'] : 10]) || 79.8612;
        var phone = String(spRow[spHMap['phone'] !== undefined ? spHMap['phone'] : 11] || '').trim();
        var whatsapp = String(spRow[spHMap['whatsapp'] !== undefined ? spHMap['whatsapp'] : 12] || phone).trim();
        var lang = String(spRow[spHMap['language'] !== undefined ? spHMap['language'] : 13] || 'English').trim();
        var isShop = Boolean(spRow[spHMap['isshop'] !== undefined ? spHMap['isshop'] : 14]);
        var openTime = String(spRow[spHMap['shopopeningtime'] !== undefined ? spHMap['shopopeningtime'] : 15] || '08:00');
        var closeTime = String(spRow[spHMap['shopclosingtime'] !== undefined ? spHMap['shopclosingtime'] : 16] || '20:00');
        var openDays = String(spRow[spHMap['shopopendays'] !== undefined ? spHMap['shopopendays'] : 17] || '[]');
        var hourlyRate = Number(spRow[spHMap['hourlyrate'] !== undefined ? spHMap['hourlyrate'] : 18]) || 0;
        var expYears = Number(spRow[spHMap['yearsexperience'] !== undefined ? spHMap['yearsexperience'] : 20]) || 1;
        var isVerified = Boolean(spRow[spHMap['verificationstatus'] !== undefined ? spHMap['verificationstatus'] : 21]);
        var verifiedDate = String(spRow[spHMap['verifieddate'] !== undefined ? spHMap['verifieddate'] : 22] || '');
        var rating = Number(spRow[spHMap['rating'] !== undefined ? spHMap['rating'] : 23]) || 5.0;
        var reviewCount = Number(spRow[spHMap['reviewcount'] !== undefined ? spHMap['reviewcount'] : 24]) || 0;
        var avail = String(spRow[spHMap['availability'] !== undefined ? spHMap['availability'] : 25] || '{}');
        var shifts = String(spRow[spHMap['customshifts'] !== undefined ? spHMap['customshifts'] : 26] || '[]');
        var images = String(spRow[spHMap['images'] !== undefined ? spHMap['images'] : 28] || '[]');
        var createdAt = String(spRow[spHMap['createdat'] !== undefined ? spHMap['createdat'] : 29] || new Date().toISOString());
        var isDraft = String(spRow[spHMap['draft'] !== undefined ? spHMap['draft'] : 30]).toUpperCase() === 'TRUE';

        // Public record
        var pubObj = {
          User_ID: spUserId,
          User_Email: spEmail,
          Ad_ID: adId,
          Business_Name: bName,
          Category: cat,
          Sub_Skills: subCat,
          Tagline: tagline,
          Bio: bio,
          Years_Experience: expYears,
          Languages: lang,
          Service_Districts: loc || 'Colombo',
          Service_Radius_Km: 15,
          Address_Area: loc,
          Latitude: lat,
          Longitude: lng,
          Is_Shop: isShop,
          Open_Days: openDays,
          Open_Time: openTime,
          Close_Time: closeTime,
          Rate_Type: hourlyRate > 0 ? 'hourly' : 'per_job',
          Rate_From_LKR: hourlyRate,
          Rate_To_LKR: 0,
          Profile_Photo: '',
          Gallery_Images: images,
          Hidden_Images: '[]',
          Availability: avail,
          Custom_Shifts: shifts,
          Status: isDraft ? 'draft' : 'live',
          Verified_Badge: isVerified ? 'GOLD' : 'NONE',
          Rating: rating,
          Review_Count: reviewCount,
          Created_At: createdAt,
          Updated_At: new Date().toISOString()
        };

        var prHeaders = getHeaders(newProvSheet);
        var prRowValues = objectToRow(pubObj, prHeaders);
        var existingPrRow = findRowBy(newProvSheet, 'Ad_ID', adId);
        if (existingPrRow !== -1) {
          newProvSheet.getRange(existingPrRow, 1, 1, prRowValues.length).setValues([prRowValues]);
        } else {
          newProvSheet.appendRow(prRowValues);
        }
        report.providersMigrated++;

        // Private contact info
        var privObj = {
          User_ID: spUserId,
          Contact_Phone: phone,
          Contact_WhatsApp: whatsapp,
          Contact_Email: spEmail,
          Full_Legal_Name: bName,
          Home_Address: loc,
          NIC_Number: '',
          NVQ_Level: '',
          Certificates: '[]',
          Emergency_Contact_Name: '',
          Emergency_Contact_Phone: '',
          Admin_Verification_Status: isVerified ? 'approved' : 'not_submitted',
          Admin_Verified_Date: verifiedDate
        };

        var privHeaders = getHeaders(newPrivSheet);
        var privRowValues = objectToRow(privObj, privHeaders);
        var existingPrivRow = findRowBy(newPrivSheet, 'User_ID', spUserId);
        if (existingPrivRow !== -1) {
          newPrivSheet.getRange(existingPrivRow, 1, 1, privRowValues.length).setValues([privRowValues]);
        } else {
          newPrivSheet.appendRow(privRowValues);
        }
        report.privateRecordsCreated++;
      }
    }
  }

  Logger.log('migrateOldData completed report: ' + JSON.stringify(report));
  return {
    success: true,
    report: report
  };
}

function doGet(e) {
  try {
    var params = (e && e.parameter) ? e.parameter : {};
    var expectedSecret = PropertiesService.getScriptProperties().getProperty('API_SECRET');
    if (!expectedSecret || !params.secret || String(params.secret) !== String(expectedSecret)) {
      return ContentService.createTextOutput(JSON.stringify({ error: 'Unauthorized' }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    var action = params.action;
    var result = {};

    // Check and update expired subscriptions
    checkAndUpdateExpiredSubscriptions();

    if (action === 'getPlans' || action === 'plans') {
      result = getPlansConfig();
    } else if (action === 'getServiceProviders' || action === 'serviceProviders') {
      result = getServiceProviders(params);
    } else if (action === 'getServiceProvider') {
      result = getServiceProvider(params.id || params.providerId || params.email || params.memberId, params);
    } else if (action === 'getBookings') {
      var bSearchKey = params.searchKey || params.id || params.providerId || params.searchId || params.memberId || params.customerUserId || '';
      result = getBookings(bSearchKey, params.callerEmail, params.callerUid);
    } else if (action === 'getBookedSlots' || action === 'bookedSlots') {
      var slotAdId = params.adId || params.providerId || params.id || params.searchId || '';
      result = getBookedSlots(slotAdId, params.fromDate, params.toDate);
    } else if (action === 'getUser') {
      var targetSearchKey = params.searchKey || params.uid || params.email || params.memberId || params.callerEmail;
      result = getUser(targetSearchKey, params.callerEmail, params.callerUid);
    } else if (action === 'getAdminSettings') {
      result = getAdminSettings();
    } else if (action === 'getAnalytics' || action === 'analytics') {
      result = getAnalytics();
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
    if (e && e.postData && e.postData.contents) {
      postData = JSON.parse(e.postData.contents);
    }
    var expectedSecret = PropertiesService.getScriptProperties().getProperty('API_SECRET');
    var providedSecret = postData.secret || (e && e.parameter && e.parameter.secret);
    if (!expectedSecret || !providedSecret || String(providedSecret) !== String(expectedSecret)) {
      return ContentService.createTextOutput(JSON.stringify({ error: 'Unauthorized' }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    var action = postData.action;
    var result = {};

    if (action === 'getPlans' || action === 'plans') {
      result = getPlansConfig();
    } else if (action === 'setupDatabase') {
      result = setupDatabase();
    } else if (action === 'migrateOldData') {
      result = migrateOldData();
    } else if (action === 'deleteServiceProvider') {
      result = deleteServiceProvider(postData.id || postData.providerId, postData.userId, postData.callerEmail || postData.userEmail || postData.email);
    } else if (action === 'updateServiceProviderDraftStatus' || action === 'updateDraftStatus') {
      result = updateServiceProviderDraftStatus(postData.id || postData.providerId, postData.isDraft !== undefined ? postData.isDraft : postData.draft, postData.callerEmail || postData.userEmail || postData.email, postData.userId || postData.memberId);
    } else if (action === 'purchaseExtraImageSlots' || action === 'updateAdImageLimit') {
      result = purchaseExtraImageSlots(postData.adId || postData.id, postData.extraSlots, postData.totalSlots, postData.callerEmail || postData.userEmail || postData.email, postData.userId || postData.memberId);
    } else if (action === 'saveServiceProvider') {
      result = saveServiceProvider(postData);
    } else if (action === 'getBookings') {
      var bSearchKey = postData.searchKey || postData.id || postData.providerId || postData.searchId || postData.memberId || postData.customerUserId || '';
      result = getBookings(bSearchKey, postData.callerEmail, postData.callerUid);
    } else if (action === 'getBookedSlots' || action === 'bookedSlots') {
      var slotAdId = postData.adId || postData.providerId || postData.id || postData.searchId || '';
      result = getBookedSlots(slotAdId, postData.fromDate, postData.toDate);
    } else if (action === 'createBooking') {
      result = createBooking(postData.booking || postData);
    } else if (action === 'sendPendingBookingNotifications' || action === 'notifyPendingBookings') {
      result = sendPendingBookingNotifications(postData.callerEmail || postData.email || postData.userEmail);
    } else if (action === 'updateBookingStatus') {
      result = updateBookingStatus(postData.id || postData.bookingId, postData.status, postData.cancellationReason, postData.callerEmail);
    } else if (action === 'deleteBooking') {
      result = deleteBooking(postData);
    } else if (action === 'updateAvailability') {
      result = updateAvailability(postData.providerId || postData.id, postData.availability, postData.callerEmail);
    } else if (action === 'getUser') {
      var targetSearchKey = postData.searchKey || postData.uid || postData.email || postData.memberId || postData.callerEmail;
      result = getUser(targetSearchKey, postData.callerEmail, postData.callerUid);
    } else if (action === 'saveUser') {
      result = saveUser(postData.profile || postData);
    } else if (action === 'deleteUser') {
      result = deleteUser(postData.callerEmail || postData.uid || postData.email || postData.searchKey || postData.memberId, postData.callerEmail || postData.userEmail || postData.email, postData.userId || postData.memberId || postData.uid);
    } else if (action === 'saveAdminSetting') {
      result = saveAdminSetting(postData.key, postData.value);
    } else if (action === 'saveAnalytics') {
      result = saveAnalytics(postData.record || postData);
    } else if (action === 'sendVerificationEmail') {
      result = sendVerificationEmail(postData.callerEmail || postData.email, postData.name, postData.code);
    } else if (action === 'sendContactEmail') {
      result = sendContactEmail(postData.name, postData.subject, postData.message);
    } else if (action === 'submitBankTransferReceipt') {
      result = submitBankTransferReceipt(postData);
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

  // Tier 1 (Explicit Existing Key): Only use providedUserId when no email is available to verify against
  if (!cleanEmail && providedUserId && String(providedUserId).toUpperCase().startsWith('FMD')) {
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
      var serviceProfileFolder = getOrCreateSubFolder(userFolder, 'ServiceProfile');
      var adFolderName = 'Ad_' + (pathInfo.adId || Date.now());
      targetFolder = getOrCreateSubFolder(serviceProfileFolder, adFolderName);
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

function extractDriveFileIds(text) {
  var ids = [];
  if (!text) return ids;
  var str = String(text);

  // Direct file ID check (standard Google Drive IDs 25-45 characters)
  var trimmed = str.trim();
  if (/^[a-zA-Z0-9_-]{25,45}$/.test(trimmed)) {
    ids.push(trimmed);
    return ids;
  }

  // Look for Google Drive URL formats
  var regex = /(?:lh3\.googleusercontent\.com\/d\/|drive\.google\.com\/file\/d\/|drive\.google\.com\/uc\?id=|drive\.google\.com\/open\?id=|id=)([a-zA-Z0-9_-]{20,})/g;
  var match;
  while ((match = regex.exec(str)) !== null) {
    if (match[1] && ids.indexOf(match[1]) === -1) {
      ids.push(match[1]);
    }
  }

  // Also general /d/FILE_ID pattern
  var generalRegex = /\/d\/([a-zA-Z0-9_-]{25,45})/g;
  while ((match = generalRegex.exec(str)) !== null) {
    if (match[1] && ids.indexOf(match[1]) === -1) {
      ids.push(match[1]);
    }
  }

  return ids;
}

function findAdFolder(userId, email, type, adId) {
  try {
    var rootFolders = DriveApp.getFoldersByName('FlashMyDeal_Uploads');
    if (!rootFolders.hasNext()) return null;
    var rootFolder = rootFolders.next();

    var cleanEmail = String(email || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '_');
    var userIdStr = String(userId || '').trim().toLowerCase();
    var adIdStr = String(adId || '').trim();
    if (!adIdStr) return null;

    var targetAdFolderName = 'Ad_' + adIdStr;
    var rawAdFolderName = adIdStr;

    // Scan user folders in FlashMyDeal_Uploads
    var userSubFolders = rootFolder.getFolders();
    while (userSubFolders.hasNext()) {
      var uFolder = userSubFolders.next();
      var uName = uFolder.getName().toLowerCase();
      var isUserFolder = (userIdStr && uName.indexOf(userIdStr) >= 0) || (cleanEmail && uName.indexOf(cleanEmail) >= 0);

      if (isUserFolder) {
        var subFolders = uFolder.getFolders();
        while (subFolders.hasNext()) {
          var sFolder = subFolders.next();
          var sName = sFolder.getName();

          if (sName === targetAdFolderName || sName === rawAdFolderName || sName.indexOf(adIdStr) >= 0) {
            return sFolder;
          }

          if (sName === 'Listings' || sName === 'ServiceProfile') {
            var nestedFs = sFolder.getFolders();
            while (nestedFs.hasNext()) {
              var nF = nestedFs.next();
              var nName = nF.getName();
              if (nName === targetAdFolderName || nName === rawAdFolderName || nName.indexOf(adIdStr) >= 0) {
                return nF;
              }
            }
          }
        }
      }
    }

    return null;
  } catch (err) {
    Logger.log('Error in findAdFolder: ' + err);
    return null;
  }
}

function syncAndCleanAdImages(params) {
  var userId = params.userId;
  var email = params.email;
  var type = params.type || 'ServiceProfile';
  var adId = params.adId;
  var previousImagesText = params.previousImagesText || '';
  var processedImagesText = params.processedImagesText || '[]';
  var explicitRemoved = params.explicitRemoved || [];

  try {
    // 1. Collect all active Drive file IDs that MUST be kept
    var activeFileIds = extractDriveFileIds(processedImagesText);
    var activeIdMap = {};
    for (var a = 0; a < activeFileIds.length; a++) {
      activeIdMap[activeFileIds[a]] = true;
    }

    // 2. Identify candidate file IDs to delete
    var toDeleteMap = {};

    // Check explicit removed list sent from client UI
    if (typeof explicitRemoved === 'string') {
      try { explicitRemoved = JSON.parse(explicitRemoved); } catch (e) { explicitRemoved = [explicitRemoved]; }
    }
    if (Array.isArray(explicitRemoved)) {
      for (var r = 0; r < explicitRemoved.length; r++) {
        var rIds = extractDriveFileIds(explicitRemoved[r]);
        for (var ri = 0; ri < rIds.length; ri++) {
          if (!activeIdMap[rIds[ri]]) {
            toDeleteMap[rIds[ri]] = true;
          }
        }
      }
    }

    // Check previous images from existing database row
    if (previousImagesText) {
      var prevIds = extractDriveFileIds(previousImagesText);
      for (var p = 0; p < prevIds.length; p++) {
        if (!activeIdMap[prevIds[p]]) {
          toDeleteMap[prevIds[p]] = true;
        }
      }
    }

    // 3. Delete/trash individual files by ID
    var delIds = Object.keys(toDeleteMap);
    for (var d = 0; d < delIds.length; d++) {
      try {
        var f = DriveApp.getFileById(delIds[d]);
        if (f) {
          f.setTrashed(true);
        }
      } catch (errTrash) {
        Logger.log('Could not trash file ' + delIds[d] + ': ' + errTrash);
      }
    }

    // 4. Clean up the specific ad image folder in Drive
    var adFolder = findAdFolder(userId, email, type, adId);
    if (adFolder) {
      var folderFiles = adFolder.getFiles();
      while (folderFiles.hasNext()) {
        var file = folderFiles.next();
        var fid = file.getId();

        // If no images are kept (0 images), or if this file is not in active set, trash it!
        if (activeFileIds.length === 0 || !activeIdMap[fid]) {
          try {
            file.setTrashed(true);
          } catch (eF) {
            Logger.log('Could not trash file from ad folder: ' + eF);
          }
        }
      }
    }
  } catch (cleanErr) {
    Logger.log('Error in syncAndCleanAdImages: ' + cleanErr);
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
  if (p === 'PRO_BOTH') p = 'PLATINUM';
  else if (p === 'PRO' || p === 'PRO_SERVICE' || p === 'PRO_ITEM' || p === 'SILVER') p = 'GOLD';

  var cfg = getPlansConfig().plans;
  var targetPlan = (cfg && cfg[p]) ? cfg[p] : (cfg ? cfg['FREE'] : null);
  if (!targetPlan) {
    targetPlan = getDefaultPlansConfig().plans[p] || getDefaultPlansConfig().plans['FREE'];
  }

  return {
    planName: targetPlan.planName,
    maxTimeSlots: targetPlan.slotsPerDay,
    maxTimeSlotsNum: targetPlan.slotsPerDay === 'unlimited' ? -1 : (Number(targetPlan.slotsPerDay) || 1),
    maxServiceAds: 1,
    maxPhotosPerAd: targetPlan.photosAllowed,
    calendarAvailabilityWindowDays: targetPlan.calendarDays === 7 ? '7_DAYS' : '30_DAYS',
    verifiedBadgeStatus: targetPlan.badge,
    searchRankingBoost: targetPlan.searchBoost,
    analyticsAccess: targetPlan.analytics,
    monthlyPriceLKR: targetPlan.monthlyPriceLKR,
    durationDays: targetPlan.calendarDays || 30
  };
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
      // Alternate alias checks
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
  // Deprecated in Prompt 25. All schema management is handled by setupDatabase() and migrateOldData().
}

function checkAndUpdateExpiredSubscriptions() {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName('Users');
    if (!sheet) return;

    var data = sheet.getDataRange().getValues();
    if (data.length <= 1) return;

    var hMap = getUserHeaderMap(sheet);
    var idxSubStatus = hMap.get('Subscription_Status', 10);
    var idxSubStart = hMap.get('Subscription_Start_Date', 11);
    var idxSubEnd = hMap.get('Subscription_End_Date', 12);
    var idxPlan = hMap.get('User_Plan', 9);
    var idxJoined = hMap.get('JoinedDate', 8);

    var now = Date.now();

    for (var i = 1; i < data.length; i++) {
      var row = data[i];
      if (!row || row.length === 0 || !row[0]) continue;

      var currentStatus = String(row[idxSubStatus] || 'ACTIVE').toUpperCase().trim();
      var subEnd = String(row[idxSubEnd] || '').trim();
      var subStart = String(row[idxSubStart] || row[idxJoined] || '').trim();
      var rawPlan = String(row[idxPlan] || 'FREE').toUpperCase().trim();
      var defaults = getPlanDefaults(rawPlan);

      if (!subEnd && subStart) {
        var startTs = new Date(subStart).getTime();
        if (!isNaN(startTs)) {
          subEnd = new Date(startTs + defaults.durationDays * 24 * 60 * 60 * 1000).toISOString();
          try {
            sheet.getRange(i + 1, idxSubEnd + 1).setValue(subEnd);
          } catch (e) {}
        }
      }

      if (subEnd) {
        var endTs = new Date(subEnd).getTime();
        if (!isNaN(endTs) && endTs <= now) {
          if (currentStatus !== 'EXPIRED') {
            try {
              sheet.getRange(i + 1, idxSubStatus + 1).setValue('EXPIRED');
            } catch (e) {}
          }
        }
      }
    }
  } catch (err) {
    Logger.log('checkAndUpdateExpiredSubscriptions error: ' + err.toString());
  }
}

function getUserSubscriptionLookup() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('Users');
  if (!sheet) {
    return {
      userMap: {},
      getUserMeta: function() { return null; },
      isUserExpired: function() { return false; }
    };
  }

  var data = sheet.getDataRange().getValues();
  if (data.length <= 1) {
    return {
      userMap: {},
      getUserMeta: function() { return null; },
      isUserExpired: function() { return false; }
    };
  }

  var hMap = getUserHeaderMap(sheet);
  var idxEmail = hMap.get('User_Email', 0);
  var idxUserId = hMap.get('User_ID', 1);
  var idxUid = hMap.get('UID', 2);
  var idxPlan = hMap.get('User_Plan', 9);
  var idxSubStatus = hMap.get('Subscription_Status', 10);
  var idxSubStart = hMap.get('Subscription_Start_Date', 11);
  var idxSubEnd = hMap.get('Subscription_End_Date', 12);
  var idxBadge = hMap.get('Verified_Badge_Status', 17);
  var idxBoost = hMap.get('Search_Ranking_Boost', 18);
  var idxAnalytics = hMap.get('Analytics_Access', 19);

  var map = {};
  var now = Date.now();

  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    if (!row || row.length === 0) continue;

    var email = String(row[idxEmail] || '').trim().toLowerCase();
    var userId = String(row[idxUserId] || '').trim().toUpperCase();
    var uid = String(row[idxUid] || '').trim().toLowerCase();

    if (!email && !userId && !uid) continue;

    var rawPlan = String(row[idxPlan] || 'FREE').toUpperCase().trim();
    var defaults = getPlanDefaults(rawPlan);
    var userPlan = defaults.planName;

    var subStat = String(row[idxSubStatus] || 'ACTIVE').toUpperCase().trim();
    var subStart = String(row[idxSubStart] || '').trim();
    var subEnd = String(row[idxSubEnd] || '').trim();

    if (!subEnd && subStart) {
      var startTs = new Date(subStart).getTime();
      if (!isNaN(startTs)) {
        subEnd = new Date(startTs + defaults.durationDays * 24 * 60 * 60 * 1000).toISOString();
      }
    }

    var isExpired = false;
    if (subStat === 'EXPIRED') {
      isExpired = true;
    } else if (subEnd) {
      var endTs = new Date(subEnd).getTime();
      if (!isNaN(endTs) && endTs <= now) {
        isExpired = true;
        subStat = 'EXPIRED';
        try {
          sheet.getRange(i + 1, idxSubStatus + 1).setValue('EXPIRED');
        } catch (e) {}
      }
    }

    var rawBadge = String(row[idxBadge] || '').trim().toUpperCase();
    var badge = rawBadge || defaults.verifiedBadgeStatus;
    if (!rawBadge || rawBadge === 'NO') {
      if (userPlan === 'PLATINUM') badge = 'PLATINUM';
      else if (userPlan === 'GOLD') badge = 'GOLD';
      else badge = 'NO';
    }

    var boost = String(row[idxBoost] || defaults.searchRankingBoost);
    var analytics = String(row[idxAnalytics] || defaults.analyticsAccess);

    var userMeta = {
      email: email,
      userId: userId,
      uid: uid,
      userPlan: userPlan,
      subscriptionStatus: subStat,
      subscriptionStartDate: subStart,
      subscriptionEndDate: subEnd,
      isExpired: isExpired,
      verifiedBadgeStatus: badge,
      searchRankingBoost: boost,
      analyticsAccess: analytics
    };

    if (email) map[email] = userMeta;
    if (userId) map[userId.toLowerCase()] = userMeta;
    if (uid) map[uid] = userMeta;
  }

  return {
    userMap: map,
    getUserMeta: function(email, userId, uid) {
      var e = String(email || '').trim().toLowerCase();
      var u = String(userId || '').trim().toLowerCase();
      var d = String(uid || '').trim().toLowerCase();
      if (e && map[e]) return map[e];
      if (u && map[u]) return map[u];
      if (d && map[d]) return map[d];
      return null;
    },
    isUserExpired: function(email, userId, uid) {
      var meta = this.getUserMeta(email, userId, uid);
      return meta ? meta.isExpired : false;
    }
  };
}

function getUsersSheet() {
  var sheet = getSheet('Users');
  if (!sheet) {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    sheet = ss.insertSheet('Users');
    sheet.appendRow(DATABASE_SCHEMAS.Users);
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function onEdit(e) {
  onEditTrigger(e);
}

function getUser(searchKey, callerEmail, callerUid) {
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

  var cleanCallerEmail = String(callerEmail || '').trim().toLowerCase();
  var cleanCallerUid = String(callerUid || '').trim().toLowerCase();

  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    if (!row || row.length === 0) continue;

    var emailCol = String(row[idxEmail] || '').trim().toLowerCase();
    var userIdCol = String(row[idxUserId] || '').trim().toUpperCase();
    var uidCol = String(row[idxUid] || '').trim().toLowerCase();

    if (emailCol === query || userIdCol.toLowerCase() === query || uidCol === query) {
      var rawPlan = String(row[idxUserPlan] || 'FREE').toUpperCase().trim();
      var defaults = getPlanDefaults(rawPlan);
      var userPlan = defaults.planName;

      var badgeStat = row[idxBadgeStatus] ? String(row[idxBadgeStatus]).toUpperCase() : defaults.verifiedBadgeStatus;
      var isVerified = badgeStat === 'GOLD' || badgeStat === 'PLATINUM' || badgeStat === 'YES' || badgeStat === 'TRUE';

      // Determine if caller is the verified owner of this profile
      var isAuthorizedCaller = Boolean(
        (cleanCallerEmail && cleanCallerEmail === emailCol) ||
        (cleanCallerUid && (cleanCallerUid === uidCol || cleanCallerUid === userIdCol.toLowerCase()))
      );

      // PUBLIC PROFILE SHAPE: returned for unauthenticated visitors or third parties
      if (!isAuthorizedCaller) {
        return {
          displayName: String(row[idxDisplayName] || ''),
          memberId: userIdCol,
          User_ID: userIdCol,
          city: String(row[idxCity] || ''),
          tradeTitle: String(row[idxTrade] || ''),
          yearsOfExperience: String(row[idxExp] || ''),
          experienceYears: String(row[idxExp] || ''),
          skills: String(row[idxSkills] || ''),
          bio: String(row[idxBio] || ''),
          profileImage: String(row[idxProfileImg] || ''),
          verifiedBadgeStatus: badgeStat,
          verifiedStatus: isVerified,
          userPlan: userPlan,
          subscriptionPlan: userPlan,
          isPublicProfile: true
        };
      }

      // FULL PRIVATE PROFILE: only returned when caller is the verified owner
      var maxTimeSlots = row[idxMaxTimeSlots] !== undefined && row[idxMaxTimeSlots] !== '' ? row[idxMaxTimeSlots] : defaults.maxTimeSlots;
      var maxServ = 1;
      var maxPhotos = row[idxMaxPhotosPerAd] !== undefined && row[idxMaxPhotosPerAd] !== '' ? Number(row[idxMaxPhotosPerAd]) || defaults.maxPhotosPerAd : defaults.maxPhotosPerAd;
      var calWindow = row[idxCalWindow] ? String(row[idxCalWindow]) : defaults.calendarAvailabilityWindowDays;
      var boostStat = row[idxRankingBoost] ? String(row[idxRankingBoost]).toUpperCase() : defaults.searchRankingBoost;
      var analyticsStat = row[idxAnalyticsAccess] ? String(row[idxAnalyticsAccess]).toUpperCase() : defaults.analyticsAccess;

      var subStartDate = String(row[idxSubStartDate] || row[idxJoinedDate] || '').trim();
      var subEndDate = String(row[idxSubEndDate] || '').trim();
      var subStatus = String(row[idxSubStatus] || 'ACTIVE').toUpperCase().trim();

      if (!subStartDate) {
        subStartDate = new Date().toISOString();
      }

      if (!subEndDate) {
        var startTs = new Date(subStartDate).getTime();
        if (isNaN(startTs)) startTs = Date.now();
        subEndDate = new Date(startTs + defaults.durationDays * 24 * 60 * 60 * 1000).toISOString();
      }

      // Check Expiration and auto-update sheet
      var endTs = new Date(subEndDate).getTime();
      if (!isNaN(endTs) && endTs <= Date.now()) {
        subStatus = 'EXPIRED';
        if (String(row[idxSubStatus] || '').toUpperCase().trim() !== 'EXPIRED') {
          try {
            sheet.getRange(i + 1, idxSubStatus + 1).setValue('EXPIRED');
          } catch (e) {}
        }
      }

      return {
        User_Email: emailCol,
        User_ID: userIdCol,
        uid: String(row[idxUid] || emailCol || userIdCol || ''),
        displayName: String(row[idxDisplayName] || ''),
        phone: String(row[idxPhone] || ''),
        whatsapp: String(row[idxWhatsApp] || row[idxPhone] || ''),
        status: String(row[idxStatus] || 'active'),
        joinedDate: String(row[idxJoinedDate] || ''),
        userPlan: userPlan,
        subscriptionStatus: subStatus,
        subscriptionStartDate: subStartDate,
        subscriptionEndDate: subEndDate,
        maxTimeSlots: maxTimeSlots,
        maxServiceAds: 1,
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
        // Aliases for compatibility
        email: emailCol,
        memberId: userIdCol,
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

  var userEmail = String(p.callerEmail || p.User_Email || p.email || p.userEmail || '').trim().toLowerCase();
  var rawUserId = String(p.User_ID || p.memberId || p.userId || '').trim().toUpperCase();
  var uid = String(p.callerUid || p.uid || p.UID || '').trim();

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

    if (userEmail) {
      if (rowEmail === userEmail || (!rowEmail && uid && rowUid === uid)) {
        rowIndex = i + 1;
        existingRow = r;
        break;
      }
    } else if ((uid && rowUid === uid) || (userId && rowUserId === userId)) {
      rowIndex = i + 1;
      existingRow = r;
      break;
    }
  }

  // Determine User Plan
  var existingPlan = existingRow ? String(existingRow[hMap.get('User_Plan', 9)] || 'FREE') : 'FREE';
  var rawPlan = String(p.userPlan || p.User_Plan || p.plan || p.subscriptionPlan || p.Subscription_Plan || existingPlan).toUpperCase().trim();
  var defaults = getPlanDefaults(rawPlan);
  var userPlan = defaults.planName;

  // Preserve Fundamental Data if Updating Existing User
  var finalEmail = userEmail || (existingRow ? String(existingRow[idxEmail] || '').toLowerCase() : '');
  var finalUserId = userId || (existingRow ? String(existingRow[idxUserId] || '') : '');
  var finalUid = uid || (existingRow ? String(existingRow[idxUid] || '') : '') || finalEmail || finalUserId;

  // DisplayName preservation
  var incomingName = String(p.displayName || p.DisplayName || '').trim();
  var existingName = existingRow ? String(existingRow[hMap.get('DisplayName', 3)] || '').trim() : '';
  var finalDisplayName = existingName;
  if (incomingName && incomingName !== 'User') {
    finalDisplayName = incomingName;
  } else if (!existingName || existingName === 'User') {
    finalDisplayName = incomingName || (finalEmail.indexOf('@') !== -1 ? finalEmail.split('@')[0] : 'User');
  }

  // Password: intentionally write empty string; passwords must never be stored in Google Sheets
  var finalPassword = '';

  // Phone & WhatsApp
  var finalPhone = String(p.phone || p.Phone || (existingRow ? existingRow[hMap.get('Phone', 5)] : '') || '').trim();
  var finalWhatsApp = String(p.whatsapp || p.WhatsApp || (existingRow ? existingRow[hMap.get('WhatsApp', 6)] : '') || finalPhone).trim();

  // Status
  var finalStatus = String(p.status || p.Status || (existingRow ? existingRow[hMap.get('Status', 7)] : '') || 'active').trim();

  // JoinedDate preservation: STRICTLY PRESERVE original JoinedDate if present!
  var existingJoinedDate = existingRow ? String(existingRow[hMap.get('JoinedDate', 8)] || '').trim() : '';
  var incomingJoinedDate = String(p.joinedDate || p.JoinedDate || '').trim();
  var finalJoinedDate = existingJoinedDate || incomingJoinedDate || new Date().toISOString();

  // Subscription Lifecycle Columns
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

  // Tier Limits & Features
  var finalMaxTimeSlots = p.maxTimeSlots !== undefined ? p.maxTimeSlots : (p.maxTimeSlotsPerDay !== undefined ? p.maxTimeSlotsPerDay : defaults.maxTimeSlots);
  var finalMaxServiceAds = 1;
  var finalMaxPhotosPerAd = p.maxPhotosPerAd !== undefined ? Number(p.maxPhotosPerAd) || defaults.maxPhotosPerAd : defaults.maxPhotosPerAd;
  var finalCalendarWindow = p.calendarAvailabilityWindowDays || defaults.calendarAvailabilityWindowDays;
  var finalBadgeStatus = p.verifiedBadgeStatus || defaults.verifiedBadgeStatus;
  var finalRankingBoost = p.searchRankingBoost || defaults.searchRankingBoost;
  var finalAnalyticsAccess = p.analyticsAccess || defaults.analyticsAccess;

  // ListingRefs
  var finalListingRefs = '[]';
  if (p.listingRefs !== undefined && p.listingRefs !== null) {
    finalListingRefs = Array.isArray(p.listingRefs) ? JSON.stringify(p.listingRefs) : String(p.listingRefs);
  } else if (existingRow && existingRow[hMap.get('ListingRefs', 20)]) {
    finalListingRefs = String(existingRow[hMap.get('ListingRefs', 20)]);
  }

  // Profile Information
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

  // Ensure header is updated
  if (data.length === 0 || data[0].length !== USER_HEADERS.length || data[0][9] !== 'User_Plan') {
    sheet.getRange(1, 1, 1, USER_HEADERS.length).setValues([USER_HEADERS]);
  }

  var rowData = [
    finalEmail,               // 1: User_Email
    finalUserId,              // 2: User_ID
    finalUid,                 // 3: UID
    finalDisplayName,         // 4: DisplayName
    finalPassword,            // 5: Password
    finalPhone,               // 6: Phone
    finalWhatsApp,            // 7: WhatsApp
    finalStatus,              // 8: Status
    finalJoinedDate,          // 9: JoinedDate
    userPlan,                 // 10: User_Plan
    finalSubStatus,           // 11: Subscription_Status
    finalSubStartDate,        // 12: Subscription_Start_Date
    finalSubEndDate,          // 13: Subscription_End_Date
    finalMaxTimeSlots,        // 14: Max_Time_Slots
    finalMaxServiceAds,       // 15: Max_Service_Ads
    finalMaxPhotosPerAd,      // 16: Max_Photos_Per_Ad
    finalCalendarWindow,      // 17: Calendar_Availability_Window_Days
    finalBadgeStatus,         // 18: Verified_Badge_Status
    finalRankingBoost,        // 19: Search_Ranking_Boost
    finalAnalyticsAccess,     // 20: Analytics_Access
    finalListingRefs,         // 21: ListingRefs
    finalAddress,             // 22: Address
    finalCity,                // 23: City
    finalNic,                 // 24: NIC_Passport
    finalEmgName,             // 25: Emergency_Contact_Name
    finalEmgPhone,            // 26: Emergency_Contact_Phone
    finalTrade,               // 27: Trade_Title
    finalExp,                 // 28: Years_Of_Experience
    finalSkills,              // 29: Skills
    finalBio,                 // 30: Bio
    finalProfileImg           // 31: Profile_Image
  ];

  if (rowIndex !== -1) {
    sheet.getRange(rowIndex, 1, 1, rowData.length).setValues([rowData]);
  } else {
    sheet.appendRow(rowData);
  }

  // If user plan was updated (e.g. downgraded from PLATINUM to GOLD/FREE), synchronize Max_Images_for_add across all user ads
  try {
    if (finalEmail || finalUserId) {
      var spSheet = getProvidersSheet();
      var spData = spSheet.getDataRange().getValues();
      if (spData.length > 1) {
        var spHeaders = spData[0].map(function(h) { return String(h || '').trim().toLowerCase(); });
        var spColMax = spHeaders.indexOf('max_images_for_add');
        if (spColMax === -1) {
          spColMax = 31; // Column 32
          spSheet.getRange(1, 32).setValue('Max_Images_for_add');
        }
        var isDowngradeToNonPlatinum = userPlan !== 'PLATINUM';
        for (var s = 1; s < spData.length; s++) {
          var spRowEmail = String(spData[s][0] || '').trim().toLowerCase();
          var spRowUserId = String(spData[s][1] || '').trim().toUpperCase();
          if ((finalEmail && spRowEmail === finalEmail) || (finalUserId && spRowUserId === finalUserId)) {
            var currentAdLimit = Number(spData[s][spColMax]) || 0;
            // On downgrade from PLATINUM, reset any extra slots back to the current plan max photos allowance
            if (isDowngradeToNonPlatinum || currentAdLimit < finalMaxPhotosPerAd) {
              spSheet.getRange(s + 1, spColMax + 1).setValue(finalMaxPhotosPerAd);
            }
          }
        }
      }
    }
  } catch (syncErr) {
    Logger.log('Error syncing provider ad photo limits on user plan update: ' + syncErr);
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
      maxServiceAds: 1,
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

/**
 * One-time cleanup function to blank out the Password column for all existing user rows in the Sheet.
 * Run once manually from the Google Apps Script editor.
 */
function clearStoredPasswords() {
  var sheet = getUsersSheet();
  var data = sheet.getDataRange().getValues();
  if (data.length <= 1) {
    Logger.log('clearStoredPasswords: No data rows found.');
    return { success: true, cleared: 0 };
  }
  var hMap = getUserHeaderMap(sheet);
  var idxPass = hMap.get('Password', 4);
  var count = 0;
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][idxPass] || '').trim() !== '') {
      sheet.getRange(i + 1, idxPass + 1).setValue('');
      count++;
    }
  }
  SpreadsheetApp.flush();
  Logger.log('clearStoredPasswords completed. Cleared: ' + count + ' row(s).');
  return { success: true, cleared: count };
}

function deleteUser(searchKey, emailParam, userIdParam) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheets = ss.getSheets();

  var email = String(emailParam || searchKey || '').trim().toLowerCase();
  var userId = String(userIdParam || searchKey || '').trim().toUpperCase();
  var rawKey = String(searchKey || '').trim().toLowerCase();

  var cleanEmail = email ? email.replace(/[^a-z0-9]/g, '_') : '';
  var deletedRowsTotal = 0;

  // 1. Delete matching rows across EVERY sheet in the spreadsheet
  for (var s = 0; s < sheets.length; s++) {
    var sheet = sheets[s];
    var data = sheet.getDataRange().getValues();
    if (data.length <= 1) continue;

    for (var i = data.length - 1; i >= 1; i--) {
      var row = data[i];
      if (!row) continue;

      var isRowMatch = false;

      for (var c = 0; c < row.length; c++) {
        var val = String(row[c] || '').trim().toLowerCase();
        if (!val) continue;

        if (email && val === email) { isRowMatch = true; break; }
        if (userId && val === userId.toLowerCase()) { isRowMatch = true; break; }
        if (rawKey && val === rawKey) { isRowMatch = true; break; }
      }

      if (isRowMatch) {
        sheet.deleteRow(i + 1);
        deletedRowsTotal++;
      }
    }
  }

  // 2. Delete full user image folder "eg: User_FMD1000_wmpdhananjaya_gmail_com" from Drive
  try {
    var rootFolders = DriveApp.getFoldersByName('FlashMyDeal_Uploads');
    if (rootFolders.hasNext()) {
      var rootFolder = rootFolders.next();
      var userFolders = rootFolder.getFolders();
      while (userFolders.hasNext()) {
        var uFolder = userFolders.next();
        var fName = uFolder.getName().toLowerCase();

        var isFolderMatch = false;
        if (userId && fName.indexOf(userId.toLowerCase()) >= 0) isFolderMatch = true;
        if (cleanEmail && fName.indexOf(cleanEmail) >= 0) isFolderMatch = true;
        if (email && fName.indexOf(email) >= 0) isFolderMatch = true;

        if (isFolderMatch) {
          uFolder.setTrashed(true);
        }
      }
    }
  } catch (eDrive) {
    Logger.log("Error trashing user drive folder: " + eDrive);
  }

  return { success: true, key: searchKey, deletedRows: deletedRowsTotal };
}

// ==========================================
// SEARCH RANKING & BOOST WEIGHTAGE SYSTEM
// ==========================================
function getBoostTierWeight(plan, boost) {
  var p = String(plan || '').trim().toUpperCase();
  var b = String(boost || '').trim().toUpperCase();
  if (p === 'PLATINUM' || p.indexOf('PLATINUM') !== -1 || p === 'PRO_BOTH' || b.indexOf('100%') !== -1 || b === '100' || b === '+100%' || b === 'HIGH') {
    return { weight: 100, multiplier: 2.0, tier: 'PLATINUM' };
  }
  if (p === 'GOLD' || p.indexOf('GOLD') !== -1 || p === 'PRO' || p.indexOf('PRO') !== -1 || p === 'PRO_SERVICE' || p === 'PRO_ITEM' || b.indexOf('20%') !== -1 || b === '20' || b === '+20%' || b.indexOf('50%') !== -1 || b === '50' || b === '+50%' || b === 'MEDIUM') {
    return { weight: 20, multiplier: 1.2, tier: 'GOLD' };
  }
  if (p === 'SILVER' || p.indexOf('SILVER') !== -1 || b.indexOf('25%') !== -1 || b === '25' || b === '+25%' || b === 'LOW') {
    return { weight: 20, multiplier: 1.2, tier: 'SILVER' };
  }
  return { weight: 0, multiplier: 1.0, tier: 'FREE' };
}

function sortItemsByBoostRank(items) {
  if (!items || !items.length) return items || [];
  return items.sort(function(a, b) {
    if (a.isExpired !== b.isExpired) {
      return a.isExpired ? 1 : -1;
    }
    var tierA = getBoostTierWeight(a.userPlan || a.User_Plan, a.searchRankingBoost || a.Search_Ranking_Boost);
    var tierB = getBoostTierWeight(b.userPlan || b.User_Plan, b.searchRankingBoost || b.Search_Ranking_Boost);

    if (tierA.weight !== tierB.weight) {
      return tierB.weight - tierA.weight; // High boost priority on top
    }

    var ratingA = Number(a.rating) || 3.0;
    var ratingB = Number(b.rating) || 3.0;
    var scoreA = tierA.multiplier * ratingA;
    var scoreB = tierB.multiplier * ratingB;

    if (Math.abs(scoreA - scoreB) > 0.0001) {
      return scoreB - scoreA;
    }

    if (ratingA !== ratingB) {
      return ratingB - ratingA;
    }

    var tsA = Number(a.timestamp) || new Date(a.createdAt || 0).getTime() || 0;
    var tsB = Number(b.timestamp) || new Date(b.createdAt || 0).getTime() || 0;
    return tsB - tsA;
  });
}


function deleteAdImageFolder(userId, email, type, adId, imageCellText) {
  try {
    // 1. Trash individual files extracted from image links
    if (imageCellText) {
      var fileIds = extractDriveFileIds(imageCellText);
      for (var f = 0; f < fileIds.length; f++) {
        try {
          var file = DriveApp.getFileById(fileIds[f]);
          if (file) file.setTrashed(true);
        } catch (eF) {}
      }
    }

    // 2. Locate root folder 'FlashMyDeal_Uploads'
    var rootFolders = DriveApp.getFoldersByName('FlashMyDeal_Uploads');
    if (!rootFolders.hasNext()) return;
    var rootFolder = rootFolders.next();

    var cleanEmail = String(email || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '_');
    var userIdStr = String(userId || '').trim().toLowerCase();
    var adIdStr = String(adId || '').trim();

    var targetAdFolderName = 'Ad_' + adIdStr;

    var userSubFolders = rootFolder.getFolders();
    while (userSubFolders.hasNext()) {
      var uFolder = userSubFolders.next();
      var uName = uFolder.getName().toLowerCase();
      var isUserFolder = (userIdStr && uName.indexOf(userIdStr) >= 0) || (cleanEmail && uName.indexOf(cleanEmail) >= 0);

      if (isUserFolder) {
        var subFolders = uFolder.getFolders();
        while (subFolders.hasNext()) {
          var sFolder = subFolders.next();
          var sName = sFolder.getName();

          if (sName === targetAdFolderName || (adIdStr && sName.indexOf(adIdStr) >= 0)) {
            sFolder.setTrashed(true);
          } else if (sName === 'Listings' || sName === 'ServiceProfile') {
            var nestedFs = sFolder.getFolders();
            while (nestedFs.hasNext()) {
              var nF = nestedFs.next();
              if (nF.getName() === targetAdFolderName || (adIdStr && nF.getName().indexOf(adIdStr) >= 0)) {
                nF.setTrashed(true);
              }
            }
          }
        }
      }
    }
  } catch (err) {
    Logger.log('Error in deleteAdImageFolder: ' + err);
  }
}

function deleteServiceProvider(id, userId, userEmail) {
  var sheet = getProvidersSheet();
  var data = sheet.getDataRange().getValues();
  var headers = data.length > 0 ? data[0].map(function(h) { return String(h || '').trim().toLowerCase(); }) : [];
  var idColIdx = headers.indexOf('id');
  if (idColIdx === -1) idColIdx = 2; // Column C is standard ID

  var queryId = String(id || '').trim();
  var queryUid = String(userId || '').trim().toLowerCase();
  var queryEmail = String(userEmail || '').trim().toLowerCase();

  var deleted = false;
  for (var i = data.length - 1; i >= 1; i--) {
    var row = data[i];
    if (!row) continue;
    var rowEmail = String(row[0] || '').trim().toLowerCase();
    var rowUid = String(row[1] || '').trim().toLowerCase();
    var rowId = String(row[idColIdx] || row[2] || '').trim();
    var imgCellText = String(row[28] || ''); // Images column (index 28)

    var isMatch = false;
    if (queryId) {
      isMatch = (rowId === queryId);
    } else {
      isMatch = (queryUid && rowUid === queryUid) || (queryEmail && rowEmail === queryEmail);
    }

    if (isMatch) {
      if (queryEmail && rowEmail && queryEmail !== rowEmail) {
        return { error: 'Unauthorized' };
      }
      deleteAdImageFolder(rowUid, rowEmail, 'ServiceProfile', rowId, imgCellText);
      sheet.deleteRow(i + 1);
      deleted = true;
      if (queryId) break;
    }
  }

  if (deleted) {
    return { success: true, id: id };
  }
  return { error: 'Service provider ad not found: ' + id };
}

// ==========================================
// TAB 3: SERVICE PROVIDERS (32 COLUMNS WITH DRAFT & MAX_IMAGES_FOR_ADD)
// ==========================================
function getProvidersSheet() {
  var sheet = getSheet('Providers');
  if (!sheet) {
    sheet = getSheet('ServiceProviders');
  }
  if (!sheet) {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    sheet = ss.insertSheet('Providers');
    sheet.appendRow(DATABASE_SCHEMAS.Providers);
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function getProvidersPrivateSheet() {
  var sheet = getSheet('Providers_Private');
  if (!sheet) {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    sheet = ss.insertSheet('Providers_Private');
    sheet.appendRow(DATABASE_SCHEMAS.Providers_Private);
    sheet.setFrozenRows(1);
  }
  return sheet;
}

/**
 * AUTO-MIGRATION ENGINE FOR SERVICE PROVIDERS
 * Ensures standard 32-column layout including Draft and Max_Images_for_add.
 */
function autoMigrateLegacyServiceProviders() {
  // Deprecated in Prompt 25. All schema management is handled by setupDatabase() and migrateOldData().
}

/**
 * PURCHASE EXTRA IMAGE SLOTS FOR A SPECIFIC SERVICE AD (PLATINUM USERS)
 */
function purchaseExtraImageSlots(adId, extraSlots, totalSlots, userEmail, userId) {
  var sheet = getProvidersSheet();
  var data = sheet.getDataRange().getValues();
  if (data.length <= 1) return { error: 'No providers found' };

  var query = String(adId || '').trim().toLowerCase();
  var cleanEmail = String(userEmail || '').trim().toLowerCase();
  var headers = data[0].map(function(h) { return String(h || '').trim().toLowerCase(); });
  var iMaxImages = headers.indexOf('max_images_for_add');
  if (iMaxImages === -1) {
    iMaxImages = 31;
    sheet.getRange(1, 32).setValue('Max_Images_for_add');
  }

  var targetIndex = -1;
  for (var i = 1; i < data.length; i++) {
    var rId = String(data[i][2] || '').trim().toLowerCase();
    if (rId && rId === query) {
      var rEmail = String(data[i][0] || '').trim().toLowerCase();
      if (cleanEmail && rEmail && cleanEmail !== rEmail) {
        return { error: 'Unauthorized' };
      }
      targetIndex = i + 1;
      break;
    }
  }

  var targetLimit = Number(totalSlots) || (targetIndex !== -1 ? (Number(data[targetIndex - 1][iMaxImages]) + Number(extraSlots)) : 0) || 12;

  if (targetIndex !== -1) {
    sheet.getRange(targetIndex, iMaxImages + 1).setValue(targetLimit);
    return { success: true, adId: adId, maxImagesForAdd: targetLimit };
  } else {
    return { success: true, adId: adId, maxImagesForAdd: targetLimit, note: 'Will be applied on ad creation' };
  }
}

/**
 * Update draft status for a service provider ad in real-time
 */
function updateServiceProviderDraftStatus(providerId, isDraft, userEmail, userId) {
  var sheet = getProvidersSheet();
  var data = sheet.getDataRange().getValues();
  if (data.length <= 1) return { error: 'No providers found' };

  var query = String(providerId || '').trim().toLowerCase();
  var cleanEmail = String(userEmail || '').trim().toLowerCase();
  var headers = data[0].map(function(h) { return String(h || '').trim().toLowerCase(); });
  var iDraft = headers.indexOf('draft');
  if (iDraft === -1) {
    iDraft = 30;
    sheet.getRange(1, 31).setValue('Draft');
  }

  var rowIndex = -1;
  for (var i = 1; i < data.length; i++) {
    var rId = String(data[i][2] || '').trim().toLowerCase();
    if (rId && rId === query) {
      var rEmail = String(data[i][0] || '').trim().toLowerCase();
      if (cleanEmail && rEmail && cleanEmail !== rEmail) {
        return { error: 'Unauthorized' };
      }
      rowIndex = i + 1;
      break;
    }
  }

  if (rowIndex === -1 && (userEmail || userId)) {
    for (var j = 1; j < data.length; j++) {
      var rEmail = String(data[j][0] || '').trim().toLowerCase();
      var rUserId = String(data[j][1] || '').trim().toLowerCase();
      if ((cleanEmail && rEmail === cleanEmail) || (!cleanEmail && userId && rUserId === userId.toLowerCase())) {
        rowIndex = j + 1;
        break;
      }
    }
  }

  var draftStr = (isDraft === true || String(isDraft).toUpperCase() === 'TRUE' || String(isDraft).toUpperCase() === 'DRAFT') ? 'TRUE' : 'FALSE';

  if (rowIndex !== -1) {
    sheet.getRange(rowIndex, iDraft + 1).setValue(draftStr);
    return { success: true, id: providerId, draft: draftStr === 'TRUE', isDraft: draftStr === 'TRUE' };
  }
  return { error: 'Provider ad not found: ' + providerId };
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

function getServiceProviders(params) {
  params = params || {};
  var sheet = getProvidersSheet();
  var data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];

  var lookup = getUserSubscriptionLookup();
  var includeExpired = params.includeExpired === 'true' || params.includeExpired === true;
  var filterUser = String(params.searchId || params.userId || params.email || params.memberId || params.providerId || '').trim().toLowerCase();

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
  var iDraft = getCol('draft', 30);
  var iMaxImages = getCol('max_images_for_add', 31);

  var providers = [];
  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    if (!row || (!row[iEmail] && !row[iId] && !row[0] && !row[2])) continue;

    var emailVal = String(row[iEmail] || row[0] || '').toLowerCase().trim();
    var userIdVal = String(row[iUserId] || row[1] || '').trim().toUpperCase();
    var idVal = String(row[iId] || row[2] || emailVal || '').trim();
    var bName = String(row[iName] || (iName !== 3 ? row[3] : '') || '');

    var isDraftVal = row[iDraft] === true || String(row[iDraft] || '').toUpperCase() === 'TRUE' || String(row[iDraft] || '').toUpperCase() === 'DRAFT';

    // If ad is draft, filter it out from public website searches unless includeDraft is true or user is viewing own ads
    if (isDraftVal && params.includeDraft !== 'true' && params.includeDraft !== true) {
      if (!filterUser || (filterUser !== emailVal && filterUser !== userIdVal.toLowerCase() && filterUser !== idVal.toLowerCase())) {
        continue;
      }
    }

    var meta = lookup.getUserMeta(emailVal, userIdVal);
    var userPlan = meta ? meta.userPlan : 'FREE';
    var badgeStat = meta ? meta.verifiedBadgeStatus : (userPlan === 'PLATINUM' ? 'PLATINUM' : (userPlan === 'GOLD' ? 'GOLD' : 'NO'));
    var boostStat = meta ? meta.searchRankingBoost : 'STANDARD';
    var subStat = meta ? meta.subscriptionStatus : 'ACTIVE';
    var subEnd = meta ? meta.subscriptionEndDate : '';
    var isExpired = meta ? meta.isExpired : false;

    // If subscription is expired, do not show ads on the public website unless specifically viewing own ads
    if (isExpired && !includeExpired) {
      if (!filterUser || (filterUser !== emailVal && filterUser !== userIdVal.toLowerCase() && filterUser !== idVal.toLowerCase())) {
        continue;
      }
    }

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

    var isVerif = badgeStat === 'PLATINUM' || badgeStat === 'GOLD' || row[iVerifStatus] === true || String(row[iVerifStatus]).toLowerCase() === 'true';

    var rawMaxPhotos = Number(row[iMaxImages]);
    var effectiveAdMaxPhotos = (!isNaN(rawMaxPhotos) && rawMaxPhotos > 0)
      ? rawMaxPhotos
      : (meta ? meta.maxPhotosPerAd : (userPlan === 'PLATINUM' ? 10 : (userPlan === 'GOLD' || userPlan === 'SILVER' ? 6 : 3)));

    var callerEmail = String(params.callerEmail || '').trim().toLowerCase();
    var isOwner = Boolean(callerEmail && callerEmail === emailVal);

    var providerObj = {
      User_ID: userIdVal,
      userId: userIdVal,
      memberId: userIdVal,
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
      verificationStatus: isVerif,
      verifiedDate: String(row[iVerifDate] || ''),
      rating: Number(row[iRating]) || 5.0,
      reviewCount: Number(row[iRevCount]) || 0,
      availability: row[iAvail] ? String(row[iAvail]) : '{}',
      customShifts: row[iShifts] ? String(row[iShifts]) : '[]',
      reviews: row[iReviews] ? String(row[iReviews]) : '[]',
      images: row[iImages] ? String(row[iImages]) : '[]',
      createdAt: String(row[iCreatedAt] || new Date().toISOString()),
      maxImagesForAdd: effectiveAdMaxPhotos,
      Max_Images_for_add: effectiveAdMaxPhotos,
      maxPhotosPerAd: effectiveAdMaxPhotos,

      // Subscription & Verified Badge details
      userPlan: userPlan,
      User_Plan: userPlan,
      verifiedBadgeStatus: badgeStat,
      Verified_Badge_Status: badgeStat,
      searchRankingBoost: boostStat,
      Search_Ranking_Boost: boostStat,
      subscriptionStatus: subStat,
      Subscription_Status: subStat,
      subscriptionEndDate: subEnd,
      Subscription_End_Date: subEnd,
      isExpired: isExpired,
      isDraft: isDraftVal,
      draft: isDraftVal,
      Draft: isDraftVal ? 'TRUE' : 'FALSE',
      DRAFT: isDraftVal ? 'TRUE' : 'FALSE'
    };

    // Private contact details: only included if the verified caller is the owner of this service ad
    if (isOwner) {
      var pPhone = String(row[iPhone] || '');
      var pWhatsApp = String(row[iWhatsapp] || '');
      if (!pPhone || !pWhatsApp) {
        try {
          var privS = getProvidersPrivateSheet();
          var prIdx = findRowBy(privS, 'User_ID', userIdVal);
          if (prIdx !== -1) {
            var prHdrs = getHeaders(privS);
            var prData = privS.getRange(prIdx, 1, 1, prHdrs.length).getValues()[0];
            var prObj = rowToObject(prData, prHdrs);
            if (!pPhone) pPhone = String(prObj['Contact_Phone'] || '');
            if (!pWhatsApp) pWhatsApp = String(prObj['Contact_WhatsApp'] || pPhone);
          }
        } catch (prvErr) {}
      }
      providerObj.phone = pPhone;
      providerObj.mobile = pPhone;
      providerObj.whatsapp = pWhatsApp;
      providerObj.contactPhone = pPhone;
      providerObj.contactWhatsApp = pWhatsApp;
      providerObj.User_Email = emailVal;
      providerObj.userEmail = emailVal;
      providerObj.email = emailVal;
    }

    providers.push(providerObj);
  }
  return sortItemsByBoostRank(providers);
}

function getServiceProvider(searchId, params) {
  if (!searchId) return null;
  params = params || {};
  if (params.includeExpired === undefined) {
    params.includeExpired = 'true';
  }
  var list = getServiceProviders(params);
  var query = String(searchId).trim().toLowerCase();

  for (var i = 0; i < list.length; i++) {
    var p = list[i];
    if (p.id.toLowerCase() === query || (p.User_ID && p.User_ID.toLowerCase() === query) || (p.User_Email && p.User_Email.toLowerCase() === query)) {
      return p;
    }
  }
  return null;
}

function saveServiceProvider(payload) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
  } catch (e) {
    return { error: 'Server busy. Please try again in a few seconds.' };
  }

  try {
    var sheet = getProvidersSheet();
    var data = sheet.getDataRange().getValues();
    var headers = data.length > 0 ? data[0].map(function(h) { return String(h || '').trim(); }) : [];
    var headersLower = headers.map(function(h) { return h.toLowerCase(); });

    var p = payload.provider || payload;
    var callerEmail = String(payload.callerEmail || p.callerEmail || '').trim().toLowerCase();

    var userEmail = String(callerEmail || p.User_Email || p.userEmail || p.email || payload.User_Email || payload.userEmail || payload.email || '').trim().toLowerCase();
    var rawUserId = String(p.User_ID || p.memberId || p.userId || payload.User_ID || payload.memberId || payload.userId || '').trim().toUpperCase();
    var userId = getOrGenerateUserId(userEmail, rawUserId);
    
    var rawId = String(p.id || p.ID || payload.id || payload.ID || '').trim();
    var businessNameVal = String(p.businessName || p.BusinessName || p.name || p.FullName || p.fullName || p.displayName || p.DisplayName || '').trim();

    var idColIdx = headersLower.indexOf('id');
    if (idColIdx === -1) idColIdx = 2; // Column C is standard ID

    // Check if user already owns an ad
    var existingRowIndex = -1;
    var existingAdId = '';

    for (var i = 1; i < data.length; i++) {
      var row = data[i];
      var rEmail = String(row[0] || '').trim().toLowerCase();
      var rUserId = String(row[1] || '').trim().toUpperCase();
      var rId = String(row[idColIdx] || row[2] || '').trim();

      var isOwnerMatch = (userEmail && rEmail === userEmail) || (userId && rUserId === userId);
      var isIdMatch = (rawId && rId === rawId);

      if (isOwnerMatch || isIdMatch) {
        if (callerEmail && rEmail && callerEmail !== rEmail) {
          return { error: 'Unauthorized' };
        }
        if (existingRowIndex === -1) {
          existingRowIndex = i + 1;
          existingAdId = rId;
        }
      }
    }

    // Reject any attempt to create a second ad with ONE_AD_LIMIT
    if (existingRowIndex !== -1 && rawId && existingAdId && rawId !== existingAdId) {
      return { error: 'ONE_AD_LIMIT', message: 'You already have an active service profile. Each account is limited to 1 service ad.' };
    }

    // Always update existing row if user has an ad
    var rowIndex = existingRowIndex;
    var id = '';

    if (rowIndex !== -1) {
      id = existingAdId || rawId || ('ad_' + Date.now());
    } else {
      if (rawId && (rawId.startsWith('ad_') || rawId.startsWith('sp_') || (!rawId.startsWith('FMD') && rawId !== userId && rawId !== userEmail))) {
        id = rawId;
      } else {
        id = 'ad_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
      }
    }

    var iImages = headersLower.indexOf('images');
    if (iImages === -1) iImages = 28;
    var previousImagesText = (rowIndex !== -1 && data.length >= rowIndex) ? String(data[rowIndex - 1][iImages] || '') : '';
    var removedImagesInput = p.removedImages || payload.removedImages || [];

    var iMaxImages = headersLower.indexOf('max_images_for_add');
    if (iMaxImages === -1) iMaxImages = 31;
    var existingMaxImages = (rowIndex !== -1 && data.length >= rowIndex) ? Number(data[rowIndex - 1][iMaxImages]) : 0;

    var userPlanMaxPhotos = 3;
    var userPlanName = 'FREE';
    try {
      var uMeta = getUser(userEmail || userId, userEmail);
      if (uMeta && !uMeta.error) {
        userPlanName = uMeta.userPlan || 'FREE';
        userPlanMaxPhotos = Number(uMeta.maxPhotosPerAd) || (userPlanName === 'PLATINUM' ? 10 : (userPlanName === 'GOLD' ? 6 : 3));
      }
    } catch (uErr) {}

    var rawMaxImagesVal = Number(p.maxImagesForAdd || p.Max_Images_for_add || payload.maxImagesForAdd || payload.Max_Images_for_add) || 0;
    var finalMaxImagesVal = userPlanMaxPhotos;
    if (userPlanName === 'PLATINUM') {
      finalMaxImagesVal = Math.max(userPlanMaxPhotos, existingMaxImages || 0, rawMaxImagesVal || 0);
    }

    var incomingImages = p.images;
    if (Array.isArray(incomingImages) && incomingImages.length > finalMaxImagesVal) {
      incomingImages = incomingImages.slice(0, finalMaxImagesVal);
    }

    var processedImages = incomingImages ? processImagePayload(incomingImages, {
      userId: userId,
      email: userEmail,
      type: 'ServiceProfile',
      adId: id
    }) : '[]';

    // Synchronize and clean Drive images: delete removed images, clean folder if empty
    syncAndCleanAdImages({
      userId: userId,
      email: userEmail,
      type: 'ServiceProfile',
      adId: id,
      previousImagesText: previousImagesText,
      processedImagesText: processedImages,
      explicitRemoved: removedImagesInput
    });

    var availabilityStr = typeof p.availability === 'object' ? JSON.stringify(p.availability) : (p.availability || '{}');
    var customShiftsStr = typeof p.customShifts === 'object' ? JSON.stringify(p.customShifts) : (p.customShifts || '[]');
    var reviewsStr = typeof p.reviews === 'object' ? JSON.stringify(p.reviews) : (p.reviews || '[]');
    var shopDaysStr = typeof p.shopOpenDays === 'object' ? JSON.stringify(p.shopOpenDays) : (p.shopOpenDays || '[]');

    var latVal = p.latitude !== undefined && p.latitude !== null && !isNaN(Number(p.latitude)) ? Number(p.latitude) : 6.9271;
    var lngVal = p.longitude !== undefined && p.longitude !== null && !isNaN(Number(p.longitude)) ? Number(p.longitude) : 79.8612;
    var locVal = String(p.location || p.address || (latVal + ', ' + lngVal)).trim();
    var phoneVal = String(p.mobile || p.phone || p.whatsapp || p.Phone || p.Mobile || '').trim();
    var whatsappVal = String(p.whatsapp || p.mobile || p.phone || p.Whatsapp || p.WhatsApp || phoneVal).trim();

    // 1. Write Public Ad Record to Providers Sheet (No private contacts)
    var pubRecord = {
      'User_ID': userId,
      'User_Email': userEmail,
      'Ad_ID': id,
      'Business_Name': businessNameVal,
      'Category': p.category || 'General Services',
      'Sub_Skills': p.subSkills || p.Sub_Skills || p.subCategory || (Array.isArray(p.skills) ? p.skills.join(', ') : (p.skills || '')),
      'Tagline': p.tagline || '',
      'Bio': p.bio || '',
      'Years_Experience': Number(p.yearsExperience) || 1,
      'Languages': p.language || p.SpokenLanguage || 'English',
      'Service_Districts': p.serviceDistricts || p.Service_Districts || locVal,
      'Service_Radius_Km': Number(p.serviceRadiusKm || p.Service_Radius_Km) || 15,
      'Address_Area': String(p.addressArea || p.Address_Area || p.city || locVal).trim(),
      'Latitude': latVal,
      'Longitude': lngVal,
      'Is_Shop': p.isShop === true || String(p.isShop).toLowerCase() === 'true',
      'Open_Days': shopDaysStr,
      'Open_Time': formatHHMM(p.shopOpeningTime, '08:00'),
      'Close_Time': formatHHMM(p.shopClosingTime, '20:00'),
      'Rate_Type': p.rateType || p.Rate_Type || (Number(p.hourlyRate) > 0 ? 'hourly' : 'per_job'),
      'Rate_From_LKR': Number(p.rateFrom || p.Rate_From_LKR || p.hourlyRate) || 0,
      'Rate_To_LKR': Number(p.rateTo || p.Rate_To_LKR) || 0,
      'Profile_Photo': (Array.isArray(p.images) && p.images[0]) ? p.images[0] : '',
      'Gallery_Images': processedImages,
      'Hidden_Images': '[]',
      'Availability': availabilityStr,
      'Custom_Shifts': customShiftsStr,
      'Status': (p.isDraft === true || p.draft === true || String(p.isDraft || p.draft || p.DRAFT || p.Draft || '').toUpperCase() === 'TRUE') ? 'draft' : 'live',
      'Verified_Badge': p.verifiedBadgeStatus || (p.verificationStatus ? 'GOLD' : 'NONE'),
      'Rating': Number(p.rating) || 5.0,
      'Review_Count': Number(p.reviewCount) || 0,
      'Created_At': p.createdAt || new Date().toISOString(),
      'Updated_At': new Date().toISOString(),
      // Legacy compatibility keys if sheet still uses older columns
      'user_email': userEmail,
      'user_id': userId,
      'id': id,
      'businessname': businessNameVal,
      'phone': phoneVal,
      'whatsapp': whatsappVal,
      'images': processedImages,
      'draft': (p.isDraft === true || p.draft === true || String(p.isDraft || p.draft || p.DRAFT || p.Draft || '').toUpperCase() === 'TRUE') ? 'TRUE' : 'FALSE',
      'max_images_for_add': finalMaxImagesVal
    };

    var rowData = objectToRow(pubRecord, headers);
    if (rowIndex !== -1) {
      sheet.getRange(rowIndex, 1, 1, rowData.length).setValues([rowData]);
    } else {
      sheet.appendRow(rowData);
    }

    // 2. Write Private Contact Information to Providers_Private Sheet
    try {
      var privSheet = getProvidersPrivateSheet();
      var privHeaders = getHeaders(privSheet);
      var existingPrivRow = findRowBy(privSheet, 'User_ID', userId);

      var privRecord = {
        'User_ID': userId,
        'Contact_Phone': phoneVal,
        'Contact_WhatsApp': whatsappVal,
        'Contact_Email': userEmail,
        'Full_Legal_Name': String(p.fullName || p.Full_Legal_Name || businessNameVal).trim(),
        'Home_Address': String(p.homeAddress || p.Home_Address || p.address || locVal).trim(),
        'NIC_Number': String(p.nicNumber || p.NIC_Number || p.nicPassport || '').trim(),
        'NVQ_Level': String(p.nvqLevel || p.NVQ_Level || '').trim(),
        'Certificates': typeof p.certificates === 'object' ? JSON.stringify(p.certificates) : String(p.certificates || '[]'),
        'Emergency_Contact_Name': String(p.emergencyContactName || p.Emergency_Contact_Name || '').trim(),
        'Emergency_Contact_Phone': String(p.emergencyContactPhone || p.Emergency_Contact_Phone || '').trim(),
        'Admin_Verification_Status': p.verificationStatus ? 'approved' : 'not_submitted',
        'Admin_Verified_Date': p.verifiedDate || ''
      };

      var privRowValues = objectToRow(privRecord, privHeaders);
      if (existingPrivRow !== -1) {
        privSheet.getRange(existingPrivRow, 1, 1, privRowValues.length).setValues([privRowValues]);
      } else {
        privSheet.appendRow(privRowValues);
      }
    } catch (privErr) {
      Logger.log('Providers_Private save error: ' + privErr);
    }

    try {
      saveAnalytics({
        userEmail: userEmail,
        userId: userId,
        entityId: id,
        entityType: 'service_provider',
        logDate: new Date().toISOString().split('T')[0],
        dailyAdViews: 1,
        dailyPhoneReveals: 0,
        dailyWhatsAppClicks: 0,
        dailySocialShares: 0,
        dailyBookingRequests: 0,
        dailyConfirmedBookings: 0,
        dailyConversionRate: '0.0%',
        lastUpdatedTimestamp: new Date().toISOString()
      });
    } catch (e) {}

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
  } finally {
    lock.releaseLock();
  }
}

function updateAvailability(providerId, availability, callerEmail) {
  var sheet = getProvidersSheet();
  var data = sheet.getDataRange().getValues();
  var query = String(providerId || '').trim().toLowerCase();
  var cleanCaller = String(callerEmail || '').trim().toLowerCase();
  
  var rowIndex = -1;
  for (var i = 1; i < data.length; i++) {
    var rEmail = String(data[i][0] || '').trim().toLowerCase();
    var rUserId = String(data[i][1] || '').trim().toLowerCase();
    var rId = String(data[i][2] || '').trim().toLowerCase();

    if (rId === query || rEmail === query || rUserId === query) {
      if (cleanCaller && rEmail && cleanCaller !== rEmail) {
        return { success: false, error: 'Unauthorized' };
      }
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
// TAB 4: BOOKINGS (APPOINTMENT REQUESTS - 16 COLUMNS)
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
    // Check if column 16 or 17 headers are missing and update if needed
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

function getBookings(searchKey, callerEmail, callerUid) {
  var cEmail = String(callerEmail || '').trim().toLowerCase();
  var cUid = String(callerUid || '').trim().toLowerCase();

  // If no caller is provided, return [] immediately. Unauthenticated requests cannot read bookings.
  if (!cEmail && !cUid) {
    return [];
  }

  var sheet = getBookingsSheet();
  var data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];

  var rawQuery = String(searchKey || '').trim();
  var query = rawQuery.toLowerCase();
  var list = [];

  // Collect any alternative user IDs or ad IDs linked to caller
  var callerEmails = [cEmail].filter(Boolean);
  var callerUserIds = [cUid].filter(Boolean);
  var callerAdIds = [];

  try {
    var spSheet = getProvidersSheet();
    var spData = spSheet.getDataRange().getValues();
    for (var s = 1; s < spData.length; s++) {
      var spRow = spData[s];
      if (!spRow) continue;
      var rEmail = String(spRow[0] || '').trim().toLowerCase();
      var rUid = String(spRow[1] || '').trim().toLowerCase();
      var rId = String(spRow[2] || '').trim().toLowerCase();
      var rMemberId = String(spRow[14] || '').trim().toLowerCase();

      var isCallerProvider = (cEmail && rEmail === cEmail) || (cUid && (rUid === cUid || rMemberId === cUid));
      if (isCallerProvider) {
        if (rEmail && callerEmails.indexOf(rEmail) === -1) callerEmails.push(rEmail);
        if (rUid && callerUserIds.indexOf(rUid) === -1) callerUserIds.push(rUid);
        if (rMemberId && callerUserIds.indexOf(rMemberId) === -1) callerUserIds.push(rMemberId);
        if (rId && callerAdIds.indexOf(rId) === -1) callerAdIds.push(rId);
      }
    }
  } catch (eSP) {}

  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    if (!row || !row[2]) continue;

    var provEmail = String(row[0] || '').trim().toLowerCase();
    var provUserId = String(row[1] || '').trim().toLowerCase();
    var bookingId = String(row[2] || '').trim().toLowerCase();
    var custUserId = String(row[13] || '').trim().toLowerCase();
    var visitorEmail = String(row[14] || '').trim().toLowerCase();
    var rowAdId = String(row[16] || '').trim().toLowerCase();

    // Verify caller ownership: caller MUST be either the provider or the customer
    var isProviderCaller = (provEmail && callerEmails.indexOf(provEmail) >= 0) ||
                           (provUserId && callerUserIds.indexOf(provUserId) >= 0) ||
                           (rowAdId && callerAdIds.indexOf(rowAdId) >= 0);
    var isCustomerCaller = (visitorEmail && callerEmails.indexOf(visitorEmail) >= 0) ||
                           (custUserId && callerUserIds.indexOf(custUserId) >= 0);

    if (!isProviderCaller && !isCustomerCaller) {
      continue;
    }

    // If a specific searchKey was provided, further filter within caller's owned bookings
    if (query && query !== cEmail && query !== cUid) {
      var matchesSearch = (bookingId === query) ||
                          (rowAdId === query) ||
                          (provUserId === query) ||
                          (provEmail === query) ||
                          (custUserId === query) ||
                          (visitorEmail === query);
      if (!matchesSearch) {
        continue;
      }
    }

    var rawBookingImages = String(row[15] || '').trim();
    var parsedImages = [];
    if (rawBookingImages) {
      try {
        var parsed = JSON.parse(rawBookingImages);
        if (Array.isArray(parsed)) {
          parsedImages = parsed;
        } else if (typeof parsed === 'string') {
          parsedImages = [parsed];
        }
      } catch (e) {
        parsedImages = rawBookingImages.split(',').map(function(s) { return s.trim(); }).filter(Boolean);
      }
    }

    var extractedAdId = String(row[16] || '').trim();
    var bStatus = String(row[11] || 'pending').toLowerCase();
    var revPhone = '';
    var revWhatsApp = '';
    var revEmail = '';

    if (bStatus === 'confirmed') {
      try {
        var privSheet = getProvidersPrivateSheet();
        var privRowIdx = findRowBy(privSheet, 'User_ID', String(row[1] || ''));
        if (privRowIdx !== -1) {
          var privHeaders = getHeaders(privSheet);
          var privRowData = privSheet.getRange(privRowIdx, 1, 1, privHeaders.length).getValues()[0];
          var privObj = rowToObject(privRowData, privHeaders);
          revPhone = String(privObj['Contact_Phone'] || '').trim();
          revWhatsApp = String(privObj['Contact_WhatsApp'] || revPhone).trim();
          revEmail = String(privObj['Contact_Email'] || provEmail).trim();
        }
      } catch (prvE) {}
    }

    list.push({
      User_Email: provEmail,
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
      VisitorEmail: visitorEmail,
      bookingImages: parsedImages,
      bookingImagesRaw: rawBookingImages,
      'ad ID': extractedAdId,
      adId: extractedAdId,
      advertisementId: extractedAdId,

      // Revealed contact details on confirmed booking (Prompt 25 & 28)
      revealedProviderPhone: revPhone,
      revealedProviderWhatsApp: revWhatsApp,
      revealedProviderEmail: revEmail,

      // Client compatibility aliases
      providerId: extractedAdId || String(row[1] || row[0] || ''),
      providerEmail: provEmail,
      providerUserId: String(row[1] || ''),
      customerUserId: String(row[13] || ''),
      visitorEmail: visitorEmail
    });
  }
  return list;
}

/**
 * Public action for calendar availability: returns ONLY { date, slot } pairs without personal data.
 */
function getBookedSlots(adId, fromDate, toDate) {
  var targetId = String(adId || '').trim().toLowerCase();
  if (!targetId) return [];

  var sheet = getBookingsSheet();
  var data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];

  var matchedAdIds = [targetId];
  var matchedEmails = [targetId];
  var matchedUserIds = [targetId];

  try {
    var spSheet = getProvidersSheet();
    var spData = spSheet.getDataRange().getValues();
    for (var s = 1; s < spData.length; s++) {
      var spRow = spData[s];
      if (!spRow) continue;
      var rEmail = String(spRow[0] || '').trim().toLowerCase();
      var rUid = String(spRow[1] || '').trim().toLowerCase();
      var rId = String(spRow[2] || '').trim().toLowerCase();
      var rMemberId = String(spRow[14] || '').trim().toLowerCase();

      if (targetId === rId || targetId === rUid || targetId === rEmail || targetId === rMemberId) {
        if (rEmail && matchedEmails.indexOf(rEmail) === -1) matchedEmails.push(rEmail);
        if (rUid && matchedUserIds.indexOf(rUid) === -1) matchedUserIds.push(rUid);
        if (rMemberId && matchedUserIds.indexOf(rMemberId) === -1) matchedUserIds.push(rMemberId);
        if (rId && matchedAdIds.indexOf(rId) === -1) matchedAdIds.push(rId);
      }
    }
  } catch (eSP) {}

  var cleanFrom = fromDate ? String(fromDate).trim() : '';
  var cleanTo = toDate ? String(toDate).trim() : '';
  var bookedSlots = [];

  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    if (!row || !row[2]) continue;

    var provEmail = String(row[0] || '').trim().toLowerCase();
    var provUserId = String(row[1] || '').trim().toLowerCase();
    var rowAdId = String(row[16] || '').trim().toLowerCase();
    var status = String(row[11] || 'pending').trim().toLowerCase();

    // Only count active/confirmed bookings
    if (status === 'cancelled' || status === 'cancelled_by_customer' || status === 'cancelled_by_provider' || status === 'declined' || status === 'deleted') {
      continue;
    }

    var isMatch = (rowAdId && matchedAdIds.indexOf(rowAdId) >= 0) ||
                  (provEmail && matchedEmails.indexOf(provEmail) >= 0) ||
                  (provUserId && matchedUserIds.indexOf(provUserId) >= 0);

    if (!isMatch) continue;

    var rawDate = String(row[8] || '').trim();
    var slot = String(row[9] || '').trim();
    if (!rawDate || !slot) continue;

    // Normalize date to YYYY-MM-DD
    var dateStr = rawDate;
    if (rawDate.indexOf('T') !== -1) {
      dateStr = rawDate.split('T')[0];
    } else if (rawDate.indexOf('/') !== -1) {
      var parts = rawDate.split('/');
      if (parts.length === 3) {
        if (parts[0].length === 4) {
          dateStr = parts[0] + '-' + ('0' + parts[1]).slice(-2) + '-' + ('0' + parts[2]).slice(-2);
        } else if (parts[2].length === 4) {
          dateStr = parts[2] + '-' + ('0' + parts[1]).slice(-2) + '-' + ('0' + parts[0]).slice(-2);
        }
      }
    }

    if (cleanFrom && dateStr < cleanFrom) continue;
    if (cleanTo && dateStr > cleanTo) continue;

    bookedSlots.push({
      date: dateStr,
      slot: slot
    });
  }

  return bookedSlots;
}

function createBooking(b) {
  if (!b) return { error: 'Invalid booking payload' };
  
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
  } catch (lockErr) {
    return { error: 'SERVER_BUSY', message: 'Server is busy processing other bookings. Please try again.' };
  }

  try {
    var sheet = getBookingsSheet();
    var bData = sheet.getDataRange().getValues();
    var bHeaders = getHeaders(sheet);
    var bHMap = getHeaderIndexMap(bHeaders);

    var bookingDate = String(b.date || b.Date || b.Booking_Date || '').trim();
    var bookingSlot = String(b.slot || b.Slot || b.Time_Slot || '').trim();
    var adId = String(b['ad ID'] || b['Ad ID'] || b['Ad_ID'] || b['ad_id'] || b.adId || b.AdId || b.advertisementId || b.providerId || '').trim();
    var provEmail = String(b.User_Email || b.providerEmail || b.userEmail || b.UserEmail || b.Provider_Email || '').trim().toLowerCase();
    var visitorEmail = String(b.VisitorEmail || b.visitorEmail || b.Customer_Email || '').trim().toLowerCase();

    // Prevent booking own service ad
    if (visitorEmail && provEmail && visitorEmail === provEmail) {
      return { error: 'SELF_BOOKING_NOT_ALLOWED', message: 'You cannot book your own service listing.' };
    }

    // Fallback lookup in Providers / ServiceProviders sheet if provEmail was not passed
    if (!provEmail && adId) {
      try {
        var spSheet = getProvidersSheet();
        var spData = spSheet.getDataRange().getValues();
        var spHeaders = getHeaders(spSheet);
        var spHMap = getHeaderIndexMap(spHeaders);
        var targetId = adId.toLowerCase();
        for (var s = 1; s < spData.length; s++) {
          var spRow = spData[s];
          if (!spRow) continue;
          var rEmail = String(spRow[spHMap['user_email'] !== undefined ? spHMap['user_email'] : 1] || '').trim().toLowerCase();
          var rUid = String(spRow[spHMap['user_id'] !== undefined ? spHMap['user_id'] : 0] || '').trim().toLowerCase();
          var rId = String(spRow[spHMap['ad_id'] !== undefined ? spHMap['ad_id'] : 2] || '').trim().toLowerCase();
          if (targetId === rId || targetId === rUid || targetId === rEmail) {
            if (rEmail) {
              provEmail = rEmail;
              if (visitorEmail && visitorEmail === provEmail) {
                return { error: 'SELF_BOOKING_NOT_ALLOWED', message: 'You cannot book your own service listing.' };
              }
              break;
            }
          }
        }
      } catch (eLook) {}
    }

    // Slot check: Prevent double booking of same date & slot for this ad / provider
    function normSlot(s) {
      return String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    }

    var targetNormSlot = normSlot(bookingSlot);
    var targetDateNorm = bookingDate;
    if (targetDateNorm.indexOf('T') !== -1) targetDateNorm = targetDateNorm.split('T')[0];

    // Check against existing pending / confirmed bookings
    var colDateIdx = bHMap['booking_date'] !== undefined ? bHMap['booking_date'] : (bHMap['date'] !== undefined ? bHMap['date'] : 8);
    var colSlotIdx = bHMap['time_slot'] !== undefined ? bHMap['time_slot'] : (bHMap['slot'] !== undefined ? bHMap['slot'] : 9);
    var colStatusIdx = bHMap['status'] !== undefined ? bHMap['status'] : 11;
    var colAdIdIdx = bHMap['ad_id'] !== undefined ? bHMap['ad_id'] : (bHMap['ad id'] !== undefined ? bHMap['ad id'] : 16);
    var colProvEmailIdx = bHMap['provider_email'] !== undefined ? bHMap['provider_email'] : (bHMap['user_email'] !== undefined ? bHMap['user_email'] : 0);

    for (var i = 1; i < bData.length; i++) {
      var row = bData[i];
      if (!row || row.length === 0) continue;
      var rStatus = String(row[colStatusIdx] || '').trim().toLowerCase();
      // Only active slots (pending or confirmed) block double booking
      if (rStatus === 'pending' || rStatus === 'confirmed') {
        var rAdId = String(row[colAdIdIdx] || '').trim().toLowerCase();
        var rProvEmail = String(row[colProvEmailIdx] || '').trim().toLowerCase();
        var rDate = String(row[colDateIdx] || '').trim();
        if (rDate.indexOf('T') !== -1) rDate = rDate.split('T')[0];
        var rSlot = normSlot(row[colSlotIdx]);

        var matchesProvider = (adId && rAdId && rAdId === adId.toLowerCase()) || (provEmail && rProvEmail && rProvEmail === provEmail);
        if (matchesProvider && rDate === targetDateNorm && rSlot === targetNormSlot) {
          return { error: 'SLOT_TAKEN', message: 'This slot was just booked by another customer. Please choose another time.' };
        }
      }
    }

    var bookingId = b.id || ('bk_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7));
    var createdAt = b.createdAt || new Date().toISOString();

    var rawProvUserId = String(b.User_ID || b.providerUserId || b.providerId || b.userId || '').trim().toUpperCase();
    var provUserId = getOrGenerateUserId(provEmail, rawProvUserId);

    var rawCustUserId = String(b.Customer_User_ID || b.customerUserId || '').trim().toUpperCase();
    var custUserId = visitorEmail ? getOrGenerateUserId(visitorEmail, rawCustUserId) : rawCustUserId;

    // Process customer photos (max 2 images)
    var rawBookingImgs = b.bookingImages || b.booking_images || b.images || b['booking Images'] || [];
    var savedImageUrls = [];
    if (typeof rawBookingImgs === 'string') {
      try {
        rawBookingImgs = JSON.parse(rawBookingImgs);
      } catch (e) {
        if (rawBookingImgs.indexOf('data:image') >= 0 || rawBookingImgs.indexOf('http') >= 0) {
          rawBookingImgs = [rawBookingImgs];
        } else {
          rawBookingImgs = [];
        }
      }
    }

    if (Array.isArray(rawBookingImgs) && rawBookingImgs.length > 0) {
      var imagesToProcess = rawBookingImgs.slice(0, 2);
      try {
        var rootFolder = getOrCreateFolder('FlashMyDeal_Uploads');
        var bookingsParentFolder = getOrCreateSubFolder(rootFolder, 'Bookings');
        var cleanVisitorName = String(b.visitorName || b.VisitorName || 'Customer').trim().replace(/[^a-zA-Z0-9]/g, '_');
        var bookingFolderName = 'Booking_' + bookingId + (cleanVisitorName ? ('_' + cleanVisitorName) : '');
        var bookingFolder = getOrCreateSubFolder(bookingsParentFolder, bookingFolderName);

        for (var imgIdx = 0; imgIdx < imagesToProcess.length; imgIdx++) {
          var imgItem = imagesToProcess[imgIdx];
          var dataStr = (typeof imgItem === 'string') ? imgItem : (imgItem.data || imgItem.url || imgItem.src || imgItem.preview || '');
          var fileName = 'booking_photo_' + (imgIdx + 1) + '_' + Date.now() + '.jpg';
          if (imgItem && imgItem.name) fileName = imgItem.name;

          if (!dataStr) continue;
          if (dataStr.startsWith('http://') || dataStr.startsWith('https://')) {
            savedImageUrls.push(dataStr);
          } else if (dataStr.startsWith('data:image/') || dataStr.indexOf(';base64,') >= 0) {
            var base64Parts = dataStr.split(',');
            var contentType = 'image/jpeg';
            if (base64Parts[0] && base64Parts[0].indexOf(':') !== -1 && base64Parts[0].indexOf(';') !== -1) {
              contentType = base64Parts[0].substring(base64Parts[0].indexOf(':') + 1, base64Parts[0].indexOf(';')) || 'image/jpeg';
            }
            var decodedData = Utilities.base64Decode(base64Parts[1]);
            var blob = Utilities.newBlob(decodedData, contentType, fileName);
            var file = bookingFolder.createFile(blob);
            file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
            var fileId = file.getId();
            var displayUrl = 'https://lh3.googleusercontent.com/d/' + fileId;
            savedImageUrls.push(displayUrl);
          }
        }
      } catch (eImg) {
        Logger.log('Error saving customer booking images to Drive: ' + eImg);
      }
    }

    var bookingImagesStr = savedImageUrls.length > 0 ? JSON.stringify(savedImageUrls) : '';

    // Standardized row object
    var bookingObj = {
      Booking_ID: bookingId,
      Ad_ID: adId,
      Provider_User_ID: provUserId,
      Provider_Email: provEmail,
      Customer_User_ID: custUserId,
      Customer_Name: b.visitorName || b.VisitorName || b.Customer_Name || '',
      Customer_Email: visitorEmail,
      Customer_Phone: b.visitorMobile || b.VisitorMobile || b.Customer_Phone || '',
      Customer_WhatsApp: b.visitorWhatsApp || b.Customer_WhatsApp || b.visitorMobile || b.VisitorMobile || '',
      Service_Address: b.serviceLocation || b.ServiceLocation || b.Service_Address || '',
      Service_Lat: b.visitorLat !== undefined ? b.visitorLat : (b.Service_Lat !== undefined ? b.Service_Lat : ''),
      Service_Lng: b.visitorLng !== undefined ? b.visitorLng : (b.Service_Lng !== undefined ? b.Service_Lng : ''),
      Job_Description: b.message || b.Message || b.Job_Description || '',
      Booking_Images: bookingImagesStr,
      Booking_Date: bookingDate,
      Time_Slot: bookingSlot,
      Status: 'pending',
      Status_Reason: '',
      Cancel_Requested_At: '',
      Created_At: createdAt,
      Updated_At: createdAt,
      Reminder_Sent: false,

      // Compatibility legacy columns
      User_Email: provEmail,
      User_ID: provUserId,
      ID: bookingId,
      ProviderName: b.providerName || b.ProviderName || '',
      VisitorName: b.visitorName || b.VisitorName || '',
      VisitorMobile: b.visitorMobile || b.VisitorMobile || '',
      ServiceLocation: b.serviceLocation || b.ServiceLocation || '',
      Message: b.message || b.Message || '',
      Date: bookingDate,
      Slot: bookingSlot,
      CreatedAt: createdAt,
      'booking Images': bookingImagesStr,
      'ad ID': adId
    };

    var rowData = objectToRow(bookingObj, bHeaders);
    sheet.appendRow(rowData);

    // Send pending booking notification email to provider
    try {
      if (provEmail) {
        sendPendingBookingNotifications(provEmail);
      } else {
        sendPendingBookingNotifications();
      }
    } catch (eNotif) {
      Logger.log('Notification trigger error: ' + eNotif);
    }

    return {
      success: true,
      id: bookingId,
      bookingId: bookingId,
      status: 'pending',
      providerEmail: provEmail,
      providerUserId: provUserId,
      providerName: b.providerName || b.ProviderName || '',
      visitorName: bookingObj.Customer_Name,
      visitorMobile: bookingObj.Customer_Phone,
      visitorEmail: visitorEmail,
      customerUserId: custUserId,
      serviceLocation: bookingObj.Service_Address,
      message: bookingObj.Job_Description,
      date: bookingDate,
      slot: bookingSlot,
      createdAt: createdAt,
      bookingImages: savedImageUrls,
      adId: adId,
      advertisementId: adId,
      'ad ID': adId
    };
  } finally {
    try { lock.releaseLock(); } catch (eRel) {}
  }
}

function sendPendingBookingNotifications(targetSearchKey) {
  try {
    var sheet = getBookingsSheet();
    var data = sheet.getDataRange().getValues();
    if (data.length <= 1) return { success: true, count: 0 };

    var searchKey = String(targetSearchKey || '').trim().toLowerCase();
    var pendingCounts = {}; // email -> { count: N, userId: provUserId }

    for (var i = 1; i < data.length; i++) {
      var row = data[i];
      if (!row) continue;

      var pEmail = String(row[0] || '').trim().toLowerCase();
      var pUserId = String(row[1] || '').trim();
      var status = String(row[11] || '').trim().toLowerCase();

      if (status === 'pending') {
        // Fallback lookup if pEmail is empty
        if (!pEmail && pUserId) {
          try {
            var spSheet = getProvidersSheet();
            var spData = spSheet.getDataRange().getValues();
            for (var s = 1; s < spData.length; s++) {
              if (String(spData[s][1] || '').trim().toLowerCase() === pUserId.toLowerCase()) {
                pEmail = String(spData[s][0] || '').trim().toLowerCase();
                break;
              }
            }
          } catch (eLookup) {}
        }

        if (pEmail) {
          if (searchKey && pEmail !== searchKey && pUserId.toLowerCase() !== searchKey) {
            continue;
          }
          if (!pendingCounts[pEmail]) {
            pendingCounts[pEmail] = { count: 0, userId: pUserId };
          }
          pendingCounts[pEmail].count++;
        }
      }
    }

    var props = PropertiesService.getScriptProperties();
    var notified = [];

    for (var email in pendingCounts) {
      var info = pendingCounts[email];
      var count = info.count;
      var lastNotifiedKey = 'last_notified_pending_' + email;
      var lastNotifiedCount = props.getProperty(lastNotifiedKey);

      // Send email if count changed or never sent
      if (String(lastNotifiedCount) !== String(count)) {
        var bodyMsg = count + " of booking request are available for your ad and please check.";
        try {
          MailApp.sendEmail({
            to: email,
            subject: "Pending Booking Requests Notification - FlashMyDeal",
            body: bodyMsg
          });
          props.setProperty(lastNotifiedKey, String(count));
          notified.push({ email: email, count: count, sent: true });
        } catch (eMail) {
          Logger.log('Error sending email to ' + email + ': ' + eMail);
        }
      } else {
        notified.push({ email: email, count: count, sent: false });
      }
    }

    return { success: true, notified: notified };
  } catch (err) {
    Logger.log('Error in sendPendingBookingNotifications: ' + err);
    return { error: err.toString() };
  }
}

function updateBookingStatus(id, status, cancellationReason, callerEmail) {
  var sheet = getBookingsSheet();
  var data = sheet.getDataRange().getValues();
  var headers = getHeaders(sheet);
  var hMap = getHeaderIndexMap(headers);

  var query = String(id || '').trim().toLowerCase();
  var cleanCaller = String(callerEmail || '').trim().toLowerCase();
  var targetStatus = String(status || '').trim().toLowerCase();

  var idxId = hMap['booking_id'] !== undefined ? hMap['booking_id'] : (hMap['id'] !== undefined ? hMap['id'] : 2);
  var idxProvEmail = hMap['provider_email'] !== undefined ? hMap['provider_email'] : (hMap['user_email'] !== undefined ? hMap['user_email'] : 0);
  var idxCustEmail = hMap['customer_email'] !== undefined ? hMap['customer_email'] : (hMap['visitoremail'] !== undefined ? hMap['visitoremail'] : 6);
  var idxStatus = hMap['status'] !== undefined ? hMap['status'] : 16;
  var idxReason = hMap['status_reason'] !== undefined ? hMap['status_reason'] : (hMap['cancellationreason'] !== undefined ? hMap['cancellationreason'] : 17);
  var idxCancelAt = hMap['cancel_requested_at'] !== undefined ? hMap['cancel_requested_at'] : 18;
  var idxUpdated = hMap['updated_at'] !== undefined ? hMap['updated_at'] : 20;

  for (var i = 1; i < data.length; i++) {
    if (String(data[i][idxId]).trim().toLowerCase() === query) {
      var provEmail = String(data[i][idxProvEmail] || '').trim().toLowerCase();
      var custEmail = String(data[i][idxCustEmail] || '').trim().toLowerCase();
      var currentStatus = String(data[i][idxStatus] || 'pending').trim().toLowerCase();

      var isCallerProvider = cleanCaller && provEmail && cleanCaller === provEmail;
      var isCallerCustomer = cleanCaller && custEmail && cleanCaller === custEmail;

      if (cleanCaller && !isCallerProvider && !isCallerCustomer) {
        return { error: 'Unauthorized: caller is neither provider nor customer of this booking.' };
      }

      // Check current state transitions allowed
      // pending -> confirmed, declined, cancelled_by_customer
      // confirmed -> completed, cancelled_by_provider, cancelled_by_customer, no_show
      if (currentStatus === 'completed' || currentStatus === 'declined' || currentStatus.indexOf('cancelled') === 0) {
        return { error: 'INVALID_TRANSITION', message: 'Booking is already ' + currentStatus + ' and cannot be modified.' };
      }

      // Validate allowed target status & role permissions
      var validTransition = false;
      if (currentStatus === 'pending') {
        if (targetStatus === 'confirmed' && isCallerProvider) validTransition = true;
        else if (targetStatus === 'declined' && isCallerProvider) validTransition = true;
        else if ((targetStatus === 'cancelled_by_customer' || targetStatus === 'cancelled') && isCallerCustomer) {
          targetStatus = 'cancelled_by_customer';
          validTransition = true;
        }
      } else if (currentStatus === 'confirmed') {
        if (targetStatus === 'completed' && isCallerProvider) validTransition = true;
        else if (targetStatus === 'no_show' && isCallerProvider) validTransition = true;
        else if (targetStatus === 'cancelled_by_provider' && isCallerProvider) validTransition = true;
        else if ((targetStatus === 'cancelled_by_customer' || targetStatus === 'cancelled') && isCallerCustomer) {
          targetStatus = 'cancelled_by_customer';
          validTransition = true;
        } else if (targetStatus === 'cancelled' && isCallerProvider) {
          targetStatus = 'cancelled_by_provider';
          validTransition = true;
        }
      }

      // Admin or system bypass if callerEmail not passed or if admin
      if (!cleanCaller) validTransition = true;

      if (!validTransition) {
        return { 
          error: 'INVALID_TRANSITION', 
          message: 'Invalid status change from ' + currentStatus + ' to ' + targetStatus + ' for caller role.' 
        };
      }

      var nowIso = new Date().toISOString();
      sheet.getRange(i + 1, idxStatus + 1).setValue(targetStatus);
      if (cancellationReason !== undefined && cancellationReason !== null) {
        sheet.getRange(i + 1, idxReason + 1).setValue(String(cancellationReason));
      }
      if (targetStatus.indexOf('cancel') >= 0 && idxCancelAt !== -1) {
        sheet.getRange(i + 1, idxCancelAt + 1).setValue(nowIso);
      }
      if (idxUpdated !== -1) {
        sheet.getRange(i + 1, idxUpdated + 1).setValue(nowIso);
      }

      // Email notifications for cancellation / confirmation (Prompt 29 ready)
      try {
        if (targetStatus === 'cancelled_by_customer' && provEmail) {
          MailApp.sendEmail({
            to: provEmail,
            subject: 'Booking Cancelled by Customer - Dorakada',
            body: 'Customer ' + custEmail + ' has cancelled booking #' + id + '.\nReason: ' + (cancellationReason || 'No reason provided') + '\n\nThe calendar slot has been freed.'
          });
        } else if (targetStatus === 'confirmed' && custEmail) {
          MailApp.sendEmail({
            to: custEmail,
            subject: 'Booking Confirmed - Dorakada',
            body: 'Your booking #' + id + ' has been confirmed by ' + provEmail + '!\nYou can view provider contact details in My Bookings.'
          });
        }
      } catch (mailErr) {
        Logger.log('Status update email failed: ' + mailErr);
      }

      return { 
        success: true, 
        id: id, 
        status: targetStatus, 
        cancellationReason: cancellationReason || '',
        updatedAt: nowIso
      };
    }
  }
  return { error: 'Booking not found: ' + id };
}

function deleteBooking(payload) {
  var sheet = getBookingsSheet();
  var data = sheet.getDataRange().getValues();
  if (data.length <= 1) return { error: 'No bookings found' };

  var headers = data[0].map(function(h) { return String(h || '').trim().toLowerCase(); });
  var idxId = headers.indexOf('id');
  if (idxId === -1) idxId = 2; // Col 3

  var idxCustId = headers.indexOf('customer_user_id');
  if (idxCustId === -1) idxCustId = headers.indexOf('customeruserid');
  if (idxCustId === -1) idxCustId = 13; // Col 14

  var idxEmail = headers.indexOf('visitoremail');
  if (idxEmail === -1) idxEmail = headers.indexOf('visitor_email');
  if (idxEmail === -1) idxEmail = 14; // Col 15

  var idxSlot = headers.indexOf('slot');
  if (idxSlot === -1) idxSlot = 9; // Col 10

  var idxDate = headers.indexOf('date');
  if (idxDate === -1) idxDate = 8; // Col 9

  var targetId = '';
  var targetCustId = '';
  var targetEmail = '';
  var targetSlot = '';
  var targetDate = '';

  if (typeof payload === 'object' && payload !== null) {
    targetId = String(payload.id || payload.ID || payload.bookingId || (payload.booking && payload.booking.id) || '').trim().toLowerCase();
    targetCustId = String(payload.customerUserId || payload.Customer_User_ID || (payload.booking && (payload.booking.customerUserId || payload.booking.Customer_User_ID)) || '').trim().toLowerCase();
    targetEmail = String(payload.visitorEmail || payload.VisitorEmail || payload.email || (payload.booking && (payload.booking.visitorEmail || payload.booking.VisitorEmail)) || '').trim().toLowerCase();
    targetSlot = String(payload.slot || (payload.booking && payload.booking.slot) || '').trim().toLowerCase();
    targetDate = String(payload.date || (payload.booking && payload.booking.date) || '').trim().toLowerCase();
  } else {
    targetId = String(payload || '').trim().toLowerCase();
  }

  if (!targetId && !targetCustId && !targetEmail && !targetSlot) {
    return { error: 'Invalid booking deletion query' };
  }

  function slotMatches(s1, s2) {
    if (!s1 || !s2) return false;
    if (s1 === s2) return true;
    var norm1 = s1.toLowerCase().replace(/[^a-z0-9]/g, '');
    var norm2 = s2.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (norm1 === norm2) return true;
    if (norm1 && norm2 && (norm1.indexOf(norm2) !== -1 || norm2.indexOf(norm1) !== -1)) return true;
    return false;
  }

  var deletedCount = 0;
  for (var i = data.length - 1; i >= 1; i--) {
    var row = data[i];
    if (!row) continue;

    var rowId = String(row[idxId] || '').trim().toLowerCase();
    var rowCustId = String(row[idxCustId] || '').trim().toLowerCase();
    var rowEmail = String(row[idxEmail] || '').trim().toLowerCase();
    var rowSlot = String(row[idxSlot] || '').trim().toLowerCase();
    var rowDate = String(row[idxDate] || '').trim().toLowerCase();

    var match = false;

    // 1) Direct ID match
    if (targetId && rowId && (rowId === targetId || rowId.indexOf(targetId) !== -1 || targetId.indexOf(rowId) !== -1)) {
      match = true;
    }

    // 2) ID + Slot match
    if (!match && targetId && targetSlot && rowId === targetId && slotMatches(rowSlot, targetSlot)) {
      match = true;
    }

    // 3) Cust ID + Email + Slot match
    if (!match && targetSlot && slotMatches(rowSlot, targetSlot)) {
      var custOk = !targetCustId || !rowCustId || (targetCustId === rowCustId);
      var emailOk = !targetEmail || !rowEmail || (targetEmail === rowEmail);
      var dateOk = !targetDate || !rowDate || (targetDate === rowDate);
      if ((targetCustId && rowCustId === targetCustId) || (targetEmail && rowEmail === targetEmail)) {
        if (custOk && emailOk && dateOk) {
          match = true;
        }
      }
    }

    // 4) Slot match + (Cust ID OR Email)
    if (!match && targetSlot && slotMatches(rowSlot, targetSlot)) {
      if ((targetCustId && rowCustId === targetCustId) || (targetEmail && rowEmail === targetEmail)) {
        match = true;
      }
    }

    // 5) Slot match + Date match
    if (!match && targetSlot && targetDate && slotMatches(rowSlot, targetSlot) && rowDate === targetDate) {
      match = true;
    }

    if (match) {
      sheet.deleteRow(i + 1);
      deletedCount++;
    }
  }

  if (deletedCount > 0) {
    return { success: true, deletedCount: deletedCount };
  }
  return { error: 'Booking not found for deletion' };
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
// TAB: ANALYTICS (13 COLUMNS)
// ==========================================
function getAnalyticsSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('Analytics');
  if (!sheet) {
    sheet = ss.insertSheet('Analytics');
    sheet.appendRow([
      'User_Email', 'User_ID', 'Entity_ID', 'Entity_Type', 'Log_Date',
      'Daily_Ad_Views', 'Daily_Phone_Reveals', 'Daily_WhatsApp_Clicks',
      'Daily_Social_Shares', 'Daily_Booking_Requests', 'Daily_Confirmed_Bookings',
      'Daily_Conversion_Rate', 'Last_Updated_Timestamp'
    ]);
  }
  return sheet;
}

function getAnalytics() {
  var sheet = getAnalyticsSheet();
  var data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];

  var records = [];
  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    if (!row || row.length === 0) continue;
    records.push({
      userEmail: String(row[0] || '').toLowerCase(),
      userId: String(row[1] || ''),
      entityId: String(row[2] || ''),
      entityType: String(row[3] || 'product_listing'),
      logDate: String(row[4] || ''),
      dailyAdViews: Number(row[5]) || 0,
      dailyPhoneReveals: Number(row[6]) || 0,
      dailyWhatsAppClicks: Number(row[7]) || 0,
      dailySocialShares: Number(row[8]) || 0,
      dailyBookingRequests: Number(row[9]) || 0,
      dailyConfirmedBookings: Number(row[10]) || 0,
      dailyConversionRate: String(row[11] || '0.0%'),
      lastUpdatedTimestamp: String(row[12] || new Date().toISOString())
    });
  }
  return records;
}

function saveAnalytics(r) {
  if (!r) return { error: 'Invalid record' };
  var sheet = getAnalyticsSheet();
  var data = sheet.getDataRange().getValues();

  var email = String(r.userEmail || r.User_Email || '').trim().toLowerCase();
  var userId = String(r.userId || r.User_ID || '').trim().toUpperCase();
  var entityId = String(r.entityId || r.Entity_ID || '').trim();
  var logDate = String(r.logDate || r.Log_Date || new Date().toISOString().split('T')[0]);

  var rowIndex = -1;
  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    if (String(row[1] || '').trim().toUpperCase() === userId &&
        String(row[2] || '').trim() === entityId &&
        String(row[4] || '').trim() === logDate) {
      rowIndex = i + 1;
      break;
    }
  }

  var rowData = [
    email,
    userId,
    entityId,
    r.entityType || r.Entity_Type || 'product_listing',
    logDate,
    Number(r.dailyAdViews || r.Daily_Ad_Views || 0),
    Number(r.dailyPhoneReveals || r.Daily_Phone_Reveals || 0),
    Number(r.dailyWhatsAppClicks || r.Daily_WhatsApp_Clicks || 0),
    Number(r.dailySocialShares || r.Daily_Social_Shares || 0),
    Number(r.dailyBookingRequests || r.Daily_Booking_Requests || 0),
    Number(r.dailyConfirmedBookings || r.Daily_Confirmed_Bookings || 0),
    String(r.dailyConversionRate || r.Daily_Conversion_Rate || '0.0%'),
    String(r.lastUpdatedTimestamp || r.Last_Updated_Timestamp || new Date().toISOString())
  ];

  if (rowIndex !== -1) {
    sheet.getRange(rowIndex, 1, 1, 13).setValues([rowData]);
  } else {
    sheet.appendRow(rowData);
  }

  return { success: true, record: r };
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

function submitBankTransferReceipt(payload) {
  try {
    var email = payload.email || payload.userEmail || '';
    var userId = payload.userId || payload.memberId || 'FMD1000';
    var plan = payload.plan || payload.selectedPlan || 'PRO_BOTH';
    var receiptData = payload.receiptData || payload.receiptBase64 || '';
    var receiptFileName = payload.receiptFileName || 'bank_receipt.pdf';
    var folderName = payload.folderName || ('Transfer_' + userId + '_' + plan + '_' + new Date().toISOString().slice(0, 10).replace(/-/g, ''));

    var rootFolder = getOrCreateFolder('FlashMyDeal_Uploads');
    var cleanEmail = String(email).trim().toLowerCase().replace(/[^a-z0-9]/g, '_');
    var userFolderName = 'User_' + userId + (cleanEmail ? '_' + cleanEmail : '');
    var userFolder = getOrCreateSubFolder(rootFolder, userFolderName);
    var targetSubFolder = getOrCreateSubFolder(userFolder, folderName);

    var detailsContent = "Bank Transfer Receipt Submission\n" +
      "Email: " + email + "\n" +
      "User ID: " + userId + "\n" +
      "Plan: " + plan + "\n" +
      "Folder Name: " + folderName + "\n" +
      "Submitted At: " + new Date().toISOString() + "\n";
    targetSubFolder.createFile('Bank_Transfer_Details.txt', detailsContent);

    var receiptFileUrl = '';
    var attachmentBlob = null;
    if (receiptData) {
      var base64String = receiptData;
      var contentType = 'application/pdf';
      if (receiptData.indexOf(',') !== -1) {
        var parts = receiptData.split(',');
        if (parts[0] && parts[0].indexOf(':') !== -1 && parts[0].indexOf(';') !== -1) {
          contentType = parts[0].substring(parts[0].indexOf(':') + 1, parts[0].indexOf(';')) || 'application/pdf';
        }
        base64String = parts[1];
      }
      var decodedData = Utilities.base64Decode(base64String);
      attachmentBlob = Utilities.newBlob(decodedData, contentType, receiptFileName);
      var file = targetSubFolder.createFile(attachmentBlob);
      file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      receiptFileUrl = 'https://lh3.googleusercontent.com/d/' + file.getId();
    }

    var targetEmail = 'wmpdhananjaya@gmail.com';
    var subject = 'Dorakada PRO - Bank Transfer Receipt Submission';
    var htmlBody = '<div style="font-family:sans-serif;padding:20px;max-width:600px;border:1px solid #e2e8f0;border-radius:12px;">' +
      '<h2 style="color:#2563eb;margin-top:0;">Dorakada PRO - Bank Transfer Submission</h2>' +
      '<p><b>User Email:</b> ' + email + '</p>' +
      '<p><b>User ID:</b> ' + userId + '</p>' +
      '<p><b>Selected Plan:</b> ' + plan + '</p>' +
      '<p><b>Folder Name:</b> ' + folderName + '</p>' +
      (receiptFileUrl ? '<p><b>Receipt File URL:</b> <a href="' + receiptFileUrl + '" target="_blank" style="color:#2563eb;font-weight:bold;">View Uploaded Receipt in Google Drive</a></p>' : '') +
      '<p style="background:#f8fafc;padding:12px;border-radius:8px;color:#475569;"><b>Evaluation & Activation Time:</b> 2 working days.</p>' +
      '<p style="font-size:11px;color:#94a3b8;margin-bottom:0;">Submitted at: ' + new Date().toUTCString() + '</p>' +
      '</div>';

    // 1. Send to admin (wmpdhananjaya@gmail.com)
    try {
      var adminOptions = {
        to: targetEmail,
        subject: 'New Bank Transfer Receipt - User ID: ' + userId + ' (' + email + ')',
        htmlBody: htmlBody
      };
      if (attachmentBlob) {
        adminOptions.attachments = [attachmentBlob];
      }
      MailApp.sendEmail(adminOptions);
    } catch (adminErr) {
      Logger.log('Error sending bank receipt email to admin: ' + adminErr);
    }

    // 2. Send copy to user if valid email provided
    if (email && email.indexOf('@') !== -1 && email.toLowerCase() !== targetEmail.toLowerCase()) {
      try {
        var userOptions = {
          to: email,
          subject: subject,
          htmlBody: htmlBody
        };
        if (attachmentBlob) {
          userOptions.attachments = [attachmentBlob];
        }
        MailApp.sendEmail(userOptions);
      } catch (userErr) {
        Logger.log('Error sending bank receipt email to user: ' + userErr);
      }
    }

    return { success: true };
  } catch (err) {
    return { error: err.toString() };
  }
}

// ==========================================
// DAILY UNUSED DRIVE IMAGES CLEANUP SERVICE (Prompt 9)
// ==========================================
function cleanUnusedDriveImages() {
  try {
    var activeFileIds = {};

    // 1. Collect active image file IDs from ServiceProviders sheet (Images column)
    try {
      var spSheet = getProvidersSheet();
      var spData = spSheet.getDataRange().getValues();
      var headers = spData.length > 0 ? spData[0].map(function(h) { return String(h||'').toLowerCase().trim(); }) : [];
      var imgColIdx = headers.indexOf('images');
      for (var k = 1; k < spData.length; k++) {
        var spRow = spData[k];
        if (!spRow) continue;
        var spImgsCell = imgColIdx >= 0 ? String(spRow[imgColIdx] || '') : JSON.stringify(spRow);
        var spIds = extractDriveFileIds(spImgsCell);
        for (var m = 0; m < spIds.length; m++) {
          activeFileIds[spIds[m]] = true;
        }
      }
    } catch (e2) {
      Logger.log('Error scanning service provider images: ' + e2);
    }

    // 3. Collect active image file IDs from Bookings sheet ('booking Images' column)
    try {
      var bookingsSheet = getBookingsSheet();
      var bData = bookingsSheet.getDataRange().getValues();
      for (var b = 1; b < bData.length; b++) {
        var bRow = bData[b];
        if (!bRow) continue;
        var bImgsCell = String(bRow[15] || '');
        var bIds = extractDriveFileIds(bImgsCell);
        for (var bi = 0; bi < bIds.length; bi++) {
          activeFileIds[bIds[bi]] = true;
        }
      }
    } catch (e3) {
      Logger.log('Error scanning bookings images: ' + e3);
    }

    // 4. Collect active user profile image IDs
    try {
      var usersSheet = getUsersSheet();
      var uData = usersSheet.getDataRange().getValues();
      var uMap = getUserHeaderMap(usersSheet);
      var idxProfileImg = uMap.get('Profile_Image', 30);
      for (var u = 1; u < uData.length; u++) {
        var uRow = uData[u];
        if (!uRow) continue;
        var uImgCell = String(uRow[idxProfileImg] || '');
        var uIds = extractDriveFileIds(uImgCell);
        for (var ui = 0; ui < uIds.length; ui++) {
          activeFileIds[uIds[ui]] = true;
        }
      }
    } catch (e4) {
      Logger.log('Error scanning user profile images: ' + e4);
    }

    // 5. Locate root folder 'FlashMyDeal_Uploads'
    var rootFolders = DriveApp.getFoldersByName('FlashMyDeal_Uploads');
    if (!rootFolders.hasNext()) {
      return { success: true, cleanedCount: 0, message: 'Uploads folder not found' };
    }
    var rootFolder = rootFolders.next();

    // 24 hours age threshold (in milliseconds)
    var ageThresholdMs = 24 * 60 * 60 * 1000;
    var nowMs = Date.now();
    var deletedCount = 0;

    // Scan ONLY User_ folders, and inside each User_ folder, ONLY "Listings" and "ServiceProfile"
    var topFolders = rootFolder.getFolders();
    while (topFolders.hasNext()) {
      var userFolder = topFolders.next();
      var userFolderName = userFolder.getName();

      // NEVER touch root-level 'Bookings' folder or any non-user folders
      if (userFolderName.toLowerCase() === 'bookings' || !userFolderName.startsWith('User_')) {
        continue;
      }

      var userSubFolders = userFolder.getFolders();
      while (userSubFolders.hasNext()) {
        var sub = userSubFolders.next();
        var subName = sub.getName().toLowerCase();

        // ONLY scan "Listings" and "ServiceProfile" folders.
        // NEVER touch "Transfer_" folders, receipt folders, or anything else!
        if (subName !== 'listings' && subName !== 'serviceprofile') {
          continue;
        }

        // Clean unreferenced files older than 24 hours inside this folder
        var files = sub.getFiles();
        while (files.hasNext()) {
          var file = files.next();
          var fileId = file.getId();

          // Only consider trashing if file is NOT referenced in any active sheet
          if (!activeFileIds[fileId]) {
            var createdDate = file.getDateCreated();
            var fileAge = createdDate ? (nowMs - createdDate.getTime()) : 0;

            // Only trash files older than 24 hours to prevent race conditions during upload/save
            if (fileAge > ageThresholdMs) {
              try {
                file.setTrashed(true);
                deletedCount++;
              } catch (eTrash) {
                Logger.log('Could not trash file ' + fileId + ': ' + eTrash);
              }
            }
          }
        }
      }
    }

    Logger.log('Daily Drive Cleanup Completed. Cleaned files older than 24h: ' + deletedCount);
    return { success: true, cleanedCount: deletedCount };
  } catch (err) {
    Logger.log('Error in cleanUnusedDriveImages: ' + err);
    return { error: err.toString() };
  }
}

/**
 * Configure cleanUnusedDriveImages to run once daily instead of every 15 minutes.
 * Run once manually from the Google Apps Script editor.
 */
function setupUnusedImagesCleanupTrigger() {
  try {
    var triggers = ScriptApp.getProjectTriggers();
    for (var i = 0; i < triggers.length; i++) {
      if (triggers[i].getHandlerFunction() === 'cleanUnusedDriveImages') {
        ScriptApp.deleteTrigger(triggers[i]);
      }
    }
    ScriptApp.newTrigger('cleanUnusedDriveImages')
      .timeBased()
      .atHour(2)
      .everyDays(1)
      .create();
    Logger.log('Daily trigger for cleanUnusedDriveImages configured successfully (runs at ~2:00 AM daily).');
    return { success: true, message: 'Daily trigger configured' };
  } catch (e) {
    Logger.log('Trigger creation note: ' + e);
    return { error: e.toString() };
  }
}

/**
 * Inspect Google Drive Trash for any booking photos, receipts, or text files that may have been trashed.
 * Run manually from the Apps Script editor to review trashed files.
 */
function findTrashedUploadsFiles() {
  var trashed = DriveApp.getTrashedFiles();
  var found = [];
  while (trashed.hasNext()) {
    var f = trashed.next();
    var name = f.getName();
    if (name.indexOf('Receipt') >= 0 || name.indexOf('Transfer') >= 0 || name.indexOf('Booking') >= 0 || name.indexOf('.txt') >= 0) {
      found.push({
        id: f.getId(),
        name: name,
        dateCreated: f.getDateCreated(),
        mimeType: f.getMimeType()
      });
      Logger.log('Trashed match: ' + name + ' (ID: ' + f.getId() + ')');
    }
  }
  Logger.log('findTrashedUploadsFiles completed. Total matches: ' + found.length);
  return found;
}

/**
 * Restore any trashed receipts or booking files found in Google Drive Trash.
 * Run manually from the Apps Script editor if you need to restore them.
 */
function restoreTrashedUploadsFiles() {
  var trashed = DriveApp.getTrashedFiles();
  var count = 0;
  while (trashed.hasNext()) {
    var f = trashed.next();
    var name = f.getName();
    if (name.indexOf('Receipt') >= 0 || name.indexOf('Transfer') >= 0 || name.indexOf('Booking') >= 0 || name.indexOf('.txt') >= 0) {
      try {
        f.setTrashed(false);
        count++;
        Logger.log('Restored: ' + name);
      } catch (e) {
        Logger.log('Failed to restore ' + name + ': ' + e);
      }
    }
  }
  Logger.log('restoreTrashedUploadsFiles completed. Restored: ' + count + ' file(s).');
  return { success: true, restoredCount: count };
}

/**
 * ONE-TIME MIGRATION UTILITY (Prompt 24):
 * Finds any user account (email or User_ID) with more than 1 service ad in the ServiceProviders / Providers sheet.
 * Reports all details: ad IDs, business names, creation dates, booking counts, image counts, and a recommendation.
 */
function findUsersWithMultipleAds() {
  var spSheet = getProvidersSheet();
  var spData = spSheet.getDataRange().getValues();
  if (spData.length <= 1) {
    Logger.log('No service providers found in sheet.');
    return [];
  }

  var spHeaders = spData[0].map(function(h) { return String(h || '').trim().toLowerCase(); });
  var idxEmail = spHeaders.indexOf('user_email');
  if (idxEmail === -1) idxEmail = 0;
  var idxUserId = spHeaders.indexOf('user_id');
  if (idxUserId === -1) idxUserId = 1;
  var idxId = spHeaders.indexOf('id');
  if (idxId === -1) idxId = 2;
  var idxName = spHeaders.indexOf('businessname');
  if (idxName === -1) idxName = 3;
  var idxCreatedAt = spHeaders.indexOf('createdat');
  if (idxCreatedAt === -1) idxCreatedAt = 29;
  var idxImages = spHeaders.indexOf('images');
  if (idxImages === -1) idxImages = 28;

  // Build index of bookings per ad ID / provider ID
  var bookingCounts = {};
  try {
    var bkSheet = getBookingsSheet();
    var bkData = bkSheet.getDataRange().getValues();
    for (var b = 1; b < bkData.length; b++) {
      var bkRow = bkData[b];
      var bkAdId = String(bkRow[16] || bkRow[2] || '').trim();
      var bkProvId = String(bkRow[1] || bkRow[0] || '').trim();
      if (bkAdId) {
        bookingCounts[bkAdId] = (bookingCounts[bkAdId] || 0) + 1;
      }
      if (bkProvId && bkProvId !== bkAdId) {
        bookingCounts[bkProvId] = (bookingCounts[bkProvId] || 0) + 1;
      }
    }
  } catch (bErr) {
    Logger.log('Could not load bookings for ad analysis: ' + bErr);
  }

  // Group ads by user email (or user ID)
  var userGroups = {};
  for (var i = 1; i < spData.length; i++) {
    var row = spData[i];
    var uEmail = String(row[idxEmail] || '').trim().toLowerCase();
    var uId = String(row[idxUserId] || '').trim().toUpperCase();
    var groupKey = uEmail || uId || ('row_' + i);

    if (!userGroups[groupKey]) {
      userGroups[groupKey] = {
        email: uEmail,
        userId: uId,
        ads: []
      };
    }

    var adId = String(row[idxId] || '').trim();
    var name = String(row[idxName] || '').trim();
    var createdAt = String(row[idxCreatedAt] || '').trim();
    var imgsRaw = String(row[idxImages] || '');
    var imgFileIds = extractDriveFileIds(imgsRaw);

    var bCount = (bookingCounts[adId] || 0);

    userGroups[groupKey].ads.push({
      rowIndex: i + 1,
      id: adId,
      businessName: name,
      createdAt: createdAt,
      bookingCount: bCount,
      imageCount: imgFileIds.length,
      imageFileIds: imgFileIds
    });
  }

  var duplicates = [];
  var keys = Object.keys(userGroups);
  Logger.log('=== MULTIPLE SERVICE ADS AUDIT REPORT ===');
  for (var k = 0; k < keys.length; k++) {
    var group = userGroups[keys[k]];
    if (group.ads.length > 1) {
      // Determine recommendation: highest bookings, else latest createdAt
      var bestAd = group.ads[0];
      for (var a = 1; a < group.ads.length; a++) {
        var cand = group.ads[a];
        if (cand.bookingCount > bestAd.bookingCount) {
          bestAd = cand;
        } else if (cand.bookingCount === bestAd.bookingCount) {
          var tCand = new Date(cand.createdAt).getTime();
          var tBest = new Date(bestAd.createdAt).getTime();
          if (!isNaN(tCand) && (isNaN(tBest) || tCand > tBest)) {
            bestAd = cand;
          }
        }
      }

      var record = {
        userEmail: group.email,
        userId: group.userId,
        totalAds: group.ads.length,
        recommendedKeepAdId: bestAd.id,
        ads: group.ads
      };
      duplicates.push(record);

      Logger.log('User: ' + (group.email || group.userId) + ' has ' + group.ads.length + ' ads:');
      for (var d = 0; d < group.ads.length; d++) {
        var item = group.ads[d];
        var isRec = item.id === bestAd.id ? ' [RECOMMENDED TO KEEP]' : ' [TO ARCHIVE]';
        Logger.log('  - ID: ' + item.id + ' | Name: "' + item.businessName + '" | Created: ' + item.createdAt + ' | Bookings: ' + item.bookingCount + ' | Images: ' + item.imageCount + isRec);
      }
    }
  }

  if (duplicates.length === 0) {
    Logger.log('Great news! No duplicate service ads found. All users have at most 1 ad.');
  } else {
    Logger.log('Found ' + duplicates.length + ' user(s) with multiple service ads.');
  }
  return duplicates;
}

/**
 * ARCHIVE DUPLICATE ADS UTILITY (Prompt 24):
 * Moves extra duplicate service ads to "Archived_Ads" sheet, trashes their Drive images,
 * and leaves exactly 1 ad per user in ServiceProviders.
 *
 * @param {Object} [keepAdOverrides] Optional map of { userEmailOrId: 'ad_id_to_keep' } or array of keep ad IDs.
 */
function archiveDuplicateAds(keepAdOverrides) {
  var duplicates = findUsersWithMultipleAds();
  if (duplicates.length === 0) {
    Logger.log('No duplicates to archive.');
    return { success: true, archivedCount: 0 };
  }

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var archiveSheet = ss.getSheetByName('Archived_Ads');
  var spSheet = getProvidersSheet();
  var spData = spSheet.getDataRange().getValues();
  var spHeaders = spData[0];

  if (!archiveSheet) {
    archiveSheet = ss.insertSheet('Archived_Ads');
    archiveSheet.appendRow(spHeaders);
  }

  // Build lookup of adId -> boolean to keep
  var keepMap = {};
  if (Array.isArray(keepAdOverrides)) {
    for (var ao = 0; ao < keepAdOverrides.length; ao++) {
      keepMap[String(keepAdOverrides[ao]).trim()] = true;
    }
  }

  var rowsToDelete = [];
  var totalArchived = 0;

  for (var u = 0; u < duplicates.length; u++) {
    var dup = duplicates[u];
    var userKey = dup.userEmail || dup.userId;
    var keepId = dup.recommendedKeepAdId;

    if (keepAdOverrides && typeof keepAdOverrides === 'object' && !Array.isArray(keepAdOverrides)) {
      if (keepAdOverrides[userKey] || keepAdOverrides[dup.userEmail] || keepAdOverrides[dup.userId]) {
        keepId = keepAdOverrides[userKey] || keepAdOverrides[dup.userEmail] || keepAdOverrides[dup.userId];
      }
    }

    for (var a = 0; a < dup.ads.length; a++) {
      var ad = dup.ads[a];
      var shouldKeep = keepMap[ad.id] || (ad.id === keepId);
      if (!shouldKeep) {
        // Move row to Archived_Ads
        var originalRow = spData[ad.rowIndex - 1];
        archiveSheet.appendRow(originalRow);

        // Trash this duplicate ad's Drive images
        for (var f = 0; f < ad.imageFileIds.length; f++) {
          try {
            var file = DriveApp.getFileById(ad.imageFileIds[f]);
            if (file) file.setTrashed(true);
          } catch (eF) {
            Logger.log('Could not trash image ' + ad.imageFileIds[f] + ': ' + eF);
          }
        }

        rowsToDelete.push(ad.rowIndex);
        totalArchived++;
      }
    }
  }

  // Delete duplicate rows from bottom to top so row indices remain valid
  rowsToDelete.sort(function(a, b) { return b - a; });
  for (var r = 0; r < rowsToDelete.length; r++) {
    spSheet.deleteRow(rowsToDelete[r]);
  }

  Logger.log('archiveDuplicateAds completed. Archived ' + totalArchived + ' duplicate ad(s) to Archived_Ads sheet.');
  return { success: true, archivedCount: totalArchived };
}
