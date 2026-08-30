# Timewizzard v1.6.2 — UI QA matrix

> **Versionsspecifik QA-reference:** Denne matrix dokumenterer v1.6.2-baselinen. Den aktuelle v1.6.4-validering køres med `npm test`; se [README.md](README.md), [GUIDE_EN.md](GUIDE_EN.md) og [GUIDE_DA.md](GUIDE_DA.md).

## Supported layout contracts

| Profile | Reference viewport | Expected workspace |
|---|---:|---|
| Large desktop | 1440 × 1000 | Posts + Editor + Preview |
| Laptop | 1280 × 800 | Posts drawer + Editor + Preview |
| iPad landscape | 1180 × 820 | Posts drawer + Editor + Preview |
| iPad portrait | 820 × 1180 | Blocks / Edit / Preview task tabs |
| Large phone | 430 × 932 | One task panel at a time |
| Standard phone | 390 × 844 | One task panel at a time |
| Small phone | 360 × 800 | One task panel at a time |

## Required checks

1. Create Draft keeps its header and Cancel/Create actions visible at every supported height.
2. Add Block search scans every block category while text is entered.
3. Template search scans the full template catalog while text is entered.
4. Blocks open in Inspector on click/tap.
5. Desktop Pointer Drag and touch Click-to-Move both move blocks between POST root and Containers.
6. Markdown tools follow only the focused Markdown-capable field.
7. Character counters never overlap entered text.
8. Heading Title remains the primary field; Level and Emoji stack when the Inspector narrows.
9. Facts/Info List and Button Row controls remain usable without horizontal scrolling.
10. Add Block, Save, Publish, Undo and Redo remain directly available.
11. Open in Discord and secondary post actions remain available through More on narrow layouts.
12. Posts opens as a drawer below 1280 px.
13. Blocks, Edit and Preview are separate task panels at 960 px and below.
14. Desktop/Mobile preview widths can be switched without changing post data.
15. Canonical payload validation succeeds before Publish becomes available in review.
16. Pre-publish review reports destination, message count, blocks, components and mention behaviour.
17. Unsaved work can be restored after a reload and is cleared after a successful Save.
18. Keyboard focus is visible; Enter/Space opens a focused block; Esc closes the Posts drawer.
19. Dialog focus returns to the control that opened it.
20. No primary UI region creates horizontal page scrolling.

## Release gate

Run:

```powershell
npm install
npm run validate
npm run local
```

Then test `/health` and confirm version `1.6.2` before platform QA.
