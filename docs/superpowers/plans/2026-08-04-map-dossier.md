# Chart + Lake Dossier Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rework `#scene` so picking a lake surfaces its information beside the chart instead of scrolling the reader away from it.

**Architecture:** The eight accordion cards become eight dossier panels, authored in the HTML and always present. On a computer they sit in a second column beside the chart and the script shows one at a time; on a phone the columns collapse, a stylesheet rule forces every panel visible, and picking a lake scrolls to it. No new dependency, no build step, no map library.

**Tech Stack:** Static HTML/CSS/JS in a single `index.html`. One IIFE at the bottom of the file. Esri tiles for the chart imagery. Verification through the Claude Browser MCP tools against the `bcfg-site` launch config (python3 http.server on port 8899) and `node verify-assets.mjs`.

**Spec:** `docs/superpowers/specs/2026-08-04-map-dossier-design.md`

## Global Constraints

- **No build step, no framework, no JS libraries.** Everything ships as it is written.
- **Script style is ES5 in one IIFE:** `var`, `function`, no arrow functions, no `const`/`let`, no template literals. Use the existing `$`, `$$` and `pad` helpers (index.html:907-909).
- **Styling is inline on the element.** The `<head>` stylesheet carries only what an inline style cannot reach: hover/focus states, breakpoint overrides keyed on data attributes, and `!important` overrides of script-set inline styles.
- **Existing breakpoints only:** 900px (main mobile switch), 720px, 560px. Do not invent a new one.
- **Selected/active state is painted by the script**, directly on elements, following `bfPaintSlots` (index.html:1111). The stylesheet comment at index.html:178-182 states this rule.
- **Design tokens:** navy `#1d3059`, deep navy `#0e2244`, cream `#f8f7f3`, grey-blue panel `#eef0f3`, body grey `#5c6470`, orange `#e05c22`, hairline `rgba(14,34,68,.14)`, field border `rgba(14,34,68,.22)`. Cards `border-radius:12px`, buttons `6px`.
- **Fonts:** Oswald for uppercase UI and headings, Inter for body, Georgia italic for chart labels only.
- **Do not touch** the booking form, the hero, reviews, the footer, or anything outside `<section id="scene">` except the specific stylesheet and README lines named in these tasks.
- **Copy is carried over verbatim.** Do not rewrite any lake's tag, name, blurb, acreage, fact, or drive times. Exact values are in the table in Task 1.
- **`LAKES` table stays as-is** apart from deleting the dead `label` field (nothing reads it).
- There is no test runner. Every task's verification is browser checks with exact expected values, plus `node verify-assets.mjs`.

---

## File Structure

Everything happens in one file. The section is contiguous and the script block is one IIFE, so splitting across files would fight the project's whole shape.

- **Modify: `index.html`** — the only code file.
  - File-header `HOW TO EDIT` comment (lines 7-21)
  - Stylesheet media blocks (lines ~236-252)
  - `<section id="scene">` markup (lines 351-544)
  - Gallery fill loop (lines ~994-1013) — read only, must keep working
  - "Lake accordion" + "Map pins + lake chips" script blocks (lines ~1256-1326)
  - `LAKES` table (line ~896)
- **Modify: `README.md`** — the "Lake photos" note and the "Notes" bullet about the chart.
- **Run, do not edit: `verify-assets.mjs`** — parses the `LAKES` table out of the script text.
- **Verify against, do not edit: `preview.html`** — frames the site at 390px.

---

### Task 1: Accordion cards become dossier panels

Turns the eight collapsible cards into eight always-visible panels. Nothing moves position yet and the page keeps working the whole way: pins and chips still scroll to a lake, but every lake's information is now readable without opening anything. This is exactly the behaviour the phone layout keeps at the end.

**Files:**
- Modify: `index.html` — `#scene` cards (lines 381-544), stylesheet 720px block (lines 240-245), accordion script (lines 1256-1292), `LAKES` table (line ~896)

