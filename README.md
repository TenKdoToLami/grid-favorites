# Grid Favorites

**A compact browser extension to surface your Bookmarks Bar as a responsive grid for fast access.**

[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](./LICENSE) ![Manifest v3](https://img.shields.io/badge/manifest-v3-lightgrey)

> Quick, keyboard-friendly popup that shows bookmarks in a tidy grid with inline folder expansion and drag-and-drop reordering.

## Demo

*(Replace these with screenshots in `assets/` and link them here.)*

- `assets/screenshot-1.png` —
- `assets/screenshot-2.png` —

## Features

- Grid-based layout for the Bookmarks Bar
- Inline folder expansion and collapse
- Drag & drop reordering and moving into folders
- Add / delete bookmarks and folders from the popup
- Lazy-loading favicons with graceful fallback
- Small, focused manifest; no tracking or analytics

## Installation (developer)

**Load unpacked extension** (Chrome / Edge):

1. Clone this repository: `git clone https://github.com/TenKdoToLami/grid-favorites.git`
2. Open Chrome/Edge `chrome://extensions/` (Edge: `edge://extensions/`).
3. Enable **Developer mode**.
4. Click **Load unpacked** and select the repository folder.

**Notes for Firefox**

- Firefox uses a slightly different `manifest.json` schema for some APIs. To run in Firefox, test with `webextensions` compatibility and check `browser.*` vs `chrome.*` usage.

## Usage

- Click the extension icon — popup shows the Bookmarks Bar in a grid.
- Left-click a bookmark to open it in the current tab.
- Middle-click a bookmark to open in a new background tab (handled in the popup script).
- Click folders to expand inline; use the `Collapse` or `Folder` tile to close.
- Drag tiles to reorder or to drop them into folders.
- Use the **Add Bookmark** and **Add Folder** buttons to quickly add items to the Bookmarks Bar.

## Permissions

This extension requests the `bookmarks` permission only. Bookmarks are managed locally by the browser; nothing is sent off-device.


### Important implementation details

- Bookmarks bar id is set to `1` in `popup.js`. This is correct for Chromium-based browsers; if you need to support other profiles or platforms, consider searching for the node with `title === 'Bookmarks bar'` or adapt logic accordingly.
- Favicons are loaded via `https://t1.gstatic.com/faviconV2?...` with fallback to `assets/default-icon.png`.


## Privacy & Security

- This extension only uses the `bookmarks` permission and acts on user data locally.

## License

This project is available under the MIT License — see `LICENSE`.


