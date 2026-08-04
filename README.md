# Blue Collar Fishing Guide — website

One-page marketing site for Blue Collar Fishing Guide, a Central Texas bass fishing
guide service based in New Braunfels, TX.

Static HTML/CSS/JS. **No build step, no dependencies, no framework.**

## Layout

```
index.html                   The website
preview.html                 Preview page — the site in a phone frame
bcfg/                        All photography and logos (107 files)
vercel.json                  Redirects for old URLs, cache headers for /bcfg/*
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
bottom of `index.html`, marked with `EDIT` comments.

**Booking form** — the "Book Your Trip" section is a form built into this page.
It asks for a name, an email, a phone number, a trip date, and morning or
afternoon, and it lives in two places in `index.html`: the markup inside
`<section id="book">`, and the `Booking form` block in the script at the bottom.

> ### ⚠️ The form does not send anything yet
>
> A submitted request is checked, formatted, and confirmed on screen — and
> that is the end of it. Nothing is emailed, stored, or posted anywhere, and
> closing the tab loses it. **Until this is connected, the phone number and
> email beside the form are the only booking path that reaches Chris.**
>
> The form is on the page so the design can be reviewed. Connecting it is the
> next piece of work: see `HAND-OFF POINT` in the submit handler, where a
> finished request sits ready to go. Three things go with it — a submitting
> state on the button, an error state for when the send fails, and holding the
> confirmation back until the request actually lands.

The design came from Claude Design ("Custom booking form design") and replaced
a [Fillout](https://fillout.com) embed, which is why the site no longer loads
anything from `server.fillout.com`. Before Fillout it was a hand-built
availability calendar and a `mailto:` form; the `BOOKED` date table that fed
that calendar is still gone, and this form does not offer or block dates.

Styling is inline beside the markup like the rest of the page. The exceptions
are in the stylesheet, because an inline style cannot reach them: `.bf-field`
focus, `.bf-submit` hover, `[data-r=pair]` stacking email and phone under
560px, and `[data-bookcard]`, which holds the column's height steady when the
form swaps for the shorter confirmation so the photo beside it does not jump.

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

**Lake write-ups** — the eight panels in "The Scene" are plain HTML, one
`<section data-lake="…">` each, and safe to edit directly. Beside the chart the
pins and the chip row pick which one shows; on a phone all eight are on the
page and picking one scrolls to it. They are authored visible and the script
hides the ones it is not showing, so a reader without JavaScript gets all
eight.

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

## Routing

The website is live at the root:

| URL | Serves |
| --- | --- |
| `/` | the website |
| `/preview.html` | the preview page, for showing the site to someone |

These are real files, not config. That is deliberate: **Vercel checks the
filesystem before applying rewrites**, so a `rewrites` entry on `/` can never
override an `index.html` sitting at the root — it is silently ignored. Moving
the files is the only thing that actually changes what `/` serves.

`vercel.json` redirects `/site/*`, `/prototype/*` and `/mobile/*` to `/`, so
every URL shared while the site was under review still lands somewhere useful.

The website's asset paths are root-absolute (`/bcfg/...`), so it renders
correctly from any location — no path edits are needed if it moves again.

### Still to do at launch

The project currently answers on `bcfg-website-v1.vercel.app` with no custom
domain attached. `canonical`, `og:url` and the absolute `og:image` are still
commented out in the `<head>` for that reason — point the real domain at the
project, then uncomment those three lines and swap in the domain. Setting them
to the `.vercel.app` address instead would be worse than leaving them off.

## The preview page

`/preview.html` is for showing the site to someone, not for visitors, and is
marked `noindex`. Nothing links to it — you send the link.

It shows the site inside a phone frame at its true 390x844, so what you see is
the real mobile layout rather than a scaled-down picture of one. The frame
shrinks only on screens too narrow to hold it, and is never scaled up.

One button, **Full Site**, opens `/` in a new tab. The site is responsive,
so that gives the wide layout on a computer and the phone layout on a phone —
the right view for whatever device the reader is on.

There is deliberately no second "Mobile" button. An earlier version showed a
desktop frame and a phone frame side by side with a button for each, which
raised the obvious question of which one you were actually looking at and what
"Full Site" meant on a phone. `/mobile/`, `/prototype/` and `/site/` all
redirect to `/`.

On touch devices the frame is inert: a finger drag landing on an iframe scrolls
the site inside it rather than the page, which strands the reader partway down.
The frame stays live for mouse users, who have no such problem.

The frame loads `/?preview=1`, which pins the hero photo to its first
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
  goes blank while the pins keep working. The lake write-ups beside the chart
  are plain HTML and do not touch those tiles, so a tile outage costs the map
  background and nothing else.
- The booking form is served from this page and has no third-party dependency
  of its own — the Fillout embed that used to be the second one is gone. It
  does still need JavaScript: the fields render without it, but nothing checks
  or sends them, so a `noscript` rule hides the form and a note in its place
  points at the phone number and email.
- Fonts (Anton, Inter, Oswald) load from Google Fonts.
