# The Scene: chart + lake dossier

Design spec, 2026-08-04. Reworks the map section of `index.html` so that
clicking a lake surfaces its information beside the chart instead of scrolling
the reader away from it.

## Why

"The Scene" is a fixed satellite chart of Central Texas with eight lake pins,
a row of lake chips, and eight accordion cards stacked underneath. The pins and
the chips both call `go(id)`, which opens that lake's accordion card and
smooth-scrolls the page down to it.

So the moment anyone touches the map, the map leaves the screen. The chart is
the most distinctive thing on the page and it is also the thing the interaction
throws away. There is no hover state, no selected state, and nothing that ties
a pin to the card that answers it — a reader who taps three lakes in a row
scrolls up and down three times and never sees the pin they picked.

The intent is to make the chart and the lake information behave as one object:
pick a lake on the map, read about it beside the map, decide, book.

## Shape

Two layouts, one set of content.

**Wide (over 900px).** `#scene` is a two-column grid. The chart and the lake
chips sit in the left column, chips directly under the chart so they read as
its legend. The right column holds the dossier: the panel for the selected
lake. Picking a pin or a chip swaps which panel is showing. Nothing scrolls.

**Narrow (900px and under).** One column: chart, chips, then all eight lake
panels stacked and scrollable. Picking a pin or a chip scrolls to that lake's
panel, which is what the section does today and the behaviour worth keeping —
on a phone a reader browsing eight lakes wants to keep scrolling, not to
operate a control to see each one.

The chart stays a fixed vintage chart. No map library, no pan, no zoom. The
framed "CHART No. 1" cartouche is the design, not a placeholder for a real map.

## The dossier panel

One per lake, eight in the document. Each carries what its accordion card
carries today, restructured:

- character tag ("Clear Water"), lake name, one-line description
- stats line: acreage and one fact
- drive times from AUS, SAT and GRK
- the photo strip, filled by the existing gallery loop
- **new:** a "Book Canyon Lake" link anchoring to `#book`

The name becomes a real `<h3>`. Today it is a `<span>` inside the accordion's
header button; in a panel it can be a heading under the section's `<h2>`
without disturbing the one-`<h1>` rule from the SEO pass.

Drive times become label-left / value-right rows in both layouts. The current
three-column grid does not fit a ~400px dossier column, and the row treatment
already exists — it is what `[data-r=drive]` switches to under 720px. That rule
and its grid then have no remaining user and get deleted.

## Content stays in the HTML

All eight panels are authored in the page and are visible by default. The
script hides the seven unselected ones on load, and a stylesheet rule keyed to
the narrow breakpoint forces them all back:

```css
@media (max-width:900px){ [data-lake]{display:block!important} }
```

The `!important` is not a hack here — it is the only way a stylesheet rule
beats the inline `display` the script sets, and it is the pattern the file
already uses for every `[data-r=…]` override.

The alternative was moving the lake copy into the `LAKES` table and rendering
one panel from it. Rejected. That prose is the page's local-SEO surface — lake
names, acreage, airports, "smallmouth" — and the same eight lakes are named in
the `LocalBusiness` JSON-LD, which the file's own comment says must stay in
step with what the page states. Moving it into JS strings would make the
structured data describe content no crawler can read. The site has exactly one
JS-dependent block today, the booking form, and that is because a form
genuinely cannot work without JS. Lake copy can.

The upshot for noscript is a straight improvement: today a reader without JS
sees eight headers and one open body, and seven controls that do nothing. After
this they see all eight dossiers in full, which is simply the page.

`LAKES` does not change. Its `label` field is dead — nothing reads it — and can
go while we are in there.

## Selected states

Painted by the script, directly on the elements, the way the booking form's
morning/afternoon buttons are painted by `bfPaintSlots`. The stylesheet's own
comment states this rule: state that changes as you click is the script's job.

- Selected pin: the dot grows and brightens, unselected dots dim slightly.
- Selected chip: navy fill, white text.

