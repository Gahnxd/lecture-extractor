export interface CapturedVtt {
  url: string;
  content: string;
  timestamp: number;
}

/**
 * Check if URL is an M3U8 file
 */
export function isM3u8Url(url: string): boolean {
  const lowerUrl = url.toLowerCase();
  return (
    lowerUrl.endsWith(".m3u8") ||
    lowerUrl.includes(".m3u8?") ||
    lowerUrl.includes(".m3u8#")
  );
}

/**
 * Parse M3U8 content to extract VTT paths
 */
export function parseM3u8ForVttPaths(m3u8Text: string): string[] {
  const vttPaths: string[] = [];
  for (const line of m3u8Text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }
    if (trimmed.toLowerCase().endsWith(".vtt")) {
      vttPaths.push(trimmed);
    }
  }
  return vttPaths;
}

/**
 * Resolve relative URL against a base URL
 */
function resolveUrl(base: string, relative: string): string {
  try {
    return new URL(relative, base).toString();
  } catch {
    return relative;
  }
}

/**
 * Convert VTT content to plain text transcript
 */
export function vttToPlainText(vtt: string): string {
  const lines = vtt.split("\n");
  const out: string[] = [];
  
  const timestampRe = /^\d{2}:\d{2}:\d{2}\.\d{3}\s+-->\s+\d{2}:\d{2}:\d{2}\.\d{3}/;
  let skipBlock = false;
  let lastKept = "";
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].replace(/^\ufeff/, ""); // Remove BOM
    
    // Skip WEBVTT header
    if (i === 0 && line.trim().toUpperCase().startsWith("WEBVTT")) {
      continue;
    }
    
    // Handle NOTE/STYLE blocks
    if (line.startsWith("NOTE") || line.startsWith("STYLE")) {
      skipBlock = true;
      continue;
    }
    
    if (skipBlock) {
      if (line.trim() === "") {
        skipBlock = false;
      }
      continue;
    }
    
    // Skip timestamps
    if (timestampRe.test(line.trim())) {
      continue;
    }
    
    // Skip numeric cue identifiers
    if (/^\d+$/.test(line.trim())) {
      continue;
    }
    
    const text = line.trim();
    if (text && text !== lastKept) {
      out.push(text);
      lastKept = text;
    }
  }
  
  return out.join("\n").trim();
}

/**
 * Fetch all VTT files from an M3U8 playlist
 */
export async function fetchVttsFromM3u8(
  m3u8Url: string,
  m3u8Content: string
): Promise<{ vtts: CapturedVtt[]; rawVtt: string; transcript: string }> {
  const vttPaths = parseM3u8ForVttPaths(m3u8Content);
  
  if (vttPaths.length === 0) {
    throw new Error("No VTT segments found in M3U8");
  }
  
  const vttUrls = vttPaths.map((path) => resolveUrl(m3u8Url, path));
  const vtts: CapturedVtt[] = [];
  const vttParts: string[] = ["WEBVTT\n"];
  const plainParts: string[] = [];
  
  // console.log(`[VTT Module] Fetching ${vttUrls.length} VTT files...`);
  
  for (const vttUrl of vttUrls) {
    try {
      const response = await fetch(vttUrl);
      if (!response.ok) {
        // console.warn(`Failed to fetch VTT: ${vttUrl}`);
        continue;
      }
      const content = await response.text();
      
      vtts.push({
        url: vttUrl,
        content: content,
        timestamp: Date.now(),
      });
      
      const cleanContent = content.replace(/^\ufeff?WEBVTT[^\n]*\n/, "");
      vttParts.push(cleanContent.trim() + "\n\n");
      plainParts.push(vttToPlainText(cleanContent));
    } catch (err) {
      // console.warn(`Error fetching VTT ${vttUrl}:`, err);
    }
  }
  
  const rawVtt = vttParts.join("").trim() + "\n";
  const transcript = plainParts.filter(p => p.trim()).join("\n").trim() + "\n";
  
  return { vtts, rawVtt, transcript };
}

/**
 * Validate M3U8 content for VTT extraction
 */
export function isValidM3u8Content(content: string): boolean {
  if (!content.trim().startsWith("#EXTM3U")) return false;
  if (!content.toLowerCase().includes(".vtt")) return false;
  return true;
}

/**
 * Fetch M3U8 content
 */
export async function fetchM3u8Content(url: string): Promise<string> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch M3U8: ${response.status}`);
  }
  return response.text();
}
