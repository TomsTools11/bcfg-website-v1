/* ==========================================================================
   BCFG BOOKING BACKEND — Google Apps Script web app

   REFERENCE COPY. The deployed artifact lives in a container-bound Apps
   Script project inside the BCFG Google account, attached to the "BCFG
   Booking Requests" spreadsheet — see RUNBOOK.md beside this file for how it
   is created, authorized, deployed, and (the part that bites) redeployed.
   Keep this file in step with what is actually deployed.

   One POST from the website's booking form does three things here, in order:
     1. appends a row to the Sheet          — the system of record; must land
     2. emails the submitter a confirmation — best effort, from the BCFG Gmail
     3. puts a HOLD event on the calendar   — best effort, Chris's notification
   If 2 or 3 fails the row's status columns say so and the visitor still gets
   a success — their request DID reach Chris. Only a failed append is an error.

   The client sends JSON in a text/plain POST (a CORS "simple" request; Apps
   Script cannot answer a preflight) and trusts only the JSON body it gets
   back: {ok:true} or {ok:false, error:"…"}. Everything below is wrapped so an
   exception can never escape — an escaped exception becomes a Google HTML
   error page (still HTTP 200) that the form cannot parse.
   ========================================================================== */

/* ====== CONFIG ====== */
var TZ = 'America/Chicago';           // ALSO set in Project Settings — see runbook
var TAB_NAME = 'Requests';
var OWNER_EMAIL = 'bluecollarfishingguide@gmail.com';
var OWNER_PHONE = '512-761-7639';
var FROM_NAME = 'Blue Collar Fishing Guide';
var HONEYPOT_FIELD = 'website';       // must match the hidden input name in index.html
var MIN_FILL_MS = 4000;               // payload "t" below this = bot; silently dropped
var MAX_BODY_BYTES = 4096;
var TRIP_LENGTHS = ['Full Day', 'Half Day'];
var SKILLS = ['Beginner', 'Novice', 'Expert'];
var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i;   // same regex as the form

var HEADERS = ['Submitted', 'Status', 'Name', 'Email', 'Phone', 'Trip Date',
  'Alt Date', 'Trip Length', 'Skill', 'Email Status', 'Calendar Status', 'Notes'];
var COL_EMAIL_STATUS = 10;            // J
var COL_CAL_STATUS = 11;              // K

/* ====== ENTRY POINTS ====== */

/** Health check: GET the /exec URL and expect this JSON. */
function doGet() {
  return json_({ ok: true, service: 'bcfg-booking' });
}

function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents ||
        e.postData.contents.length > MAX_BODY_BYTES) {
      return json_({ ok: false, error: 'Bad request.' });
    }

    var data;
    try { data = JSON.parse(e.postData.contents); }
    catch (err) { return json_({ ok: false, error: 'Bad request.' }); }
    if (!data || typeof data !== 'object') return json_({ ok: false, error: 'Bad request.' });

    // Bot gates. SILENT success on purpose: a bot that is told it failed
    // retries with the tell removed; one that is told it succeeded moves on.
    if (data[HONEYPOT_FIELD]) return json_({ ok: true });
    if (typeof data.t === 'number' && data.t >= 0 && data.t < MIN_FILL_MS) {
      return json_({ ok: true });
    }

    var errMsg = validate_(data);
    if (errMsg) return json_({ ok: false, error: errMsg });

    // The lock covers append + the two status-cell writes, so the row index
    // captured from getLastRow() cannot be raced by a concurrent submit.
    var lock = LockService.getScriptLock();
    if (!lock.tryLock(15000)) return json_({ ok: false, error: 'Busy — please try again.' });
    try {
      var sheet = ensureSheet_();
      var dup = isDuplicate_(sheet, data.email, data.date);
      var rowIndex = appendRow_(sheet, data, dup);   // throws => outer catch => ok:false
      if (!dup) {
        sheet.getRange(rowIndex, COL_EMAIL_STATUS).setValue(sendConfirmation_(data));
        sheet.getRange(rowIndex, COL_CAL_STATUS).setValue(createEvent_(data));
      }
      return json_({ ok: true });
    } finally {
      lock.releaseLock();
    }
  } catch (err) {
    return json_({ ok: false, error: 'Something went wrong on our end. Please call ' + OWNER_PHONE + '.' });
  }
}

/** RUN ONCE MANUALLY from the editor after pasting this file: bootstraps the
 *  sheet AND walks you through the OAuth consent for all three scopes
 *  (Sheets, send mail, Calendar). Deploying without running this first means
 *  the first real submission hits an unauthorized script. */
function setup() {
  ensureSheet_();
  Logger.log('Sheet ready. Mail quota left today: ' + MailApp.getRemainingDailyQuota());
  Logger.log('Default calendar: ' + CalendarApp.getDefaultCalendar().getName());
}

