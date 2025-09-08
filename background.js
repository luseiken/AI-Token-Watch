chrome.runtime.onInstalled.addListener(() => {
  const defaultSettings = {
    enabled: true,
    warningThreshold: 80,
    minRemainingTokens: 1000,
    maxTokens: 8000,
    updateInterval: 2000
  };

  chrome.storage.sync.set(defaultSettings);
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'TOKEN_WARNING') {
    showTokenWarning(message);
  }
});

function showTokenWarning(data) {
  const percentage = Math.round((data.tokens / data.maxTokens) * 100);
  
  chrome.notifications.create({
    type: 'basic',
    iconUrl: 'icons/icon48.png',
    title: 'ChatGPT Token Warning',
    message: `Token usage: ${percentage}% (${data.remaining.toLocaleString()} remaining)`,
    priority: 1
  });
}

chrome.action.onClicked.addListener((tab) => {
  chrome.action.openPopup();
});