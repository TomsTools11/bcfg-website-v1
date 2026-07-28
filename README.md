# Blue Collar Fishing Guide — website

One-page marketing site for Blue Collar Fishing Guide, a Central Texas bass fishing
guide service based in New Braunfels, TX.

Static HTML/CSS/JS. **No build step, no dependencies, no framework.**

## Layout

```
index.html                   Preview landing page — desktop + phone side by side
site/index.html              The website
mobile/index.html            Preview — the phone version, centred
bcfg/                        All photography and logos (107 files)
vercel.json                  Cache headers for /bcfg/*
design-source/               Original Claude Design files — reference only
```

## Deploying to Vercel

Vercel serves this as a static site with zero configuration.

1. Vercel → **Add New** → **Project** → **Import Git Repository**
2. Pick `TomsTools11/bcfg-website-v1`
3. Framework Preset: **Other**. Leave Build Command and Output Directory **empty**.
4. Deploy.

Every push to `main` redeploys automatically.

## Editing content

All of the content that changes regularly lives in the `<script>` block at the
bottom of `site/index.html`, marked with `EDIT` comments.

**Booked dates** — the availability calendar shows the next 90 days from whenever
the page loads. Green is open, red is booked. Add or remove dates in `BOOKED`:

```js
var BOOKED = [
  '2026-07-25',
  '2026-08-01'
];
```

**Lake photos** — drop files into `bcfg/<lake>/` named `<lake>-01.jpg`,
`<lake>-02.jpg`, … then update that lake's `n` in the `LAKES` table to match the
number of photos. Lake Austin is at `n: 0` and shows a "photo coming soon"
placeholder until photos are added.

**Hero slideshow** — the header photo cycles every 5 seconds through
`bcfg/hero/hero-01.jpg` … `hero-42.jpg`. Add more files in sequence and raise
`HERO_COUNT`.

Prices, trip packages, contact details, and body copy are plain text in the HTML
and safe to edit directly.

## Routing (important)

This deployment is set up for **review**, so the root shows the preview page
rather than the website:

| URL | Serves |
| --- | --- |
| `/` | the preview landing page |
| `/site/` | the real website |
| `/mobile/` | the phone preview |

These are real files in real directories, not config. That is deliberate:
**Vercel checks the filesystem before applying rewrites**, so a `rewrites` entry
on `/` can never override an `index.html` sitting at the root — it is silently
ignored. Moving the files is the only thing that actually changes what `/`
serves. (`vercel.json` keeps redirects from the old `/prototype/*` URLs so
links already shared still work.)

### Going live

When the real domain is pointed at this project, the website has to be at the
root. Three steps:

1. `git mv index.html preview.html && git mv site/index.html index.html`
   — or simply move `site/index.html` to the root, replacing the preview page.
2. In the preview pages, change `/site/` back to `/` (search for `"/site/"`).
3. Drop the `/prototype` redirects from `vercel.json` if you no longer want them.

The website's asset paths are root-absolute (`/bcfg/...`), so it renders
correctly from any of these locations — no path edits needed when it moves.

## The preview pages

These are for showing the site to someone, not for visitors. Both are marked
`noindex`.

**`/`** is the landing page. It shows the site as it looks on a computer and on
a phone, side by side. Both frames are live — you can scroll them, open a lake,
tap through. They're scaled down together so the pair always fits the window,
but the site inside each frame still renders at its true width, so the desktop
frame gets the real desktop layout and the phone frame gets the real mobile
layout. Two buttons open the full-size versions in a new tab:

| Button | Opens |
| --- | --- |
| **Full Site** | `/site/` — the real website, no wrapper around it |
| **Mobile** | `/mobile/` — the phone version, centred |

**`/mobile/`** shows the site in a phone frame at its true 390×844, centred on
screen, shrinking only if the window is too small to fit it. It has **Back** to
the landing page and **Full Site**.

The copy on these pages is written for a non-technical reader — no pixel
dimensions or jargon.

## Notes

- The chart in "The Scene" uses Esri World Imagery tiles loaded at runtime from
  `server.arcgisonline.com`. Attribution is displayed on the map. This is a
  third-party runtime dependency — if those tiles ever move, the map background
  goes blank while the pins keep working.
- The inquiry form has no backend. Submitting opens the visitor's email client
  with the message pre-filled to `bluecollarfishingguide@gmail.com`.
- Fonts (Anton, Inter, Oswald) load from Google Fonts.
