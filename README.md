# Lecture Extractor

A comprehensive toolkit for extracting and managing video transcripts from HLS (M3U8) streams. This project consists of three main components designed to help students and researchers easily access lecture captions.

## Components

### 1. [Chrome Extension](./extractor-extension)

**The recommended way to use Lecture Extractor.**

A browser extension that automatically detects and captures subtitles as you browse.

- **Auto-Capture**: Detects M3U8 playlists containing VTT files automatically.
- **One-Click Download**: Download transcripts as clean text or raw VTT.
- **History**: Keeps a local history of captured transcripts.

[Extension Documentation](./extractor-extension/README.md)

### 2. [CLI Tool](./lecture-extractor-cli)

**For power users and automation.**

A Python-based command-line interface for extracting transcripts when you already have the M3U8 URL.

- **Direct Download**: Input a URL and download immediately.
- **Batch Processing**: (Scriptable) Useful for downloading multiple lectures.
- **No Browser Required**: Runs entirely in your terminal.

[CLI Documentation](./lecture-extractor-cli/README.md)

### 3. [Website](./website)

**The download center.**

The landing page for the project.

- **Download Hub**: Serves as the primary location to download the Chrome Extension.
- **Documentation**: Provides guides and tutorials on how to use the tools.

[Website Documentation](./website/README.md)

## Getting Started

### To use the Extension:

1.  Navigate to `extractor-extension/`
2.  Follow the build instructions in the [README](./extractor-extension/README.md).
3.  Load into Chrome.

### To use the CLI:

1.  Navigate to `lecture-extractor-cli/`
2.  Follow the instructions in the [README](./lecture-extractor-cli/README.md).
3.  Follow the CLI prompts.
