# Booking backend — deployment runbook

How the website's booking form gets its backend: a Google Apps Script web app
living **inside the BCFG Google account** (`bluecollarfishingguide@gmail.com`),
container-bound to a Google Sheet. One POST appends a Sheet row, emails the
submitter a confirmation from the BCFG Gmail, and puts a HOLD event on the BCFG
calendar. No servers, no monthly cost, no secrets in this repo — the `/exec`
URL ships in public HTML by design, and everything below assumes that.

The code is [`Code.gs`](Code.gs) beside this file. It is a **reference copy**:
the deployed artifact lives in Google, and the two must be kept in step.

**Everything in "Set up" happens signed in as the BCFG account.** Tom performs
it (screen-share with Chris works too). Nobody needs to hold Chris's password
past setup — step 8 is how Tom keeps maintenance access, and Chris should
rotate his password after handoff as agreed.

## Set up (once)

1. **Create the Sheet.** [sheets.new](https://sheets.new) → name the file
   **BCFG Booking Requests**. Leave it otherwise empty — the script builds its
   own tab, headers, and formats. (It writes to a tab named `Requests`; the
   default `Sheet1` can be deleted after the first submission or renamed to
   `Requests` now.)
2. **Create the script.** In that Sheet: **Extensions → Apps Script**. This
   binds the project to the Sheet — no spreadsheet ID in the code, the script
   travels with the file, and anyone the Sheet is shared with can open the
   script. Name the project **BCFG Booking Backend**.
3. **Paste the code.** Replace the editor's empty `myFunction` with the whole
   of `Code.gs`.
4. **Pin the timezone.** Project Settings (gear) → Time zone →
   **America/Chicago**. Do not skip: this is what makes "today", the two-year
   horizon, and the calendar day all land on the Texas date the visitor picked.
5. **Authorize.** In the editor pick the `setup` function → **Run**. Google
   shows the consent flow; on the "Google hasn't verified this app" screen use
   **Advanced → Go to BCFG Booking Backend (unsafe)** — normal for a personal
   script — and allow the three scopes (Sheets, send email, Calendar). Check
   the log printed the mail quota and the Sheet now has its header row, frozen,
   with the Status dropdown on column B.
6. **Deploy.** **Deploy → New deployment → Web app** →
   - Description: `v1`
   - Execute as: **Me**
   - Who has access: **Anyone** — *not* "Anyone with Google account". That
     setting bounces anonymous POSTs to a Google login page with no CORS
     headers, and every submission from the site fails with a TypeError.

   Copy the **`/exec`** URL.
7. **Test the backend by itself** — see "Testing" below, against the `/exec`
   URL, *before* touching the site.
8. **Share access with Tom.** Share the *Sheet* with `tom@tom-panos.com` as
   **Editor**. Because the script is container-bound, that grants code access
   from Tom's own login — no password sharing, ever. (Whether an editor can
   also push new versions to *this* deployment is unverified; if Google
   refuses, the fallback is fine: Tom edits code, the BCFG login clicks the
   redeploy.)
9. **Wire the site.** Paste the `/exec` URL into `APPS_SCRIPT_URL` in
   `index.html` (the constant at the top of the BOOKING FORM script block),
   push to `main`, let Vercel redeploy, and run one real submission from the
   live site.

## Changing the code later — the one gotcha

Edits in the Apps Script editor do **nothing** until deployed, and the site
knows the URL it was shipped with. The only correct path is:

> **Deploy → Manage deployments → ✎ (edit) → Version: New version → Deploy**

That keeps the same `/exec` URL. **Deploy → New deployment** mints a *new* URL
and silently strands the site on the old code until `index.html` is updated to
match. If that ever happens anyway, treat the URL paste (set-up step 9) as part
of the deploy.

## Notes for Chris

- **Changing your Google password is safe.** The form runs on an app
  authorization, not your password. Rotate it after handoff as planned.
- **One thing can kill the form:** Google's Security Checkup lists **BCFG
  Booking Backend** under "apps with access to your account". That entry *is*
  your website's booking form. If it is ever removed there, submissions start
  failing (the site shows callers your phone number, so nothing is lost
  silently) until someone signs in and re-runs `setup` to re-authorize.
- **Working the Sheet:** every request lands as a row with Status **New**
  (or **Duplicate** for a resend — those get no second email or event). The
  Status dropdown (New / Contacted / Confirmed / Declined / Spam) and the
  Notes column are yours. The **Email Status** and **Calendar Status** columns
  are the script reporting on itself — a `FAILED: …` there means that
  submission needs a manual follow-up, but the row and the visitor's
  confirmation were never at risk.
