import {
  isM3u8Url,
  fetchVttsFromM3u8,
  fetchM3u8Content,
  isValidM3u8Content,
  isSrtUrl,
  fetchSrt,
  type TranscriptEntry,
  type GlobalData,
} from "./lib/extract";

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
  // console.log(`[Background] Processing M3U8: ${m3u8Url}`);
  
  try {
    const result = await chrome.storage.local.get(["global_data"]);
    const globalData: GlobalData = (result.global_data as GlobalData) || { transcripts: [] };
    const pageInfo = await getPageInfo(tabId);
    
    // Skip if SRT already exists for this page
    const existingEntry = globalData.transcripts.find(t => t.pageUrl === pageInfo.url);
    if (existingEntry && existingEntry.format === "srt") return;

    // Fetch the M3U8 content
    let m3u8Content: string;
    try {
      m3u8Content = await fetchM3u8Content(m3u8Url);
    } catch (e) {
      // console.warn(`[Background] Failed to fetch M3U8:`, e);
      return;
    }
    
    // Check VTT references
    if (!isValidM3u8Content(m3u8Content)) {
      // console.debug(`[Background] Invalid M3U8 for VTT: ${m3u8Url}`);
      return;
    }
    
    // console.debug(`[Background] Found M3U8 with VTT refs: ${m3u8Url}`);
    
    await createOrUpdateEntry({
      sourceUrl: m3u8Url,
      pageUrl: pageInfo.url,
      pageTitle: pageInfo.title,
      format: "vtt",
    }, tabId);

    // Fetch VTT files
    const { vtts, rawVtt, transcript } = await fetchVttsFromM3u8(m3u8Url, m3u8Content);
    
    await updateEntryStatus(pageInfo.url, {
      vtts,
      rawVtt,
      transcript,
      status: "complete",
    }, tabId);
    
    // console.log(`[Background] Captured ${vtts.length} VTT files`);
  } catch (err) {
    // console.error(`[Background] Error processing M3U8:`, err);
  }
}

/**
 * Process a detected SRT URL
 */
async function processSrtUrl(srtUrl: string, tabId: number) {
  // console.log(`[Background] Processing SRT: ${srtUrl}`);

  try {
    const pageInfo = await getPageInfo(tabId);
    const { rawSrt, transcript } = await fetchSrt(srtUrl);

    await createOrUpdateEntry({
      sourceUrl: srtUrl,
      pageUrl: pageInfo.url,
      pageTitle: pageInfo.title,
      format: "srt",
    }, tabId);

    await updateEntryStatus(pageInfo.url, {
      vtts: [],
      rawVtt: rawSrt,
      transcript,
      status: "complete",
    }, tabId);

  } catch (err) {
    // console.error(`[Background] Error processing SRT:`, err);
  }
}

/**
 * Helper to create or update entry in loading state
 */
async function createOrUpdateEntry(
  data: { sourceUrl: string; pageUrl: string; pageTitle: string; format: "vtt" | "srt" },
  tabId: number
) {
  const result = await chrome.storage.local.get(["global_data"]);
  const globalData: GlobalData = (result.global_data as GlobalData) || { transcripts: [] };

  const existingIndex = globalData.transcripts.findIndex((t) => t.pageUrl === data.pageUrl);
  const entryId = existingIndex !== -1 ? globalData.transcripts[existingIndex].id : generateId();

  const newEntry: TranscriptEntry = {
    id: entryId,
    sourceUrl: data.sourceUrl,
    pageUrl: data.pageUrl,
    pageTitle: data.pageTitle,
    vtts: [],
    rawVtt: "",
    transcript: "",
    timestamp: Date.now(),
    status: "loading",
    format: data.format,
  };

  if (existingIndex !== -1) {
    globalData.transcripts[existingIndex] = newEntry;
  } else {
    globalData.transcripts.unshift(newEntry);
  }

  await chrome.storage.local.set({ global_data: globalData });

  chrome.action.setBadgeText({ tabId: tabId, text: "..." });
  chrome.action.setBadgeBackgroundColor({ tabId: tabId, color: "#FFA500" });
}

/**
 * Helper to update entry to complete status
 */
async function updateEntryStatus(
  pageUrl: string,
  update: Partial<TranscriptEntry>,
  tabId: number
) {
  const result = await chrome.storage.local.get(["global_data"]);
  const globalData: GlobalData = (result.global_data as GlobalData) || { transcripts: [] };

  const entryIndex = globalData.transcripts.findIndex((t) => t.pageUrl === pageUrl);
  if (entryIndex !== -1) {
    globalData.transcripts[entryIndex] = {
      ...globalData.transcripts[entryIndex],
      ...update,
    };
    await chrome.storage.local.set({ global_data: globalData });
    
    chrome.action.setBadgeText({ tabId: tabId, text: "✓" });
    chrome.action.setBadgeBackgroundColor({ tabId: tabId, color: "#4CAF50" });
  }
}

// Use webRequest to detect M3U8 and SRT URLs
chrome.webRequest.onCompleted.addListener(
  (details) => {
    if (details.tabId > 0) {
      if (isM3u8Url(details.url)) {
        processM3u8Url(details.url, details.tabId);
      } else if (isSrtUrl(details.url)) {
        processSrtUrl(details.url, details.tabId);
      }
    }
  },
  { urls: ["<all_urls>"] }
);

// console.log("[Background] webRequest listeners registered");

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



// Handle extension icon click - toggle floating button
chrome.action.onClicked.addListener(async (tab) => {
  if (tab.id) {
    try {
      await chrome.tabs.sendMessage(tab.id, { type: "TOGGLE_FLOATING_UI" });
    } catch (err) {
      // console.log("[Background] Could not send toggle message:", err);
    }
  }
});
