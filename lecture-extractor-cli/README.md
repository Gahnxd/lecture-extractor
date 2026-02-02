# Lecture Extractor

A Python script to extract and merge subtitles/transcripts from M3U8 playlists (commonly used by Kaltura and other video players).

## Prerequisites

- `uv` (recommended) or Python 3.x
- `requests`, `rich`, `questionary` (installed automatically with `uv`)

### Using `uv` (Recommended)

```bash
cd lecture-extractor-cli
uv run main.py
```

### Using Standard Python / pip

```bash
cd lecture-extractor-cli
pip install requests rich questionary
python main.py
```

## Finding the M3U8 URL

To use this script, you first need to find the `.m3u8` playlist URL for the video you want to process.

1. Open the video page in your browser (e.g., Chrome).
2. Right-click anywhere on the page and select **Inspect** to open Developer Tools.
3. Switch to the **Network** tab in Developer Tools.
4. In the filter box (top left of the Network tab), type `m3u8`.
5. Refresh the page. You should see network requests appearing.
6. Look for a request that returns the master playlist or index file (often has `master.m3u8` or `index.m3u8` or `a.m3u8` in the name).
7. Right-click that request -> **Copy** -> **Copy link address** (or **Copy URL**).

## Usage

Run the script:

```bash
cd lecture-extractor-cli
uv run main.py
# or if using standard python
python main.py
```

The script will prompt you to enter:

1.  **Folder Name**: A name for the output directory (e.g., `Week1_Lecture`).
2.  **M3U8 URL**: The full URL you copied from the Network tab.

## Output

The script will search for `.vtt` subtitle segments in the playlist, download them, and merge them.
A new directory named `<FOLDER_NAME>` (e.g., `Week1_Lecture`) will be created containing:

- `<FOLDER_NAME>_raw.vtt`: The raw merged WebVTT file (with timestamps).
- `<FOLDER_NAME>_transcript.txt`: A clean plain-text transcript (timestamps and metadata removed).
