let videoUrls = {};
const MEDIA_EXT = /\.(mp4|webm|m4v|m3u8|ts|m4s)(?:\?|$)/i;

chrome.webRequest.onBeforeRequest.addListener(
  (details) => {
    // 忽略非分頁的請求 (例如插件本身的請求)
    if (details.tabId < 0) return;

    const url = details.url;
    const tabId = details.tabId;

    if (MEDIA_EXT.test(url)) {
      if (!videoUrls[tabId]) videoUrls[tabId] = [];
      if (!videoUrls[tabId].includes(url)) {
        videoUrls[tabId].push(url);
        // 在 Service Worker 的控制台印出，確認後台有抓到
        console.log(`[Tab ${tabId}] 偵測到: ${url}`);
      }
    }
  },
  { urls: ["<all_urls>"] }
);

// 監聽 Popup 的呼叫
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "getVideoList") {
    const list = videoUrls[request.tabId] || [];
    console.log(`[Tab ${request.tabId}] Popup 請求清單，目前數量: ${list.length}`);
    sendResponse({ videos: list });
  }
  return true;
});

// 清理與重新整理
chrome.tabs.onRemoved.addListener(id => delete videoUrls[id]);
chrome.webNavigation.onBeforeNavigate.addListener(d => {
  if (d.frameId === 0) videoUrls[d.tabId] = [];
});