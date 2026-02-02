/**
 * Check if a URL looks like an SRT file
 */
export function isSrtUrl(url: string): boolean {
  const lowerUrl = url.toLowerCase();
  return lowerUrl.endsWith(".srt") || lowerUrl.includes(".srt?");
}

/**
 * Convert SRT content to plain text transcript
 * - remove numeric counters
 * - remove timestamps
 * - keep cue text, de-duplicate consecutive identical lines
 */
export function srtToPlainText(srtContent: string): string {
  const lines = srtContent.split("\n");
  const out: string[] = [];
  
  // Regex for "00:00:10,810 --> 00:00:13,750" (comma or dot)
  const timestampRe = /^\d{1,3}:\d{2}:\d{2}[,.]\d{3}\s+-->\s+\d{1,3}:\d{2}:\d{2}[,.]\d{3}/;
  
  let lastKept = "";
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].replace(/^\ufeff/, "").trim(); // Remove BOM & whitespace
    
    // 1. Skip blank lines
    if (!line) continue;
    
    // 2. Skip numeric counter lines (just digits)
    if (/^\d+$/.test(line)) continue;
    
    // 3. Skip timestamps
    if (timestampRe.test(line)) continue;
    
    // 4. Text line
    if (line !== lastKept) {
      out.push(line);
      lastKept = line;
    }
  }
  
  return out.join("\n").trim() + "\n";
}

/**
 * Fetch and process an SRT file
 */
export async function fetchSrt(url: string): Promise<{ rawSrt: string; transcript: string }> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch SRT: ${response.status}`);
  }
  const rawSrt = await response.text();
  const transcript = srtToPlainText(rawSrt);
  return { rawSrt, transcript };
}
