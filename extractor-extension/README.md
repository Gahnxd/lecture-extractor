# Video Transcript Extractor Extension

A Chrome extension that automatically captures and extracts video transcripts (subtitles/captions) from web pages that use HLS (M3U8) streaming.

## Features

- **Automatic Capture**: Automatically detects M3U8 streams containing VTT subtitles as you browse.
- **Transcript Extraction**: Downloads and merges segmented VTT files into a single, readable transcript.
- **Smart Parsing**: Removes WEBVTT headers, timestamps, and metadata to produce clean text.
- **Local Storage**: usage `chrome.storage.local` to persist captured transcripts across sessions.
- **User Interface**:
  - View list of captured transcripts with status indicators.
  - Download transcripts as Text (.txt) or Raw VTT (.vtt).
  - Copy transcripts to clipboard.
  - Bulk actions (Download/Copy/Delete selected).
  - Dark mode UI using TailwindCSS and Radix UI.

## How it Works

1. **Interception**: An injected script intercepts `fetch` and `XMLHttpRequest` calls to detect M3U8 playlists that reference VTT files.
2. **Background Processing**: The extension's background service worker fetches the VTT segments listed in the captured M3U8 playlist.
3. **Merging**: The individual VTT segments are combined and cleaned to generate a full transcript.
4. **Storage**: The final transcript is stored locally in your browser.

## Installation

### Prerequisites

- Node.js (v16 or higher)
- npm or pnpm

### Build Instructions

1.  **Install dependencies**:

    ```bash
    npm install
    ```

2.  **Build the extension**:
    ```bash
    npm run build
    ```
    This will generate the extension files in the `build` directory.
    (This also updates the [`extension.zip`](../website/public/extension.zip) file in [`website/public`](../website/public/))

### Loading into Chrome

1.  Open Chrome and navigate to `chrome://extensions/`.
2.  Enable **Developer mode** in the top right corner.
3.  Click **Load unpacked**.
4.  Select the `extractor-extension/build` directory (created in the previous step).
5.  The `Video Transcript Extractor` icon should appear in your toolbar.

## Project Structure

- `src/background.ts`: Service worker that handles fetching and parsing VTT files.
- `src/content_script.ts`: Bridge between the web page and the extension background worker.
- `src/injected.ts`: Script injected into the web page to intercept network requests.
- `src/App.tsx`: The React application for the extension popup UI.
- `manifest.json`: Chrome extension configuration (Manifest V3).

## Tech Stack

- **Framework**: [React](https://react.dev/) + [Vite](https://vitejs.dev/)
- **Styling**: [TailwindCSS](https://tailwindcss.com/)
- **Components**: [Radix UI](https://www.radix-ui.com/)
- **Icons**: [Lucide React](https://lucide.dev/)
- **Animations**: [Motion](https://motion.dev/)