- **The calendar HOLD is not a confirmed booking** — it is the request showing
  up on your schedule, per the site's promise that you confirm every trip by
  phone or email. Creating it does not ping your phone at submit time; the
  Sheet is the inbox. (If you decide you want an instant email per request,
  that is a six-line addition — ask Tom.)
- Mail quota is 100 recipients/day on a consumer Gmail — far beyond real
  volume. If it were ever exhausted, requests still land in the Sheet; only
  the confirmation email degrades, and the row says so.

## Testing

### Backend alone (after step 6)

Health check — expect `{"ok":true,"service":"bcfg-booking"}`:

```bash
curl -sL 'EXEC_URL_HERE'
```

Happy path — note there is **no `-X POST`**: curl must be allowed to follow
the 302 with a GET exactly the way a browser does (forcing POST re-POSTs the
redirect and fails):

```bash
curl -sL 'EXEC_URL_HERE' --data '{"name":"Test User","email":"tom@tom-panos.com","phone":"(512) 555-0134","date":"2026-09-10","altDate":"2026-09-11","tripLength":"Full Day","skill":"Novice","website":"","t":20000}'
```

Expect `{"ok":true}`, then verify all three destinations: the Sheet row
(Status `New`, Email Status `Sent`, Calendar Status `Created`), the
confirmation email in the inbox — not spam; test a non-Gmail address too —
and an all-day event on **exactly** Sep 10 (that is the timezone check).

Then the guardrails:

| Send | Expect |
| --- | --- |
| bad email / past date / `"tripLength":"Whatever"` | `{"ok":false,"error":…}`, no row, no email |
| `"website":"http://spam.example"` | silent `{"ok":true}`, **no row** |
| `"t":800` | silent `{"ok":true}`, **no row** |
| the happy-path body a second time | row flagged `Duplicate`, no second email/event |
| `--data 'not json'` | `{"ok":false,"error":"Bad request."}` — JSON, never an HTML page |

### From the browser (step 9, and worth doing from localhost first)

Serve the repo (`python3 -m http.server 8899`), submit the form, and watch the
Network tab: one POST (Content-Type `text/plain;charset=UTF-8`, **no OPTIONS
preflight**) → 302 → GET to `script.googleusercontent.com` → 200 JSON, zero
CORS errors in the console, and the confirmation card only after the response.
If the request instead dies against `accounts.google.com`, the deployment's
access is set to "Anyone with Google account" — redo set-up step 6.

To keep test rows out of the Sheet Chris watches, a second temporary web-app
deployment (its own URL) works as a staging endpoint — delete it afterwards.
The **Test deployments** `/dev` URL is *not* usable for this: it requires a
signed-in Google session and will not serve the site's anonymous requests.

## Current demo deployment (Aug 8, 2026)

The whole flow above was exercised end-to-end in **tom@s3labs.tech** as a
staging run before Chris's credentials arrive. `APPS_SCRIPT_URL` in
`index.html` currently points at that demo web app; emails send from
tom@s3labs.tech and HOLD events land on that calendar.

- Sheet: "BCFG Booking Requests (DEMO)" in tom@s3labs.tech's My Drive
- Script: "BCFG Booking Backend (DEMO)", container-bound to that sheet,
  deployment `v1-demo` (currently Version 2 — Version 1 shipped a duplicate
  check that broke when appendRow coerced the date string to a Date cell;
  `isoOf_()` and the spreadsheet-timezone repair fixed it, and the redeploy
  went through Manage deployments → Edit → New version, confirming the
  same-URL path this runbook describes)
- Verified live: happy path, validation rejects, honeypot + fill-time silent
  drops, duplicate suppression, browser POST from the site with no CORS
  preflight and a readable JSON response, confirmation email delivery, and
  all-day HOLD events on the correct Central-time day

**At launch:** run "Set up (once)" in Chris's account, swap `APPS_SCRIPT_URL`
in `index.html` to the new `/exec` URL, and retire the demo (archive the
deployment in the demo Apps Script project; keep or delete the demo sheet).

## Explicitly out of scope (as agreed)

- **Unavailable-dates on the form's date picker** — the source of availability
  data was never decided; the form takes any future date and Chris confirms.
- **An instant owner-alert email per request** — see the Notes for Chris.
- **hello@ on the new domain** — no mailbox exists yet (owning a domain does
  not create one); confirmations send from the BCFG Gmail, which also catches
  replies.