**Interfaces:**
- Consumes: nothing from other tasks.
- Produces: eight elements matching `[data-lake="<id>"]`, each with `id="lake-<id>"`, containing an unchanged `[data-gallery="<id>"]` strip. Task 2 toggles their inline `display`. Task 3 reads nothing from them. `go(id)` survives as a scroll-only function that Task 2 replaces.

- [ ] **Step 1: Delete the two `[data-r=drive]` rules from the stylesheet**

The three-column drive-times grid cannot fit a ~450px dossier column, so drive times become rows at every width and this override loses its only user. In the `@media (max-width:720px)` block (index.html:240-245), delete these three lines:

```css
  [data-r=drive]{grid-template-columns:1fr!important;gap:8px!important}
  [data-r=drive]>div{display:flex;align-items:center;justify-content:space-between;gap:12px}
  [data-r=drive]>div>span{margin:0!important}
```

Leave `[data-r=three]` in that block alone.

- [ ] **Step 2: Rewrite the eight cards as dossier panels**

Replace each card — the whole `<div id="lake-<id>" …>` block including its `data-acc` header button, its `data-sign` badge and its `data-body` wrapper — with a panel. Here is Canyon Lake in full; the other seven are mechanically identical with the values from the table below.

```html
      <section data-lake="canyon" id="lake-canyon" aria-labelledby="name-canyon" style="background:#fff;border:1px solid rgba(14,34,68,.14);border-radius:12px;padding:18px">
        <span style="display:block;font:600 11px/1 'Oswald',sans-serif;letter-spacing:1.8px;text-transform:uppercase;color:#1d3059;margin-bottom:5px">Clear Water</span>
        <h3 id="name-canyon" style="font:600 21px/1.15 'Oswald',sans-serif;letter-spacing:.5px;text-transform:uppercase;color:#1d3059;margin:0 0 7px">Canyon Lake</h3>
        <p style="font-size:14.5px;color:#5c6470;line-height:1.5;margin:0 0 14px">Gin-clear and unforgiving, the lake that teaches you finesse.</p>
        <div style="display:flex;flex-wrap:wrap;gap:6px 16px;font:500 12px/1.4 'Oswald',sans-serif;letter-spacing:1px;text-transform:uppercase;color:#1d3059;margin-bottom:14px"><span>8,308 acres</span><span style="color:#5c6470">Deepest lake in Texas at 140+ feet</span></div>
        <div style="display:grid;gap:8px;margin-bottom:14px">
          <div style="background:#f8f7f3;border-radius:8px;padding:11px 13px;display:flex;align-items:center;justify-content:space-between;gap:12px"><span style="font:500 11px/1 'Oswald',sans-serif;letter-spacing:1.3px;text-transform:uppercase;color:#5c6470">Austin (AUS)</span><span style="font:600 15px/1.2 'Oswald',sans-serif;color:#1d3059">51 mi &middot; ~55 min</span></div>
          <div style="background:#f8f7f3;border-radius:8px;padding:11px 13px;display:flex;align-items:center;justify-content:space-between;gap:12px"><span style="font:500 11px/1 'Oswald',sans-serif;letter-spacing:1.3px;text-transform:uppercase;color:#5c6470">San Antonio (SAT)</span><span style="font:600 15px/1.2 'Oswald',sans-serif;color:#1d3059">43 mi &middot; ~45 min</span></div>
          <div style="background:#f8f7f3;border-radius:8px;padding:11px 13px;display:flex;align-items:center;justify-content:space-between;gap:12px"><span style="font:500 11px/1 'Oswald',sans-serif;letter-spacing:1.3px;text-transform:uppercase;color:#5c6470">Killeen (GRK)</span><span style="font:600 15px/1.2 'Oswald',sans-serif;color:#1d3059">110 mi &middot; ~1 hr 45 min</span></div>
        </div>
        <div data-hs data-gallery="canyon" style="display:flex;gap:8px;padding-bottom:8px"></div>
        <a href="#book" style="display:inline-flex;align-items:center;justify-content:center;min-height:48px;margin-top:4px;padding:0 22px;background:#1d3059;color:#fff;border-radius:6px;font:500 13px/1 'Oswald',sans-serif;letter-spacing:1.4px;text-transform:uppercase">Book Canyon Lake</a>
      </section>
```

