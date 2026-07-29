# Blue Collar Fishing Guide — website

One-page marketing site for Blue Collar Fishing Guide, a Central Texas bass fishing
guide service based in New Braunfels, TX.

Static HTML/CSS/JS. **No build step, no dependencies, no framework.**

## Layout

```
index.html                   Preview landing page — the site in a phone frame
site/index.html              The website
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

The calendar is also the date picker for the inquiry form. Tapping a green day
fills the form's **Preferred date** (required) or **Alternate date** (optional),
whichever of the two buttons above the calendar is highlighted; both dates are
written into the inquiry email. A booked day cannot be picked — its cell is not
a button, and typing that date into either field stops the form from submitting.
So `BOOKED` is the single place that closes a day off.

**Reviews** — the "What Anglers Say" cards come from `REVIEWS`. Four to six
reads best: three across on a computer, stacked on a phone. Keep a quote to two
or three sentences, and set `from` to a hometown or the lake they fished.

> **Every quote shipped today is a placeholder, not a real customer.** Each
> carries `placeholder: true`, which draws a visible "Placeholder" badge on that
> card and a note above the grid. When a real review arrives, replace the quote,
> name and `from`, and delete that entry's `placeholder: true` line. The badge
> and the note clear themselves once the last placeholder is gone — there is
> deliberately no single switch that turns the badges off, because that is what
> keeps invented testimonials from going out under a real person's name.

The reviews are also deliberately left out of the page's structured data. Review
markup fed to Google has to describe real reviews.

**Lake photos** — drop files into `bcfg/<lake>/` named `<lake>-01.jpg`,
`<lake>-02.jpg`, … then update that lake's `n` in the `LAKES` table to match the
number of photos. Lake Austin is at `n: 0` and shows a "photo coming soon"
placeholder until photos are added.

**Hero slideshow** — the header photo cycles every 5 seconds through
`bcfg/hero/hero-01.jpg` … `hero-42.jpg`. Add more files in sequence and raise
`HERO_COUNT`.

Prices, trip packages, contact details, and body copy are plain text in the HTML
and safe to edit directly.

## Search and sharing

The website's `<head>` carries its own title and description, Open Graph and
Twitter card tags, and a `LocalBusiness` block of structured data naming the
eight lakes, the three trip packages and their prices, and the contact details.

Everything in the structured data is also stated somewhere on the page, so when
a price or a lake changes, change it in both places.

Two things are deliberately left out until they can be done truthfully:

- **`og:url`, `canonical`, and the absolute `og:image`** need the live domain.
  They sit commented out in the `<head>` with a `YOUR-DOMAIN` placeholder —
  uncomment them at launch. Everything else works from any address.
- **Review structured data.** Review markup has to describe real reviews, so
  there is no `review` or `aggregateRating` while the quotes are placeholders.

The page has exactly one `<h1>`. The hero heading appears in two very different
layouts — over the photo on a phone, in the text column on a computer — but it
is a single element that grid areas move, not two headings with one hidden.

## Routing (important)

This deployment is set up for **review**, so the root shows the preview page
rather than the website:

| URL | Serves |
| --- | --- |
| `/` | the preview landing page |
| `/site/` | the real website |

These are real files in real directories, not config. That is deliberate:
**Vercel checks the filesystem before applying rewrites**, so a `rewrites` entry
on `/` can never override an `index.html` sitting at the root — it is silently
ignored. Moving the files is the only thing that actually changes what `/`
serves. (`vercel.json` redirects the old `/prototype/*` and `/mobile/*` URLs to `/`
so links already shared still work.)

### Going live

When the real domain is pointed at this project, the website has to be at the
root. Three steps:

1. `git mv index.html preview.html && git mv site/index.html index.html`
   — or simply move `site/index.html` to the root, replacing the preview page.
2. In the preview page, change `/site/` back to `/` (one iframe, one button).
3. Drop the redirects from `vercel.json` if you no longer want them.

The website's asset paths are root-absolute (`/bcfg/...`), so it renders
correctly from any of these locations — no path edits needed when it moves.

## The preview page

`/` is for showing the site to someone, not for visitors, and is marked
`noindex`.

It shows the site inside a phone frame at its true 390x844, so what you see is
the real mobile layout rather than a scaled-down picture of one. The frame
shrinks only on screens too narrow to hold it, and is never scaled up.

One button, **Full Site**, opens `/site/` in a new tab. The site is responsive,
so that gives the wide layout on a computer and the phone layout on a phone —
the right view for whatever device the reader is on.

There is deliberately no second "Mobile" button. An earlier version showed a
desktop frame and a phone frame side by side with a button for each, which
raised the obvious question of which one you were actually looking at and what
"Full Site" meant on a phone. `/mobile/` and `/prototype/` redirect to `/`.

On touch devices the frame is inert: a finger drag landing on an iframe scrolls
the site inside it rather than the page, which strands the reader partway down.
The frame stays live for mouse users, who have no such problem.

The frame loads `/site/?preview=1`, which pins the hero photo to its first
image. Two things drove that: a 42-image slideshow decoding a ~300KB JPEG every
five seconds behind a thumbnail is wasted work, and it made this page stutter
while scrolling on a phone. **Full Site** opens the site normally, slideshow and
all. The site applies the same static hero when a visitor has asked for reduced
motion.

The copy here is written for a non-technical reader — no pixel dimensions or
jargon.

## Notes

- The chart in "The Scene" uses Esri World Imagery tiles loaded at runtime from
  `server.arcgisonline.com`. Attribution is displayed on the map. This is a
  third-party runtime dependency — if those tiles ever move, the map background
  goes blank while the pins keep working.
- The inquiry form has no backend. Submitting opens the visitor's email client
  with the message pre-filled to `bluecollarfishingguide@gmail.com`.
- Fonts (Anton, Inter, Oswald) load from Google Fonts.
