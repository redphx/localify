'use strict';

function sendRedirectConsoleLog(tabId, url, file) {
  if (tabId <= 0) {
    return;
  }

  let code = `console.log('%cLocalify%c Redirected %c${url} %cto %c${file}',`
      + "'background: #24292e; color: #ffffff; font-weight: bold; padding: 2px',"
      + "'',"
      + "'color: #e85600',"
      + "'',"
      + "'color: #32b643')";

  chrome.tabs.executeScript(tabId, { code });
}

function logRule(url, location) {
  console.log(`%cApply Rule%c Redirect %c${url} %cto %c${location}',`,
      'background: #24292e; color: #ffffff; font-weight: bold; padding: 2px',
      '',
      'color: #e85600',
      '',
      'color: #32b643');
}

function addRequestListeners(rules) {
  rules.forEach((rule, index) => {
    let localLocationUrl = chrome.runtime.getURL('files/' + rule.location);
    logRule(rule.url, localLocationUrl);

    chrome.webRequest.onBeforeRequest.addListener(details => {
      sendRedirectConsoleLog(details.tabId, details.url, localLocationUrl);
      return { redirectUrl: localLocationUrl };
    }, { urls: [rule.url] }, ['blocking']);
  });
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  switch (request.type) {
    case 'reload-background-page':
      window.location.reload();
      break;
  }
});

chrome.storage.local.get('rules', data => {
  let rules = data['rules'] || [];
  rules = rules.filter((rule) => rule.disable !== true);
  if (rules) {
    addRequestListeners(rules);
  }
});