Per-lake values. `CTA` is the text of the `<a href="#book">`, and the panel's `aria-labelledby`/`h3 id` is always `name-<id>`.

| id | tag | h3 | blurb | acres | fact | AUS | SAT | GRK | CTA |
|---|---|---|---|---|---|---|---|---|---|
| canyon | Clear Water | Canyon Lake | Gin-clear and unforgiving, the lake that teaches you finesse. | 8,308 acres | Deepest lake in Texas at 140+ feet | 51 mi &middot; ~55 min | 43 mi &middot; ~45 min | 110 mi &middot; ~1 hr 45 min | Book Canyon Lake |
| travis | Big Water | Lake Travis | Deep Highland Lakes water with a summer schooling bite worth the drive. | 18,622 acres | 63 miles of winding Colorado River canyon | 35 mi &middot; ~45 min | 90 mi &middot; ~1 hr 30 min | 60 mi &middot; ~1 hr 5 min | Book Lake Travis |
| ladybird | In-Town Water | Lady Bird Lake | Big, educated bass right through the middle of downtown Austin. | 416 acres | No gas motors allowed, so it fishes quiet | 8 mi &middot; ~15 min | 75 mi &middot; ~1 hr 15 min | 70 mi &middot; ~1 hr 10 min | Book Lady Bird Lake |
| lbj | Big Bass | Lake LBJ | Constant-level dock water with a legit shot at a giant. | 6,534 acres | Held at a constant level year-round | 62 mi &middot; ~1 hr 10 min | 95 mi &middot; ~1 hr 40 min | 70 mi &middot; ~1 hr 20 min | Book Lake LBJ |
| austin | Big Bass | Lake Austin | Grass, docks, and some of the biggest largemouth in Texas. | 1,599 acres | Has produced 13-pound-plus ShareLunker bass | 15 mi &middot; ~25 min | 80 mi &middot; ~1 hr 20 min | 75 mi &middot; ~1 hr 15 min | Book Lake Austin |
| belton | Smallmouth | Lake Belton | Our smallmouth water, brown fish over clear Hill Country rock. | 12,385 acres | One of the best smallmouth fisheries in Texas | 73 mi &middot; ~1 hr 10 min | 130 mi &middot; ~1 hr 55 min | 12 mi &middot; ~20 min | Book Lake Belton |
| stillhouse | Sleeper Water | Stillhouse Hollow | Belton's quieter neighbor, clear, grassy, and full of quality fish. | 6,430 acres | Known for hydrilla beds that hold big fish | 65 mi &middot; ~1 hr | 125 mi &middot; ~1 hr 50 min | 10 mi &middot; ~15 min | Book Stillhouse Hollow |
| buchanan | Highland Lakes | Lake Buchanan | Big open water at the top of the chain, wind-blown rock and stout largemouth. | 22,333 acres | Largest of the Highland Lakes | 75 mi &middot; ~1 hr 25 min | 115 mi &middot; ~1 hr 55 min | 65 mi &middot; ~1 hr 15 min | Book Lake Buchanan |

**Lake Austin is the one exception.** It has no photos (`n: 0`), so instead of the `[data-gallery="austin"]` strip it keeps its existing placeholder block verbatim, in the same position:

```html
        <div style="border:1px dashed rgba(14,34,68,.28);border-radius:8px;padding:22px;text-align:center;font:500 12px/1.5 'Oswald',sans-serif;letter-spacing:1.6px;text-transform:uppercase;color:#5c6470;background:repeating-linear-gradient(45deg,#f8f7f3,#f8f7f3 10px,#eef0f3 10px,#eef0f3 20px)">Lake Austin photo coming soon</div>
```

Note `Belton's` and `neighbor` in the Stillhouse blurb: the apostrophe in the source file is the typographic `&rsquo;` character `’`, not `'`. Copy the blurb from the existing card rather than retyping it.

Leave the wrapping `<div style="display:grid;gap:12px">` around the eight panels in place — Task 2 turns it into the dossier column.

