# Video Transcript Extractor Extension

A Chrome extension that automatically captures and extracts video transcripts (subtitles/captions) from web pages that use HLS (M3U8) streaming, with an integrated AI assistant to help you understand and analyze lecture content.

## Features

### 📹 Transcript Extraction
- **Automatic Capture**: Automatically detects M3U8 streams containing VTT subtitles as you browse.
- **Transcript Extraction**: Downloads and merges segmented VTT files into a single, readable transcript.
- **Smart Parsing**: Removes WEBVTT headers, timestamps, and metadata to produce clean text.
- **Local Storage**: Uses `chrome.storage.local` to persist captured transcripts across sessions.
- **User Interface**:
  - View list of captured transcripts with status indicators.
  - Download transcripts as Text (.txt) or Raw VTT (.vtt).
  - Copy transcripts to clipboard.
  - Bulk actions (Download/Copy/Delete selected).

### 🤖 AI Assistant
- **Interactive Chat**: Ask questions about your lecture transcripts with streaming AI responses.
- **Transcript Context**: AI has access to your captured transcripts for contextual answers.
- **@Mentions**: Reference specific transcript segments using `@mention` functionality.
- **Slash Commands**:
  - `/clear` - Reset chat history
  - `/help` - Display available commands
- **Rich Responses**: Markdown rendering with syntax highlighting, code blocks, and formatting.
- **Tool Execution**: Visual display of AI reasoning and tool usage.
- **Streaming Support**: Real-time message streaming for responsive interactions.

### 🎨 User Interface
- Dark mode UI using TailwindCSS and shadcn/ui components.
- Tabbed navigation between Extractor and Assistant pages.
- Settings page for API key configuration.

## How it Works

### Transcript Extraction
1. **Interception**: An injected script intercepts `fetch` and `XMLHttpRequest` calls to detect M3U8 playlists that reference VTT files.
2. **Background Processing**: The extension's background service worker fetches the VTT segments listed in the captured M3U8 playlist.
3. **Merging**: The individual VTT segments are combined and cleaned to generate a full transcript.
4. **Storage**: The final transcript is stored locally in your browser.

### AI Assistant
1. **Configuration**: Set your OpenRouter API key in the Settings page.
2. **Context Loading**: The assistant loads your captured transcripts as available context.
3. **Streaming Chat**: Send messages and receive streaming AI responses powered by OpenRouter.
4. **Tool Usage**: The AI can search transcripts, display reasoning, and provide contextual answers about your lecture content.

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

### AI Assistant Setup

1.  Get an API key from [OpenRouter](https://openrouter.ai/).
2.  Click the extension icon and navigate to the **Settings** tab.
3.  Enter your OpenRouter API key and select your preferred model.
4.  Navigate to the **Assistant** tab to start chatting with the AI about your transcripts.

## Project Structure

### Core Extension Files
- `src/background.ts`: Service worker that handles fetching and parsing VTT files.
- `src/content_script.ts`: Bridge between the web page and the extension background worker.
- `src/injected.ts`: Script injected into the web page to intercept network requests.
- `public/manifest.json`: Chrome extension configuration (Manifest V3).

### Application
- `src/App.tsx`: Main React application with tabbed navigation.
- `src/pages/ExtractorPage.tsx`: Transcript management interface.
- `src/pages/AssistantPage.tsx`: AI chat interface.
- `src/pages/SettingsPage.tsx`: Configuration and API key management.

### AI Components
- `src/lib/runtime.ts`: Custom AI runtime for handling streaming responses and tool execution.
- `src/components/assistant-ui/thread.tsx`: Chat thread UI with message history.
- `src/components/assistant-ui/markdown-text.tsx`: Markdown renderer for AI responses.
- `src/components/assistant-ui/attachment.tsx`: File and content attachment handling.
- `src/components/assistant-ui/tool-fallback.tsx`: Tool execution display.
- `src/components/ai/reasoning.tsx`: AI reasoning visualization.
- `src/components/ai/shimmer.tsx`: Loading animations for streaming content.
- `src/components/ai/tool.tsx`: Tool call UI components.

## Tech Stack

- **Framework**: [React](https://react.dev/) + [Vite](https://vitejs.dev/)
- **Styling**: [TailwindCSS](https://tailwindcss.com/)
- **Components**: [shadcn/ui](https://ui.shadcn.com/) + [Radix UI](https://www.radix-ui.com/)
- **Icons**: [Lucide React](https://lucide.dev/)
- **Animations**: [Motion](https://motion.dev/)
- **AI**: [OpenRouter API](https://openrouter.ai/) for LLM access
- **Markdown**: [react-markdown](https://github.com/remarkjs/react-markdown) with syntax highlighting
