# DBC Viewer

A small Angular app for browsing CAN database (`.dbc`) files in a human-friendly way. Everything runs in the browser: the file you choose is parsed locally and never uploaded, and there is no backend.

## Features

- Open a `.dbc` file by choosing it or dragging it onto the page, or load the bundled example
- Searchable message list (ID, name, sender, comment, signal names) with a node filter
- Per-message bit layout showing where each signal sits in the frame (Intel and Motorola byte order, multiplexed signals shown as overlaps)
- Signal table with start bit, length, format, factor, offset, range, unit, receivers, comments and value descriptions
- Light/dark theme

## Running with Docker

```bash
docker compose up --build
```

Then open <http://localhost:4200>. The source folder is mounted into the container, so edits reload automatically.

```bash
# Production build
docker compose run --rm dbc-viewer npm run build

# Unit tests
docker compose run --rm dbc-viewer npm test -- --watch=false
```

## Deploying to GitHub Pages

Pushing to `main` runs [.github/workflows/deploy-pages.yml](.github/workflows/deploy-pages.yml), which tests, builds with the repository's base path, and publishes the site. Before the first run, set **Settings → Pages → Source** to **GitHub Actions** in the GitHub repository.

## Project layout

```
src/app/
├── components/   # dbc-viewer, file-drop, message-list, message-detail, bit-layout
├── pages/        # Route-level wrapper (viewer.page.ts)
├── models/       # DBC interfaces (import from the index.ts barrel)
├── services/     # DbcParserService, DbcService, bit-layout maths, theme, title strategy
└── error/        # 404 page
```

The parser covers `BU_`, `BO_`, `SG_` (including multiplexing), `CM_`, `VAL_` and `SIG_VALTYPE_`. Other sections are ignored.