- [ ] **Step 3: Delete the accordion script**

In the `/* ---------- Lake accordion ---- */` block (index.html:1256-1292), delete `var open`, the whole `render()` function, and the `$$('[data-acc]')` click binding. Keep `go(id)` but strip the now-meaningless open-state lines, leaving only the scroll:

```js
  /* ---------- Lake selection ----------------------------------------- */

  function go(id) {
    var el = document.getElementById('lake-' + id);
    if (!el) return;
    window.scrollTo({
      top: el.getBoundingClientRect().top + window.pageYOffset - 90,
      behavior: 'smooth'
    });
  }
```

Also delete the bare `render();` call near the end of the IIFE (index.html:1326) — it no longer exists.

- [ ] **Step 4: Drop the dead `label` field from the `LAKES` table**

Nothing reads `lake.label`. Remove the `label: '…'` key from all eight rows (index.html:897-904). Leave `id`, `name`, `full`, `n`, `left` and `top` untouched — `verify-assets.mjs` parses `n` out of this table.

- [ ] **Step 5: Start the preview and check the page still works**

```bash
node verify-assets.mjs
```

Expected: `OK: zero missing, zero orphaned.`

Then start the preview server with the Claude Browser MCP (`preview_start` with `{name: "bcfg-site"}`), navigate to `http://localhost:8899/`, and run:

```js
JSON.stringify({
  panels: document.querySelectorAll('[data-lake]').length,
  headings: document.querySelectorAll('[data-lake] h3').length,
  h1s: document.querySelectorAll('h1').length,
  ctas: document.querySelectorAll('[data-lake] a[href="#book"]').length,
  accordionLeftovers: document.querySelectorAll('[data-acc],[data-sign],[data-body]').length,
  driveLeftovers: document.querySelectorAll('[data-r=drive]').length,
  galleryThumbs: document.querySelectorAll('[data-gallery] button').length,
  austinPlaceholder: /photo coming soon/i.test(document.querySelector('#lake-austin').textContent)
    && !document.querySelector('#lake-austin [data-gallery]')
})
```

Expected: `panels: 8`, `headings: 8`, `h1s: 1`, `ctas: 8`, `accordionLeftovers: 0`, `driveLeftovers: 0`, `galleryThumbs: 61` (18+8+1+20+0+5+4+5), `austinPlaceholder: true`.

- [ ] **Step 6: Check the console and the pins**

Read console messages with `onlyErrors: true`. Expected: no errors.

Then confirm a pin still scrolls:

```js
document.documentElement.style.scrollBehavior='auto';
var before = window.scrollY;
document.querySelector('#chart button[aria-label="Lake Belton"]').click();
JSON.stringify({moved: window.scrollY !== before})
```

Expected: `moved: true`.

- [ ] **Step 7: Commit**

```bash
git add index.html
git commit -m "The Scene: accordion cards become dossier panels

Every lake's information is now on the page rather than behind a
disclosure, each panel a section with a real h3 under the section's h2.
Drive times become label-and-value rows at every width, which the 720px
breakpoint already did and a narrower column will need, so the
three-column grid and its override go.

The panels do not move yet and the pins and chips still scroll to them.

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 2: Two columns, and one panel at a time on a computer

Puts the chart and the dossier side by side and makes selection swap the panel in place. Below 900px a stylesheet rule forces every panel back on screen, so the phone keeps the scrollable stack from Task 1.

**Files:**
- Modify: `index.html` — `#scene` wrapper markup, stylesheet 900px blocks, lake selection script

**Interfaces:**
- Consumes: `[data-lake="<id>"]` panels and `go(id)` from Task 1.
- Produces: `select(id, viaClick)` — sets `selected`, toggles panel `display`, and scrolls only when the viewport is narrow and the call came from a click. Task 3 adds a `paintScene()` call inside it. Also produces `var selected` (a lake id string) and `#lakeDossier`.

- [ ] **Step 1: Wrap the section in a two-column grid**