/* ====== HELPERS ====== */

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

/** '' when the payload is fine, else the message the form shows. Mirrors the
 *  form's own checks — anything arriving here that fails them did not come
 *  from the form. */
function validate_(d) {
  if (typeof d.name !== 'string' || !d.name.trim() || d.name.length > 100) {
    return 'Please tell us your name.';
  }
  if (typeof d.email !== 'string' || d.email.length > 254 || !EMAIL_RE.test(d.email)) {
    return 'That email does not look right.';
  }
  if (typeof d.phone !== 'string' || d.phone.replace(/\D/g, '').length !== 10) {
    return 'Enter a 10-digit phone number.';
  }
  var dateErr = checkDate_(d.date, 'trip');
  if (dateErr) return dateErr;
  if (d.altDate) {
    var altErr = checkDate_(d.altDate, 'backup');
    if (altErr) return altErr;
    if (d.altDate === d.date) return 'Your backup date matches your first choice.';
  }
  if (TRIP_LENGTHS.indexOf(d.tripLength) === -1) return 'Choose full day or half day.';
  if (SKILLS.indexOf(d.skill) === -1) return 'Pick a skill level.';
  return '';
}

/** ISO date sanity: shaped right, a real calendar day (round-trips through
 *  Date, so 2026-02-31 fails), not in the past, within two years. */
function checkDate_(iso, which) {
  if (typeof iso !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) {
    return 'Pick a ' + which + ' date.';
  }
  var p = iso.split('-');
  var d = new Date(+p[0], +p[1] - 1, +p[2], 12, 0, 0);
  if (isNaN(d.getTime()) || Utilities.formatDate(d, TZ, 'yyyy-MM-dd') !== iso) {
    return 'Pick a real ' + which + ' date.';
  }
  var today = todayIso_();
  if (iso < today) return 'Pick a ' + which + ' date in the future.';
  var horizon = new Date();
  horizon.setFullYear(horizon.getFullYear() + 2);
  if (iso > Utilities.formatDate(horizon, TZ, 'yyyy-MM-dd')) {
    return 'Pick a ' + which + ' date within the next two years.';
  }
  return '';
}

function todayIso_() {
  return Utilities.formatDate(new Date(), TZ, 'yyyy-MM-dd');
}

/** '2026-11-06' -> 'Friday, November 6, 2026'. Anchored at noon so a DST edge
 *  cannot shift the day. */
function longDate_(iso) {
  if (!iso) return '';
  var p = iso.split('-');
  return Utilities.formatDate(new Date(+p[0], +p[1] - 1, +p[2], 12, 0, 0), TZ, 'EEEE, MMMM d, yyyy');
}

/** Sheets formula-injection guard: a submitted name of '=IMPORTXML(…)' must
 *  land as text, not execute. The apostrophe is Sheets' own text-literal. */
function clean_(v) {
  v = String(v == null ? '' : v);
  return /^[=+\-@]/.test(v) ? "'" + v : v;
}

/** Returns the Requests tab, building headers, formats, and Chris's Status
 *  dropdown the first time (the tab-is-empty check makes every later call one
 *  cheap read). Container-bound, so no spreadsheet ID lives in the code. */
function ensureSheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  // The spreadsheet's own timezone drives how the Submitted timestamps
  // DISPLAY, and it is a separate setting from the script's. Repair it
  // whenever it drifts — a read per request, a write only when wrong.
  if (ss.getSpreadsheetTimeZone() !== TZ) ss.setSpreadsheetTimeZone(TZ);
  var sheet = ss.getSheetByName(TAB_NAME) || ss.insertSheet(TAB_NAME);
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(HEADERS);
    sheet.setFrozenRows(1);
    sheet.getRange('E:G').setNumberFormat('@');   // phone + both dates stay text
    var rule = SpreadsheetApp.newDataValidation()
      .requireValueInList(['New', 'Contacted', 'Confirmed', 'Declined', 'Spam'], true)
      .build();
    sheet.getRange('B2:B').setDataValidation(rule);
  }
  return sheet;
}

/** A cell that was meant to hold a YYYY-MM-DD string can come back from
 *  getValues() as a Date anyway — appendRow parses values like typed input,
 *  which can override the column's text format. Normalize either shape to
 *  the ISO string before comparing. */
function isoOf_(v) {
  return (v && v.getTime) ? Utilities.formatDate(v, TZ, 'yyyy-MM-dd') : String(v);
}

/** Same email + same trip date in the recent rows = a resubmit (impatient
 *  double-send, or a bot replaying). The row is still appended — audit trail —
 *  but flagged Duplicate, and no second email or calendar event goes out. */
