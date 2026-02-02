// Injected script that intercepts XHR and fetch requests to capture M3U8 responses
// This runs in the page context, NOT the extension context

// Extend XMLHttpRequest with custom property
interface ExtendedXMLHttpRequest extends XMLHttpRequest {
  _requestUrl?: string;
}

interface M3u8CaptureMessage {
  type: "M3U8_CAPTURED";
  url: string;
  content: string;
  timestamp: number;
}

/**
 * Check if the content looks like an M3U8 playlist with VTT segments
 */
function isVttM3u8(content: string): boolean {
  // M3U8 files start with #EXTM3U
  if (!content.trim().startsWith("#EXTM3U")) {
    return false;
  }
  // Check if it contains .vtt references
  return content.toLowerCase().includes(".vtt");
}

/**
 * Check if URL or content-type indicates M3U8
 */
function mightBeM3u8(url: string, contentType: string): boolean {
  const lowerUrl = url.toLowerCase();
  const lowerContentType = contentType.toLowerCase();
  
  return (
    lowerUrl.endsWith(".m3u8") ||
    lowerUrl.includes(".m3u8?") ||
    lowerUrl.includes("m3u8") ||
    lowerUrl.includes("hls") ||
    lowerUrl.includes("playlist") ||
    lowerUrl.includes("caption") ||
    lowerUrl.includes("webvtt") ||
    lowerContentType.includes("application/vnd.apple.mpegurl") ||
    lowerContentType.includes("application/x-mpegurl") ||
    lowerContentType.includes("audio/mpegurl") ||
    lowerContentType.includes("text/plain") ||
    lowerContentType.includes("application/octet-stream") ||
    lowerContentType === ""
  );
}

// Intercept XMLHttpRequest
const originalXhrOpen = XMLHttpRequest.prototype.open;
const originalXhrSend = XMLHttpRequest.prototype.send;

XMLHttpRequest.prototype.open = function (
  this: ExtendedXMLHttpRequest,
  method: string,
  url: string | URL,
  async: boolean = true,
  username?: string | null,
  password?: string | null
) {
  this._requestUrl = url.toString();
  return originalXhrOpen.call(this, method, url, async, username ?? null, password ?? null);
};

XMLHttpRequest.prototype.send = function (
  this: ExtendedXMLHttpRequest,
  body?: Document | XMLHttpRequestBodyInit | null
) {
  this.addEventListener("load", function () {
    try {
      const xhr = this as ExtendedXMLHttpRequest;
      const url = xhr._requestUrl || this.responseURL;
      const contentType = this.getResponseHeader("content-type") || "";

      // Check if response might be M3U8 (more permissive check)
      if (this.responseText && mightBeM3u8(url, contentType)) {
        // Actually verify the content is M3U8 with VTT
        if (isVttM3u8(this.responseText)) {
          console.log("[VTT Interceptor] XHR Captured M3U8 with VTT:", url);
          const message: M3u8CaptureMessage = {
            type: "M3U8_CAPTURED",
            url: url,
            content: this.responseText,
            timestamp: Date.now(),
          };
          window.postMessage(message, "*");
        }
      }
    } catch (err) {
      console.debug("[VTT Interceptor] Error processing XHR response:", err);
    }
  });
  return originalXhrSend.call(this, body);
};

// Intercept fetch
const originalFetch = window.fetch;

window.fetch = async function (...args: Parameters<typeof fetch>) {
  const response = await originalFetch.apply(this, args);

  try {
    const url =
      typeof args[0] === "string"
        ? args[0]
        : args[0] instanceof URL
        ? args[0].toString()
        : args[0] instanceof Request
        ? args[0].url
        : "";

    const contentType = response.headers.get("content-type") || "";

    // Check if response might be M3U8 (more permissive check)
    if (mightBeM3u8(url, contentType)) {
      // Clone the response so we can read it without consuming it
      const clonedResponse = response.clone();
      const content = await clonedResponse.text();

      // Actually verify the content is M3U8 with VTT
      if (isVttM3u8(content)) {
        console.log("[VTT Interceptor] Fetch Captured M3U8 with VTT:", url);
        const message: M3u8CaptureMessage = {
          type: "M3U8_CAPTURED",
          url: url,
          content: content,
          timestamp: Date.now(),
        };
        window.postMessage(message, "*");
      }
    }
  } catch (err) {
    console.debug("[VTT Interceptor] Error processing fetch response:", err);
  }

  return response;
};

console.log("[VTT Interceptor] M3U8 network interception active (v2)");