In `#scene`, wrap `#chart` and `#lakeChips` in a left column and the eight panels in a right column. The chips stay directly under the chart so they read as its legend, and this DOM order is already the right stacking order on a phone.

```html
    <div data-r="scene" style="display:grid;grid-template-columns:1.15fr .85fr;gap:28px;align-items:start">
      <div>
        <!-- existing <div id="chart"> … </div> -->
        <!-- existing <div id="lakeChips" …></div> -->
      </div>
      <div id="lakeDossier" style="display:grid;gap:12px;align-content:start">
        <!-- the eight <section data-lake="…"> panels from Task 1 -->
      </div>
    </div>
```

The old `<div style="display:grid;gap:12px">` that wrapped the panels becomes `#lakeDossier` — add the id and `align-content:start`, keep the rest. Leave `#chart`'s own inline styles alone, including `max-width:760px;margin:0 auto 16px`.

- [ ] **Step 2: Add the three stylesheet rules**

In the `@media (max-width:900px)` block, alongside `[data-r=two]` and `[data-r=book]`:

```css
  [data-r=scene]{grid-template-columns:1fr!important;gap:16px!important}
  /* Every lake is on screen at once here, so a reader can keep scrolling
     instead of operating a control to see each one. This overrides the
     display:none the script puts on the panels it is not showing, which
     only makes sense beside the chart. */
  [data-lake]{display:block!important}
```

In the `@media (min-width:901px)` block, alongside `[data-mob]` and `[data-bookcard]`:

```css
  /* Eight pills are wider than the chart column, and the horizontal
     scroller they live in is a phone affordance. */
  #lakeChips{flex-wrap:wrap}
```

- [ ] **Step 3: Replace `go()` with `select()`**

In the "Lake selection" block, replace the whole `go()` function:

```js
  var selected = 'canyon';

  /* Below 900px every panel is on screen (see the stylesheet), so picking a
     lake means scrolling to it. Beside the chart it means swapping which
     panel is showing and not moving the page at all. matchMedia is read at
     click time rather than listened to, because the CSS already re-decides
     what is visible on its own when the window is resized. */
  var narrow = window.matchMedia('(max-width:900px)');

  function select(id, viaClick) {
    selected = id;
    LAKES.forEach(function (lake) {
      var panel = $('[data-lake="' + lake.id + '"]');
      if (panel) panel.style.display = (lake.id === id) ? 'block' : 'none';
    });
    if (viaClick && narrow.matches) {
      var el = document.getElementById('lake-' + id);
      if (el) {
        window.scrollTo({
          top: el.getBoundingClientRect().top + window.pageYOffset - 90,
          behavior: 'smooth'
        });
      }
    }
  }
```

- [ ] **Step 4: Point the pins and chips at `select`**

In the "Map pins + lake chips" loop, change both click handlers from `go(lake.id)` to `select(lake.id, true)`, and give each control an `aria-controls` pointing at the panel it shows. For the pin, after the existing `pin.setAttribute('aria-label', lake.full);`:

```js
    pin.setAttribute('aria-controls', 'lake-' + lake.id);
```

For the chip, after `chip.textContent = lake.full;`:

```js
    chip.setAttribute('aria-controls', 'lake-' + lake.id);
```

Then at the end of the IIFE, where `render();` used to be, initialise without scrolling:

```js
  select(selected, false);
```

- [ ] **Step 5: Check the wide layout swaps without scrolling**

Reload at desktop width and run:

```js
document.documentElement.style.scrollBehavior='auto';
var shown = function(){ return [].slice.call(document.querySelectorAll('[data-lake]'))
  .filter(function(p){ return getComputedStyle(p).display !== 'none'; })
  .map(function(p){ return p.getAttribute('data-lake'); }); };
var atStart = shown();
var y = window.scrollY;
document.querySelector('#lakeChips button:nth-child(6)').click();
JSON.stringify({vw: innerWidth, atStart: atStart, afterClick: shown(), scrolled: window.scrollY !== y})
```

Expected at 1251px: `atStart: ["canyon"]`, `afterClick: ["belton"]`, `scrolled: false`.

