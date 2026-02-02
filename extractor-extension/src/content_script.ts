// Content script that bridges the injected script and the background service worker
// This runs in the content script context with access to chrome APIs

interface M3u8CaptureMessage {
  type: "M3U8_CAPTURED";
  url: string;
  content: string;
  timestamp: number;
}

// Inject the interceptor script into the page
function injectScript() {
  const script = document.createElement("script");
  script.src = chrome.runtime.getURL("injected.js");
  script.onload = function () {
    (this as HTMLScriptElement).remove();
  };
  (document.head || document.documentElement).appendChild(script);
}

// Listen for messages from the injected script
window.addEventListener("message", (event) => {
  // Only accept messages from the same window
  if (event.source !== window) return;

  const message = event.data as M3u8CaptureMessage;

  if (message && message.type === "M3U8_CAPTURED") {
    // Forward to background service worker
    chrome.runtime.sendMessage({
      type: "M3U8_CAPTURED",
      url: message.url,
      content: message.content,
      timestamp: message.timestamp,
      pageUrl: window.location.href,
      pageTitle: document.title,
    });
  }
});

// Inject the script when the content script loads
injectScript();

console.log("[VTT Content Script] Loaded and listening for M3U8 captures");
