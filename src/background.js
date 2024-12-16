// background.js
let loginTabId = null;

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'OPEN_AUTH_TAB') {
    chrome.tabs.create({ 
      url: chrome.runtime.getURL('index.html?auth=true'),
      active: true
    }, (tab) => {
      loginTabId = tab.id;
    });
  }
  
  if (request.type === 'LOGIN_SUCCESS') {
    // The tab will close itself after showing success message
    // Focus the extension popup
    chrome.action.openPopup();
  }
});

// background.js

let activeTabId = null;

// Listen for messages from popup/content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  switch (request.type) {
    case 'ACTIVATE_KITTY':
      // When popup wants to activate kitty, open on current tab
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]?.id) {
          activeTabId = tabs[0].id;
          chrome.tabs.sendMessage(activeTabId, { 
            type: 'SHOW_KITTY',
            kittyData: request.kittyData 
          });
        }
      });
      break;

    case 'DEACTIVATE_KITTY':
      // When deactivating, remove kitty from active tab
      if (activeTabId) {
        chrome.tabs.sendMessage(activeTabId, { type: 'HIDE_KITTY' });
        activeTabId = null;
      }
      break;
      
    case 'CHECK_ALIVE':
      // Heartbeat check from popup
      sendResponse({ alive: true });
      break;
  }
});

// Clean up when tab closes/changes
chrome.tabs.onRemoved.addListener((tabId) => {
  if (tabId === activeTabId) {
    activeTabId = null;
  }
});

chrome.tabs.onActivated.addListener(({ tabId }) => {
  if (activeTabId && tabId !== activeTabId) {
    chrome.tabs.sendMessage(activeTabId, { type: 'HIDE_KITTY' });
    activeTabId = null;
  }
});