One stylesheet exception is unavoidable. Pin labels are hidden under 560px with
`display:none!important`, which no inline style can beat, so the selected
lake's label needs `[data-pinlabel][data-on]{display:inline-block!important}`
to win on specificity. Only ever one label is forced visible, so the tight
Travis / Lake Austin / Lady Bird cluster cannot produce overlapping labels.

## Accessibility

The wide layout is arguably the tabs pattern: a row of controls, one panel
visible at a time, panel adjacent to controls. The narrow layout is not — every
panel is on screen and the chips are jump links. Tab semantics would therefore
have to be applied and stripped as the viewport crosses 900px, which means a
`matchMedia` listener rewriting roles on resize.

Not doing that. The chips and pins stay plain `<button>`s in both layouts,
carrying `aria-current="true"` when selected and `aria-controls` pointing at
the panel they show. `aria-current` is exactly "the current item in a set",
which is true in both layouts, and it announces on activation. What is lost
against real tabs is arrow-key movement across the chips and a "3 of 8"
position announcement; what is gained is that one set of behaviour holds at
every width, with no resize listener to get out of step with the CSS. For a
section that has to work identically on a phone and a computer, that trade is
the right way round.

The pins are not tabs in either layout — two tablists driving one set of panels
would be wrong regardless. They keep the `aria-label` they already have.

Focus is not moved on selection. Taking it would cost a reader their place in a
row they are browsing, and in the narrow layout the scroll is the feedback.

## What goes

Deleted: the accordion chrome (`data-acc` headers, `data-sign` badges,
`data-body` wrappers, their `aria-expanded` wiring), `render()`, the `data-acc`
click binding, `go()`'s unconditional scroll, and the `[data-r=drive]` rules.

Kept untouched: the `LAKES` table, the whole chart (tiles, cartouche, New
Braunfels pin, AUS/SAT/GRK labels, Esri attribution and the `insertBefore`
trick that keeps it last), the pin and chip injection loop, the gallery fill
loop, the lightbox, and everything outside `#scene`.

The gallery loop keys on `[data-gallery="<id>"]`, so panels keeping that
attribute inherit it with no change — including Lake Austin at `n: 0`, whose
static "photo coming soon" block moves across as-is.

The intro line still promises drive times and should mention the panel.

## Risks

- **Content-height jitter.** Swapping lakes in the wide layout changes the
  dossier's height. Rather than ship it and see, the dossier gets a `min-height`
  in the wide layout from the outset — the same fix `[data-bookcard]` uses for
  the booking form swap, and the same reason: nothing on the page should move
  because someone picked a different lake. Measure the tallest panel and set the
  floor there. The rule is scoped to the wide layout; stacked on a phone it
  would only leave a gap.
- **Chip row on desktop.** Eight pills are about 1000px and the left column is
  roughly 640px. They wrap above 900px and stay a `[data-hs]` scroller below.
- **The `[data-on]` specificity override** needs checking at exactly 560px.
  Fallback: have the script remove and restore the `data-pinlabel` attribute.
- **Esri tiles** remain a third-party runtime dependency. If they fail the
  chart goes blank and the pins and dossier keep working — a smaller blast
  radius than today, since the content no longer depends on reading the map.
- **`verify-assets.mjs`** parses the `LAKES` table out of the script text. The
  table is untouched, but the check has to be run.

## Verification

- Widths 1280, 901, 900, 720, 560 and 390: layout, chip wrap and scroll, the
  forced pin label, no horizontal overflow.
- `preview.html` at 390px, which frames the site in a phone.
- Wide layout: pick every lake, confirm no page scroll and no photo-column jump.
- Narrow layout: confirm all eight panels are present and a pick scrolls.
- Keyboard: tab through pins and chips, arrow keys across the chips in the wide
  layout, Escape still closes the lightbox.
- Scripting off: all eight dossiers visible, no dead controls.
- `node verify-assets.mjs` clean, no console errors.