- [ ] **Step 6: Check the narrow layout shows everything and scrolls**

Resize to the mobile preset (375x812), reload, then run the same `shown()` helper plus a click:

```js
document.documentElement.style.scrollBehavior='auto';
var shown = function(){ return [].slice.call(document.querySelectorAll('[data-lake]'))
  .filter(function(p){ return getComputedStyle(p).display !== 'none'; }).length; };
var y = window.scrollY;
document.querySelector('#lakeChips button:nth-child(6)').click();
JSON.stringify({vw: innerWidth, visible: shown(), scrolled: window.scrollY !== y, docW: document.documentElement.scrollWidth})
```

Expected: `visible: 8`, `scrolled: true`, `docW: 375` (no horizontal overflow).

- [ ] **Step 7: Check the boundary and the chip wrap**

Resize to 901x900, reload, and confirm `visible: 1` and `getComputedStyle(document.querySelector('#lakeChips')).flexWrap === 'wrap'`. Then resize to 900x900, reload, and confirm `visible: 8` and `flexWrap === 'nowrap'`. Take a screenshot at 1251px wide with the section in view and confirm the chart sits left, chips wrapped beneath it, one dossier panel right.

- [ ] **Step 8: Commit**

```bash
git add index.html
git commit -m "The Scene: chart and dossier side by side

The chart and the lake chips take a left column and the dossier takes a
right one, so picking a lake reads beside the map instead of scrolling
the map off the screen. Below 900px the columns collapse and a stylesheet
rule puts every panel back, because on a phone a reader browsing eight
lakes wants to keep scrolling rather than operate a control for each one.

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 3: Selected states on the pins and chips

Without this the reader picks a lake and the map gives no sign of it. Painted by the script, following `bfPaintSlots`.

**Files:**
- Modify: `index.html` — stylesheet 560px block, pin/chip injection loop, `select()`

**Interfaces:**
- Consumes: `select(id, viaClick)` and `var selected` from Task 2.
- Produces: `paintScene()`, called at the end of `select()`. Requires the injection loop to have stashed each lake's pin and chip in `SCENE_CONTROLS[lake.id] = {pin: …, chip: …}`.

- [ ] **Step 1: Let the selected pin keep its label on a phone**

Pin labels are hidden under 560px with `display:none!important`, which no inline style can beat. Add a higher-specificity rule to the `@media (max-width:560px)` block, right after the existing `[data-pinlabel]` rule:

```css
  /* The lake you picked keeps its name, so the chart still says where you
     are once the labels are too tight to all show. Two attributes beat one,
     which is what it takes to get past the !important above. */
  [data-pinlabel][data-on]{display:inline-block!important}
```

- [ ] **Step 2: Stash the controls as they are injected**

Above the `LAKES.forEach` that builds pins and chips, add:

```js
  var SCENE_CONTROLS = {};
```

Inside that loop, after the pin is created and after the chip is created, record them — put this immediately before `if (chips) chips.appendChild(chip);`:

```js
    SCENE_CONTROLS[lake.id] = { pin: pin, chip: chip };
```

- [ ] **Step 3: Write `paintScene`**

Add this above `select()`, so it is defined before `select` calls it:

```js
  /* The chart's answer to "which one did I pick". Painted here rather than
     in the stylesheet because it changes as you click, which is the same
     reason the booking form's morning and afternoon buttons are painted in
     bfPaintSlots. aria-current is the accessible half of the same message:
     these are plain buttons at every width, not tabs, because on a phone
     every panel is showing and there is nothing for a tab to reveal. */
  function paintScene() {
    LAKES.forEach(function (lake) {
      var pair = SCENE_CONTROLS[lake.id];
      if (!pair) return;
      var on = lake.id === selected;

      var dot = pair.pin.firstElementChild;
      dot.style.width = on ? '16px' : '12px';
      dot.style.height = on ? '16px' : '12px';
      dot.style.borderWidth = on ? '3px' : '2px';
      dot.style.boxShadow = on
        ? '0 0 0 4px rgba(224,92,34,.35),0 2px 8px rgba(0,0,0,.5)'
        : '0 2px 8px rgba(0,0,0,.5)';
      pair.pin.style.zIndex = on ? '2' : '1';

      var label = pair.pin.lastElementChild;
      if (on) label.setAttribute('data-on', '');
      else label.removeAttribute('data-on');

      pair.chip.style.background = on ? '#1d3059' : '#fff';
      pair.chip.style.color = on ? '#fff' : '#1d3059';
      pair.chip.style.borderColor = on ? '#1d3059' : 'rgba(14,34,68,.18)';

      if (on) {
        pair.pin.setAttribute('aria-current', 'true');
        pair.chip.setAttribute('aria-current', 'true');
      } else {
        pair.pin.removeAttribute('aria-current');
        pair.chip.removeAttribute('aria-current');
      }
    });
  }
