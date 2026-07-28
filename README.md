# Blue Collar Fishing Guide — website

One-page marketing site for Blue Collar Fishing Guide, a Central Texas bass fishing
guide service based in New Braunfels, TX.

Static HTML/CSS/JS. **No build step, no dependencies, no framework.**

## Layout

```
index.html            The website
prototype/index.html  Desktop + mobile review harness (frames the live site)
bcfg/                 All photography and logos (107 files)
vercel.json           Cache headers for /bcfg/*
design-source/        Original Claude Design files — reference only, not served
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
bottom of `index.html`, marked with `EDIT` comments.

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

## The prototype page

`/prototype/` frames the live site at desktop (1440×900) and mobile (390×844),
both at 1:1, for reviewing the two breakpoints side by side. It is marked
`noindex` and is a review tool, not a public page.

Toolbar: **Both / Desktop / Mobile** switch which frames are shown, **Reload**
refreshes them in place, **Full Screen** expands the site over the current tab
(Escape closes), and **Open Full Site** opens the real site at `/` in a new tab
with none of the prototype chrome.

## Notes

- The chart in "The Scene" uses Esri World Imagery tiles loaded at runtime from
  `server.arcgisonline.com`. Attribution is displayed on the map. This is a
  third-party runtime dependency — if those tiles ever move, the map background
  goes blank while the pins keep working.
- The inquiry form has no backend. Submitting opens the visitor's email client
  with the message pre-filled to `bluecollarfishingguide@gmail.com`.
- Fonts (Anton, Inter, Oswald) load from Google Fonts.
