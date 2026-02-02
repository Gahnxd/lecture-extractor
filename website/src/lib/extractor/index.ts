/**
 * Lecture Extractor - TypeScript Implementation
 * Extract transcripts from M3U8 playlists containing VTT segments
 */

/**
 * Extract VTT segment paths from M3U8 playlist content
 * @param m3u8Text - The raw M3U8 playlist content
 * @returns Array of VTT file paths found in the playlist
 */
export function parseM3u8ForVttPaths(m3u8Text: string): string[] {
  const vttPaths: string[] = [];

  for (const line of m3u8Text.split("\n")) {
    const trimmedLine = line.trim();
    if (!trimmedLine || trimmedLine.startsWith("#")) {
      continue;
    }
    if (trimmedLine.toLowerCase().endsWith(".vtt")) {
      vttPaths.push(trimmedLine);
    }
  }

  return vttPaths;
}

/**
 * Convert WebVTT content into plain text transcript
 * - Removes WEBVTT header
 * - Removes NOTE/STYLE blocks
 * - Removes timestamps
 * - Keeps cue text, de-duplicates consecutive identical lines
 * @param vtt - The raw WebVTT content
 * @returns Plain text transcript
 */
export function vttToPlainText(vtt: string): string {
  const lines = vtt.split("\n");
  const output: string[] = [];
  let i = 0;

  // Remove UTF-8 BOM if present
  if (lines.length > 0 && lines[0].startsWith("\ufeff")) {
    lines[0] = lines[0].replace(/^\ufeff/, "");
  }

  // Simple state machine to skip NOTE/STYLE blocks
  let skipBlock = false;

  const timestampRegex =
    /^\d{2}:\d{2}:\d{2}\.\d{3}\s+-->\s+\d{2}:\d{2}:\d{2}\.\d{3}/;

  let lastKept: string | null = null;

  while (i < lines.length) {
    const line = lines[i].trimEnd();

    // Skip WEBVTT header line
    if (i === 0 && line.trim().toUpperCase().startsWith("WEBVTT")) {
      i++;
      continue;
    }

    // Handle NOTE/STYLE blocks
    if (line.startsWith("NOTE") || line.startsWith("STYLE")) {
      skipBlock = true;
      i++;
      continue;
    }

    if (skipBlock) {
      // Blocks end at blank line
      if (line.trim() === "") {
        skipBlock = false;
      }
      i++;
      continue;
    }

    // Skip timestamps and cue indices
    if (timestampRegex.test(line.trim())) {
      i++;
      continue;
    }

    // Skip numeric cue identifiers
    if (/^\d+$/.test(line.trim())) {
      i++;
      continue;
    }

    const text = line.trim();
    if (text) {
      // Avoid consecutive duplicates (common with segmented VTT)
      if (text !== lastKept) {
        output.push(text);
        lastKept = text;
      }
    }

    i++;
  }

  // Join lines
  return output.join("\n").trim() + "\n";
}

/**
 * Fetch text content from a URL
 * @param url - The URL to fetch
 * @param headers - Optional headers to include in the request
 * @returns The text content of the response
 */
export async function fetchText(
  url: string,
  headers?: Record<string, string>
): Promise<string> {
  const defaultHeaders = {
    "User-Agent": "Mozilla/5.0",
    Accept: "*/*",
  };

  const response = await fetch(url, {
    headers: { ...defaultHeaders, ...headers },
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  return response.text();
}

/**
 * Resolve a relative path against a base URL
 * @param base - The base URL
 * @param path - The relative path to resolve
 * @returns The resolved absolute URL
 */
export function resolveUrl(base: string, path: string): string {
  return new URL(path, base).href;
}

/**
 * Progress callback for tracking download progress
 */
export interface ProgressCallback {
  onProgress: (current: number, total: number) => void;
  onSegmentDownloaded?: (index: number, total: number) => void;
}

/**
 * Result of transcript extraction
 */
export interface ExtractionResult {
  /** Raw merged VTT content */
  rawVtt: string;
  /** Plain text transcript */
  transcript: string;
  /** Number of VTT segments processed */
  segmentCount: number;
}

/**
 * Download and extract transcript from an M3U8 playlist URL
 * @param m3u8Url - The URL of the M3U8 playlist containing VTT segments
 * @param onProgress - Optional progress callback
 * @returns Extraction result containing raw VTT and plain text transcript
 */
export async function extractTranscript(
  m3u8Url: string,
  onProgress?: ProgressCallback
): Promise<ExtractionResult> {
  // Fetch the M3U8 playlist
  const m3u8Text = await fetchText(m3u8Url);

  // Parse VTT paths from the playlist
  const vttPaths = parseM3u8ForVttPaths(m3u8Text);

  if (vttPaths.length === 0) {
    throw new Error("No .vtt segments found in the M3U8 playlist");
  }

  // Resolve relative URLs to absolute URLs
  const vttUrls = vttPaths.map((path) => resolveUrl(m3u8Url, path));

  // Download and process all VTT segments
  const mergedVttParts: string[] = ["WEBVTT\n"];
  const allPlainParts: string[] = [];

  for (let i = 0; i < vttUrls.length; i++) {
    const vttUrl = vttUrls[i];
    const vttText = await fetchText(vttUrl);

    // Remove WEBVTT header from individual segments
    const vttTextClean = vttText.replace(/^\ufeff?WEBVTT[^\n]*\n/i, "");
    mergedVttParts.push(vttTextClean.trim() + "\n\n");
    allPlainParts.push(vttToPlainText(vttTextClean));

    // Report progress
    if (onProgress) {
      onProgress.onProgress(i + 1, vttUrls.length);
      onProgress.onSegmentDownloaded?.(i + 1, vttUrls.length);
    }
  }

  // Merge all parts
  const mergedVtt = mergedVttParts.join("").trim() + "\n";
  const mergedTxt =
    allPlainParts
      .map((p) => p.trim())
      .filter((p) => p)
      .join("\n")
      .trim() + "\n";

  return {
    rawVtt: mergedVtt,
    transcript: mergedTxt,
    segmentCount: vttUrls.length,
  };
}

/**
 * Download transcript and save to files (for Node.js environment)
 * This is a convenience wrapper that matches the Python CLI behavior
 * @param m3u8Url - The URL of the M3U8 playlist
 * @param folderName - The folder name to save files to
 * @param onProgress - Optional progress callback
 * @returns Object containing paths to the saved files
 */
export async function downloadAndSaveTranscript(
  m3u8Url: string,
  folderName: string,
  onProgress?: ProgressCallback
): Promise<{
  result: ExtractionResult;
  rawVttFilename: string;
  transcriptFilename: string;
}> {
  const result = await extractTranscript(m3u8Url, onProgress);

  return {
    result,
    rawVttFilename: `${folderName}_raw.vtt`,
    transcriptFilename: `${folderName}_transcript.txt`,
  };
}