```

Then call it from `select()`, immediately after the `LAKES.forEach` that toggles panel display and before the scroll block:

```js
    paintScene();
```

- [ ] **Step 4: Check the painted states**

Reload at desktop width and run:

```js
document.querySelector('#lakeChips button:nth-child(2)').click();
var pin = function(n){ return document.querySelector('#chart button[aria-label="' + n + '"]'); };
JSON.stringify({
  selDot: getComputedStyle(pin('Lake Travis').firstElementChild).width,
  offDot: getComputedStyle(pin('Canyon Lake').firstElementChild).width,
  selChipBg: getComputedStyle(document.querySelector('#lakeChips button:nth-child(2)')).backgroundColor,
  offChipBg: getComputedStyle(document.querySelector('#lakeChips button:nth-child(1)')).backgroundColor,
  current: document.querySelectorAll('[aria-current="true"]').length
})
```

Expected: `selDot: "16px"`, `offDot: "12px"`, `selChipBg: "rgb(29, 48, 89)"`, `offChipBg: "rgb(255, 255, 255)"`, `current: 2` (one pin, one chip).

- [ ] **Step 5: Check the forced label at 375px and at 560px**

Resize to the mobile preset, reload, then:

```js
document.querySelector('#lakeChips button:nth-child(7)').click();
var labels = [].slice.call(document.querySelectorAll('#chart [data-pinlabel]'));
JSON.stringify({
  vw: innerWidth,
  visibleLabels: labels.filter(function(l){ return getComputedStyle(l).display !== 'none'; })
    .map(function(l){ return l.textContent; })
})
```

Expected: exactly one visible label, `["Stillhouse"]`. Repeat at 560x800 — same result. At 561x800 all labels show, which is correct.

- [ ] **Step 6: Commit**

```bash
git add index.html
git commit -m "The Scene: the chart shows which lake you picked

The selected pin's dot grows and takes a halo, its chip fills navy, and
both carry aria-current. Under 560px the pin labels are hidden to stop
them colliding, so the selected lake's label is exempted by specificity
and the chart keeps saying where you are on a phone.

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 4: Hold the column steady, then the docs

Stops the page moving when a reader switches lakes, and brings the prose that describes this section back in step.

**Files:**
- Modify: `index.html` — stylesheet 901px block, `#scene` intro paragraph, file-header comment
- Modify: `README.md` — "Lake photos" note and the chart bullet under "Notes"

**Interfaces:**
- Consumes: `#lakeDossier` from Task 2, `paintScene()` from Task 3.
- Produces: nothing.

- [ ] **Step 1: Measure the tallest panel**

At desktop width, with the preview open:

```js
JSON.stringify([].slice.call(document.querySelectorAll('[data-lake]')).map(function(p){
  var prev = p.style.display; p.style.display = 'block';
  var h = Math.round(p.getBoundingClientRect().height);
  p.style.display = prev;
  return [p.getAttribute('data-lake'), h];
}))
```

Note the largest number. Round it **up** to the next 10px — that is the `min-height` value for the next step. Also note `document.querySelector('#chart').getBoundingClientRect().height`; if the tallest panel is shorter than the chart, the chart governs the row anyway and the floor only has to stop panel-to-panel movement.