function isDuplicate_(sheet, email, date) {
  var last = sheet.getLastRow();
  if (last < 2) return false;
  var from = Math.max(2, last - 199);
  var rows = sheet.getRange(from, 4, last - from + 1, 3).getValues(); // D:F
  var needle = String(email).toLowerCase().trim();
  for (var i = 0; i < rows.length; i++) {
    if (String(rows[i][0]).toLowerCase() === needle && isoOf_(rows[i][2]) === date) {
      return true;
    }
  }
  return false;
}

function appendRow_(sheet, d, dup) {
  sheet.appendRow([
    new Date(),                                   // Submitted
    dup ? 'Duplicate' : 'New',                    // Status
    clean_(d.name.trim()),
    clean_(d.email.trim()),
    clean_(d.phone),
    d.date,                                       // validated ISO; text format
    d.altDate || '',
    d.tripLength,
    d.skill,
    dup ? 'Skipped (duplicate)' : 'Pending',      // Email Status
    dup ? 'Skipped (duplicate)' : 'Pending',      // Calendar Status
    ''                                            // Notes — Chris's column
  ]);
  return sheet.getLastRow();                      // safe: caller holds the lock
}

/** Best effort — a failure lands in the Email Status column, never on the
 *  visitor. MailApp over GmailApp on purpose: it needs only the narrow
 *  send-mail scope, and the from-address is automatically the account this
 *  script runs as. Consumer Gmail quota is 100 recipients/day — far above
 *  real volume; exhaustion degrades to a logged row with FAILED here. */
function sendConfirmation_(d) {
  try {
    MailApp.sendEmail({
      to: d.email.trim(),
      subject: 'Got your trip request — Blue Collar Fishing Guide',
      body: confirmationBody_(d),
      name: FROM_NAME,
      replyTo: OWNER_EMAIL
    });
    return 'Sent';
  } catch (err) {
    return 'FAILED: ' + err.message;
  }
}

/** Plain text on purpose: better spam posture, nothing to render wrong, and
 *  it reads like a person — which is the brand. */
function confirmationBody_(d) {
  var lines = [
    'Hey ' + d.name.trim().split(' ')[0] + ',',
    '',
    'Thanks for putting in a trip request with Blue Collar Fishing Guide.',
    "Here's what we have down:",
    '',
    '  Trip date:   ' + longDate_(d.date)
  ];
  if (d.altDate) lines.push('  Backup date: ' + longDate_(d.altDate));
  lines = lines.concat([
    '  Trip:        ' + d.tripLength,
    '  Experience:  ' + d.skill,
    '  Phone:       ' + d.phone,
    '',
    'Heads up — this is a request, not a confirmed booking yet. Chris will',
    'get back to you by phone or email to lock in the date and go over the',
    "details. If you don't hear from him within a day, or you want to talk",
    'it through now, call or text ' + OWNER_PHONE + '.',
    '',
    'Nothing has been charged and nothing is owed until your trip is',
    'confirmed.',
    '',
    'Tight lines,',
    'Chris',
    'Blue Collar Fishing Guide',
    'New Braunfels, TX',
    OWNER_PHONE,
    OWNER_EMAIL
  ]);
  return lines.join('\n');
}

/** Best effort — a failure lands in the Calendar Status column. An all-day
 *  HOLD on the requested day: the event itself is how Chris sees the request
 *  on his calendar, and it is explicitly NOT a confirmed booking (his call to
 *  make, per the site's own copy). The popup fires at 3pm the afternoon
 *  before the trip. Note: creating an event does not push a phone
 *  notification at submit time — the Sheet is the inbox; the calendar is the
 *  schedule. */
function createEvent_(d) {
  try {
    var p = d.date.split('-');
    var ev = CalendarApp.getDefaultCalendar().createAllDayEvent(
      'HOLD ' + d.tripLength + ' — ' + d.name.trim(),
      new Date(+p[0], +p[1] - 1, +p[2])
    );
    ev.setDescription(
      'Booking request from the website — NOT confirmed yet.\n\n' +
      'Name: ' + d.name.trim() + '\n' +
      'Phone: ' + d.phone + '\n' +
      'Email: ' + d.email.trim() + '\n' +
      'Trip: ' + d.tripLength + '\n' +
      'Skill: ' + d.skill + '\n' +
      'Requested: ' + longDate_(d.date) +
      (d.altDate ? '\nBackup date: ' + longDate_(d.altDate) : '') +
      '\nSubmitted: ' + Utilities.formatDate(new Date(), TZ, 'M/d/yyyy h:mm a')
    );
    ev.addPopupReminder(9 * 60);
    return 'Created';
  } catch (err) {
    return 'FAILED: ' + err.message;
  }
}
