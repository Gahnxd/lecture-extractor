# Lecture Extractor CLI

A command-line tool to extract and merge video transcripts (subtitles/captions) from M3U8 playlists. This is useful for downloading transcripts from video platforms that use HLS streaming (like Kaltura) for offline reading or processing.

## Features

- **Interactive CLI**: Easy-to-use interactive prompts for folder names and URLs.
- **M3U8 Parsing**: Extract VTT segment paths from M3U8 playlists.
- **Transcript Merging**: Downloads and merges multiple VTT segments into a single file.
- **Clean Output**:
  - Generates a **raw VTT** file with timestamps preserved.
  - Generates a **clean text** transcript with metadata and timestamps removed.
- **Progress Tracking**: Visual progress bar during download.

## Prerequisites

- Python 3.x
- [uv](https://github.com/astral-sh/uv) (Recommended for dependency management) or `pip`

## Installation & Usage

### Method 1: Using `uv` (Recommended)

`uv` is a fast Python package installer and runner. It handles virtual environments and dependencies automatically.

1.  Navigate to the CLI directory:

    ```bash
    cd lecture-extractor-cli
    ```

2.  Run the script directly:
    ```bash
    uv run main.py
    ```

### Method 2: Using Standard Python / pip

1.  Navigate to the CLI directory:

    ```bash
    cd lecture-extractor-cli
    ```

2.  Install dependencies:

    ```bash
    pip install requests rich questionary
    ```

3.  Run the script:
    ```bash
    python main.py
    ```

## How to Get the M3U8 URL

To use this tool, you need the `.m3u8` playlist URL for the video's subtitles.

1.  **Open Developer Tools**: Right-click on the video page and select "Inspect", then go to the **Network** tab.
2.  **Filter**: Type `m3u8` or `vtt` in the filter box.
3.  **Refresh/Play**: Refresh the page or play the video to trigger network requests.
4.  **Find the Playlist**: Look for a request that ends in `.m3u8` (often named `master.m3u8`, `index.m3u8`, or similar).
    - _Note_: Ensure the M3U8 file contains references to `.vtt` files (you can check the "Response" tab in DevTools).
5.  **Copy URL**: Right-click the request -> **Copy** -> **Copy link address**.

## Workflow

1.  Run the script using one of the methods above.
2.  Enter a **Folder Name** when prompted (this will be the name of the output directory).
3.  Paste the **M3U8 URL** you copied.
4.  The script will:
    - distinct `.vtt` segments.
    - Download each segment.
    - Merge them into a single VTT and a single text file.
5.  Check the output folder for your transcripts!

## Project Structure

- `main.py`: The main entry point and logic for the CLI tool.
- `pyproject.toml` / `uv.lock`: Dependency management files.
