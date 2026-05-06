# Changelog

## 1.1.1 - 2026-05-06

### Added

- Added a light/dark theme toggle to the demo page.

### Changed

- Made the clickable header title easier to discover by rendering it as a neutral outline button with a chevron.
- Improved Bootstrap 4 fallback styling for today, selected, and disabled states in year and decade views.

### Fixed

- Fixed range edge toggling so clicking the selected start or end clears only that edge and keeps the other edge as an anchor.
- Fixed incomplete ranges so hidden start/end inputs remain open instead of mirroring a single selected edge into both fields.
- Normalized range state after user interaction and API updates so the smaller date is always the start when both edges are set.

## 1.1.0 - 2026-05-06

### Added

- Added clickable header navigation for fast jumps across larger date ranges.
- Added year and decade grid views without using a year select or text input.
- Added context-aware navigation steps: months/years in day view, decades in year view, and centuries in decade view.

### Changed

- The today button now keeps the active view mode and jumps to the current month, decade, or century depending on the current view.
- Updated navigation event documentation for the new header actions.
