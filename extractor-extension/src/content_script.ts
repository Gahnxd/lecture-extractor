// Bridges injected script and background service worker (runs in content script context)

interface M3u8CaptureMessage {
  type: "M3U8_CAPTURED";
  url: string;
  content: string;
  timestamp: number;
}

// Inject interceptor script (skipped gracefully if blocked by CSP)
function injectScript() {
  try {
    const script = document.createElement("script");
    script.src = chrome.runtime.getURL("injected.js");
    
    script.onload = function () {
      (this as HTMLScriptElement).remove();
    };
    
    script.onerror = function () {
      // console.log("[VTE] Script injection blocked by CSP, skipping (page will work normally)");
      (this as HTMLScriptElement).remove();
    };
    
    (document.head || document.documentElement).appendChild(script);
  } catch (e) {
    // console.warn("[VTE] Failed to inject script:", e);
  }
}

// Forward M3U8 captures from injected script to background
window.addEventListener("message", (event) => {
  if (event.source !== window) return;

  const message = event.data as M3u8CaptureMessage;

  if (message && message.type === "M3U8_CAPTURED") {
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

injectScript();

// console.log("[VTT Content Script] Loaded and listening for M3U8 captures");

// =====================================================
// Floating Button UI
// =====================================================

async function createFloatingUI() {
  if (document.getElementById('vte-floating-container')) return;

  const result = await chrome.storage.local.get(['floating_ui_hidden']);
  const isHidden = result.floating_ui_hidden === true;

  const container = document.createElement('div');
  container.id = 'vte-floating-container';
  
  const shadow = container.attachShadow({ mode: 'open' });
  
  const style = document.createElement('style');
  style.textContent = `
    .vte-fab {
      position: fixed;
      bottom: 20px;
      right: 20px;
      width: 56px;
      height: 56px;
      border-radius: 50%;
      background: linear-gradient(135deg, #3b82f6, #8b5cf6);
      border: none;
      cursor: pointer;
      z-index: 2147483647;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      transition: transform 0.2s, box-shadow 0.2s;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .vte-fab:hover {
      transform: scale(1.1);
      box-shadow: 0 6px 16px rgba(0,0,0,0.4);
    }
    .vte-fab.open {
      transform: scale(0.9);
    }
    .vte-fab svg {
      width: 24px;
      height: 24px;
      fill: white;
    }
    
    .vte-panel {
      position: fixed;
      bottom: 90px;
      right: 20px;
      width: 620px;
      height: 640px;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 8px 32px rgba(0,0,0,0.4);
      z-index: 2147483646;
      transform: scale(0.95) translateY(10px);
      opacity: 0;
      pointer-events: none;
      transition: transform 0.2s ease, opacity 0.2s ease;
    }
    .vte-panel.open {
      transform: scale(1) translateY(0);
      opacity: 1;
      pointer-events: auto;
    }
    .vte-panel iframe {
      width: 100%;
      height: 100%;
      border: none;
      border-radius: 12px;
    }

    .vte-fab-wrapper {
      position: fixed;
      bottom: 20px;
      right: 20px;
      z-index: 2147483647;
    }
    .vte-close {
      position: absolute;
      top: -8px;
      right: -8px;
      width: 24px;
      height: 24px;
      border-radius: 50%;
      background: rgba(127, 29, 29, 0.3);
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
      border: 1px solid rgba(248, 113, 113, 0.2);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 2147483648;
      transition: transform 0.15s, background 0.15s, border-color 0.15s;
    }
    .vte-close:hover {
      transform: scale(1.1);
      background: rgba(127, 29, 29, 0.5);
      border-color: rgba(248, 113, 113, 0.4);
    }
    .vte-close svg {
      width: 14px;
      height: 14px;
      stroke: #f87171;
      stroke-width: 2;
      stroke-linecap: round;
      stroke-linejoin: round;
      fill: none;
      transition: stroke 0.15s;
    }
    .vte-close:hover svg {
      stroke: #fca5a5;
    }
  `;
  
  // Create wrapper for FAB + close button
  const fabWrapper = document.createElement('div');
  fabWrapper.className = 'vte-fab-wrapper';

  // Create floating action button with captions icon
  const fab = document.createElement('button');
  fab.className = 'vte-fab';
  fab.style.position = 'relative';
  fab.style.bottom = 'auto';
  fab.style.right = 'auto';
  fab.title = 'Video Transcript Extractor';
  fab.innerHTML = `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path d="M19 4H5c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm-8 7H9.5v-.5h-2v3h2V13H11v1c0 .55-.45 1-1 1H7c-.55 0-1-.45-1-1v-4c0-.55.45-1 1-1h3c.55 0 1 .45 1 1v1zm7 0h-1.5v-.5h-2v3h2V13H18v1c0 .55-.45 1-1 1h-3c-.55 0-1-.45-1-1v-4c0-.55.45-1 1-1h3c.55 0 1 .45 1 1v1z"/>
  </svg>`;

  // Create close button
  const closeBtn = document.createElement('button');
  closeBtn.className = 'vte-close';
  closeBtn.title = 'Hide transcript extractor';
  closeBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>`;
  closeBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    panel.classList.remove('open');
    fab.classList.remove('open');
    chrome.storage.local.set({ floating_ui_hidden: true });
    container.style.display = 'none';
  });

  fabWrapper.appendChild(fab);
  fabWrapper.appendChild(closeBtn);
  
  // Create panel with iframe
  const panel = document.createElement('div');
  panel.className = 'vte-panel';
  
  const iframe = document.createElement('iframe');
  iframe.src = chrome.runtime.getURL('index.html');
  iframe.allow = 'clipboard-write';
  panel.appendChild(iframe);
  
  // Toggle panel on button click
  fab.addEventListener('click', (e) => {
    e.stopPropagation();
    const isOpen = panel.classList.toggle('open');
    fab.classList.toggle('open', isOpen);
  });
  
  // Close panel when clicking outside
  document.addEventListener('click', (e) => {
    const target = e.target as Node;
    if (!container.contains(target)) {
      panel.classList.remove('open');
      fab.classList.remove('open');
    }
  });
  
  shadow.appendChild(style);
  shadow.appendChild(fabWrapper);
  shadow.appendChild(panel);
  document.body.appendChild(container);

  if (isHidden) {
    container.style.display = 'none';
  }
}

function initFloatingUI() {
  createFloatingUI().catch(e => e); //console.warn("[VTE] Failed to create floating UI:", e));
}

if (document.body) {
  initFloatingUI();
} else {
  document.addEventListener('DOMContentLoaded', initFloatingUI);
}

// Listen for toggle message from background script
chrome.runtime.onMessage.addListener((message) => {
  if (message.type === "TOGGLE_FLOATING_UI") {
    const container = document.getElementById('vte-floating-container');
    if (container) {
      if (container.style.display === 'none') {
        container.style.display = '';
        chrome.storage.local.set({ floating_ui_hidden: false });
      }
    }
  }
});

