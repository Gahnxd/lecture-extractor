// Background service worker for the VTT interceptor extension
// Uses chrome.webRequest to detect M3U8 URLs, then fetches VTT files

export interface CapturedVtt {
  url: string;
  content: string;
  timestamp: number;
}

export interface TranscriptEntry {
  id: string;
  m3u8Url: string;
  pageUrl: string;
  pageTitle: string;
  vtts: CapturedVtt[];
  rawVtt: string;
  transcript: string;
  timestamp: number;
  status: "loading" | "complete" | "error";
  error?: string;
}

export interface GlobalData {
  transcripts: TranscriptEntry[];
}

/**
 * Parse M3U8 content to extract VTT paths (same logic as main.py)
 */
function parseM3u8ForVttPaths(m3u8Text: string): string[] {
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
 * Convert VTT content to plain text transcript (same logic as main.py)
 */
function vttToPlainText(vtt: string): string {
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
async function fetchVttsFromM3u8(
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
  
  console.log(`[VTT Background] Fetching ${vttUrls.length} VTT files...`);
  
  for (const vttUrl of vttUrls) {
    try {
      const response = await fetch(vttUrl);
      if (!response.ok) {
        console.warn(`Failed to fetch VTT: ${vttUrl}`);
        continue;
      }
      const content = await response.text();
      
      vtts.push({
        url: vttUrl,
        content: content,
        timestamp: Date.now(),
      });
      
      // Remove WEBVTT header for merging
      const cleanContent = content.replace(/^\ufeff?WEBVTT[^\n]*\n/, "");
      vttParts.push(cleanContent.trim() + "\n\n");
      plainParts.push(vttToPlainText(cleanContent));
    } catch (err) {
      console.warn(`Error fetching VTT ${vttUrl}:`, err);
    }
  }
  
  const rawVtt = vttParts.join("").trim() + "\n";
  const transcript = plainParts.filter(p => p.trim()).join("\n").trim() + "\n";
  
  return { vtts, rawVtt, transcript };
}

/**
 * Check if URL is an M3U8 file
 */
function isM3u8Url(url: string): boolean {
  const lowerUrl = url.toLowerCase();
  return (
    lowerUrl.endsWith(".m3u8") ||
    lowerUrl.includes(".m3u8?") ||
    lowerUrl.includes(".m3u8#")
  );
}

/**
 * Generate unique ID
 */
function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

/**
 * Get page title for a tab
 */
async function getPageInfo(tabId: number): Promise<{ url: string; title: string }> {
  try {
    const tab = await chrome.tabs.get(tabId);
    return { url: tab.url || "", title: tab.title || "Unknown Page" };
  } catch {
    return { url: "", title: "Unknown Page" };
  }
}

/**
 * Process a detected M3U8 URL
 */
async function processM3u8Url(m3u8Url: string, tabId: number) {
  console.log(`[VTT Background] Processing M3U8: ${m3u8Url}`);
  
  try {
    // Fetch the M3U8 content
    const response = await fetch(m3u8Url);
    if (!response.ok) {
      console.warn(`[VTT Background] Failed to fetch M3U8: ${response.status}`);
      return;
    }
    
    const m3u8Content = await response.text();
    
    // Check if it's an M3U8 with VTT references
    if (!m3u8Content.trim().startsWith("#EXTM3U")) {
      console.log(`[VTT Background] Not a valid M3U8: ${m3u8Url}`);
      return;
    }
    
    if (!m3u8Content.toLowerCase().includes(".vtt")) {
      console.log(`[VTT Background] M3U8 has no VTT refs: ${m3u8Url}`);
      return;
    }
    
    console.log(`[VTT Background] Found M3U8 with VTT refs: ${m3u8Url}`);
    
    // Get page info first - we'll use pageUrl as the unique key
    const pageInfo = await getPageInfo(tabId);
    
    // Get existing data
    const result = await chrome.storage.local.get(["global_data"]);
    const globalData: GlobalData = (result.global_data as GlobalData) || { transcripts: [] };

    // Check if already captured for this page URL - if so, update instead of creating new
    const existingIndex = globalData.transcripts.findIndex((t) => t.pageUrl === pageInfo.url);
    
    if (existingIndex !== -1) {
      console.log(`[VTT Background] Updating existing entry for page: ${pageInfo.url}`);
    }
    
    // Create or update entry
    const entryId = existingIndex !== -1 ? globalData.transcripts[existingIndex].id : generateId();
    
    const newEntry: TranscriptEntry = {
      id: entryId,
      m3u8Url: m3u8Url,
      pageUrl: pageInfo.url,
      pageTitle: pageInfo.title,
      vtts: [],
      rawVtt: "",
      transcript: "",
      timestamp: Date.now(),
      status: "loading",
    };
    
    if (existingIndex !== -1) {
      // Replace existing entry
      console.log(`[VTT Background] Updating existing entry: ${m3u8Url}`);
      globalData.transcripts[existingIndex] = newEntry;
    } else {
      // Add new entry at the beginning
      globalData.transcripts.unshift(newEntry);
    }
    await chrome.storage.local.set({ global_data: globalData });
    
    // Update badge
    chrome.action.setBadgeText({ tabId: tabId, text: "..." });
    chrome.action.setBadgeBackgroundColor({ tabId: tabId, color: "#FFA500" });

    // Fetch VTT files
    const { vtts, rawVtt, transcript } = await fetchVttsFromM3u8(m3u8Url, m3u8Content);
    
    // Update entry
    const entryIndex = globalData.transcripts.findIndex((t) => t.id === newEntry.id);
    if (entryIndex !== -1) {
      globalData.transcripts[entryIndex] = {
        ...globalData.transcripts[entryIndex],
        vtts,
        rawVtt,
        transcript,
        status: "complete",
      };
    }
    
    await chrome.storage.local.set({ global_data: globalData });
    
    console.log(`[VTT Background] Captured ${vtts.length} VTT files`);
    
    chrome.action.setBadgeText({ tabId: tabId, text: "✓" });
    chrome.action.setBadgeBackgroundColor({ tabId: tabId, color: "#4CAF50" });
    
  } catch (err) {
    console.error(`[VTT Background] Error processing M3U8:`, err);
  }
}

// Use webRequest to detect M3U8 URLs
chrome.webRequest.onCompleted.addListener(
  (details) => {
    if (details.url.includes("m3u8") || details.url.includes("vtt")) {
      console.log(`[VTT Background] Saw request: ${details.url}`);
    }
    
    if (details.tabId > 0 && isM3u8Url(details.url)) {
      console.log(`[VTT Background] ✓ Detected M3U8: ${details.url}`);
      processM3u8Url(details.url, details.tabId);
    }
  },
  { urls: ["<all_urls>"] }
);

console.log("[VTT Background] webRequest listeners registered");

// Listen for messages from popup
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === "GET_ALL_TRANSCRIPTS") {
    chrome.storage.local.get(["global_data"], (result) => {
      const globalData: GlobalData = (result.global_data as GlobalData) || { transcripts: [] };
      sendResponse(globalData.transcripts);
    });
    return true;
  }

  if (message.type === "DELETE_TRANSCRIPT" && message.id) {
    chrome.storage.local.get(["global_data"], (result) => {
      const globalData: GlobalData = (result.global_data as GlobalData) || { transcripts: [] };
      globalData.transcripts = globalData.transcripts.filter((t) => t.id !== message.id);
      chrome.storage.local.set({ global_data: globalData }, () => {
        sendResponse({ success: true });
      });
    });
    return true;
  }

  if (message.type === "DELETE_SELECTED" && message.ids) {
    chrome.storage.local.get(["global_data"], (result) => {
      const globalData: GlobalData = (result.global_data as GlobalData) || { transcripts: [] };
      globalData.transcripts = globalData.transcripts.filter((t) => !message.ids.includes(t.id));
      chrome.storage.local.set({ global_data: globalData }, () => {
        sendResponse({ success: true });
      });
    });
    return true;
  }
});

console.log("[VTT Background] Service worker started");
