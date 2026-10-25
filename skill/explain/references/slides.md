# Slides

Slides are a different medium, not a long page cut into pieces. Copy the engine in `templates/slide-deck.html` as it is (chrome, `SlideEngine`, `autoFit()`, the delivery check) and restyle everything else.

## Plan before HTML

Inventory every item in the source (sections, rows, decisions, details), map each to a slide (nothing unmapped: add slides, never drop content), then vary the composition (centered, left, right, split, bleed). A source with 7 sections usually needs 18–25 slides. Test: a reader who never saw the source can rebuild every major point from the deck.

## Budget per slide (one `100dvh`, no scrolling)

| Type | Holds at most |
|---|---|
| Title / Full-bleed | heading + subtitle |
| Divider | number + heading + subhead |
| Content | heading + 5 bullets of ≤2 lines, or heading + one figure |
| Split | two panels, each within its own type's limits |
| Diagram | heading + one SVG figure (≤ 10 boxes, 18px+ labels, 2px+ edges) |
| Dashboard | heading + 6 KPIs; hero value ≤ 6 characters |
| Table | heading + 8 rows; continue on the next slide |
| Code | heading + 10 lines |
| Quote | ≤ 25 words + attribution |

- One focal point per slide; the heading states its takeaway. Body text 18px or larger in the sans, the display face only for headings. Prefer a figure to bullets.
- Figures at slide scale: node text 24, edge labels 18, strokes 2.5 (hot 3.5), arrowheads 16 in `userSpaceOnUse`, `max-height: 56dvh`. Below 768px wide, the SVG keeps `min-width: 720px` in a scroll wrapper.
- Decks default to the Editorial register; metrics or architecture may use Instrument or Blueprint.
- Never three centered slides in a row.
- Type in `clamp(px, vw, px)`, not `rem`. Reduce padding and hide decoration at `max-height: 700/600/500px`.
- The engine pauses slide keys while focus is in `.diagram-shell`, `.table-scroll`, `.code-scroll`, or a form field; put scrollable content there.

## Delivery check

`overflow:hidden` clips silently. Before you ship, with `prefers-reduced-motion: reduce` on (Chrome DevTools → Rendering), load the deck at the target size and at about 1280×600. The template outlines each failing slide (red = overflow, amber = autoFit used) and logs `Slide delivery check failed`. Split or cut until it logs `passed`.

## PPTX

Only on request or `--pptx`: build the HTML deck, then `visual-explainer-pptx deck.html deck.pptx` (or `node ./pptx/export.mjs` from a checkout). Tell the user the HTML stays the source: the PPTX has no animation, navigation, custom fonts, live diagrams, or JS.

`visual-explainer-pptx` reads each `section.slide`: headings, `.slide__subtitle`, lists, paragraphs, tables, and `pre`, so keep that structure semantic. It drops SVG, figures, and captions: when PPTX is requested, give each figure slide its claim in a `<p class="slide__body">` too.