- [ ] **Step 2: Add the floor**

In the `@media (min-width:901px)` block, next to the `#lakeChips` rule, using the number from Step 1 in place of `NNN`:

```css
  /* The tallest lake sets the floor so the page does not move when a reader
     switches between them. Same reason as [data-bookcard] above, and scoped
     the same way: stacked on a phone this would only leave a gap. */
  #lakeDossier{min-height:NNNpx}
```

- [ ] **Step 3: Confirm nothing moves between lakes**

At desktop width, reload, then:

```js
var dossier = document.querySelector('#lakeDossier');
var heights = ['canyon','travis','ladybird','lbj','austin','belton','stillhouse','buchanan'].map(function(id, i){
  document.querySelectorAll('#lakeChips button')[i].click();
  return Math.round(dossier.getBoundingClientRect().height);
});
JSON.stringify({heights: heights, allEqual: heights.every(function(h){ return h === heights[0]; })})
```

Expected: `allEqual: true`.

- [ ] **Step 4: Update the intro paragraph**

The line at index.html:355 promises drive times but not the panel. Replace its text with:

```
Every lake we work sits within about an hour and a half of Austin or San Antonio. Pick a lake on the map or in the row beneath it, and its details, drive times, and photos come up alongside.
```

- [ ] **Step 5: Update the file-header comment**

In the `HOW TO EDIT` block at the top of index.html, the "Lake photos" line stands but nothing describes the section itself. Add a line after it:

```
    - Lake write-ups: the eight panels in the "The Scene" section. Plain
      text in the page; the chart's pins and chips choose between them.
```

- [ ] **Step 6: Update README.md**

In the "Lake photos" paragraph, the sentence about Lake Austin's placeholder is still true and stays. Add a paragraph before it:

```markdown
**Lake write-ups** — the eight panels in "The Scene" are plain HTML in
`index.html`, one `<section data-lake="…">` each, and safe to edit directly.
On a computer the chart's pins and the chip row choose which one shows beside
the map; on a phone all eight are on the page and picking one scrolls to it.
The panels are authored visible and the script hides the ones it is not
showing, so a reader without JavaScript gets all eight.
```

In the "Notes" section, the chart bullet describes only the Esri dependency. Append to it:

```markdown
  The lake panels beside the chart are plain HTML and do not depend on those
  tiles, so a tile outage costs the map background and nothing else.
```

- [ ] **Step 7: Full verification pass**

```bash
node verify-assets.mjs
```

Expected: `OK: zero missing, zero orphaned.`

Then, in the browser:
1. Widths 1280, 901, 900, 720, 560, 390 — screenshot each with `#scene` in view. Confirm no horizontal overflow at any of them (`document.documentElement.scrollWidth === innerWidth`).
2. `preview.html` at desktop width — the phone frame shows the stacked layout.
3. Console errors — none.
4. Keyboard: Tab from the chart into the pins, then the chips, then the panel's Book link. Confirm the orange `:focus-visible` ring shows on each and that Escape still closes a photo lightbox.
5. Scripting off: in the browser's settings disable JavaScript, reload, and confirm all eight panels are readable and the pins and chips are simply inert. Re-enable.

- [ ] **Step 8: Commit**

```bash
git add index.html README.md
git commit -m "The Scene: hold the dossier's height, and say what it is

The tallest lake sets a floor under the dossier column so the page does
not move when a reader switches between them, scoped to the layout where
the panels swap. The intro line, the file header and the README all still
described a section that opened cards underneath the chart.

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

## Verification Summary

The whole feature is done when, from a clean load:

- **1280px:** chart left with chips wrapped beneath, one dossier panel right. Picking any pin or chip swaps the panel, moves the selected state, and does not scroll the page or change the column's height.
- **390px:** chart, chips, then all eight panels stacked. Picking a pin or chip scrolls to that lake. The selected lake's pin label is the only one showing.
- **Every width:** no horizontal overflow, no console errors, `node verify-assets.mjs` clean.
- **No JavaScript:** all eight panels readable, nothing claims to be interactive.
