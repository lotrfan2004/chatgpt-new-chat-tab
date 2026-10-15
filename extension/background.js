"use strict";

chrome.runtime.onMessage.addListener((message, sender, respond) => {
  if (message?.type !== "open-new-chat") return;
  let source;
  try {
    source = new URL(sender.url);
  } catch {
    return;
  }
  if (sender.id !== chrome.runtime.id || !sender.tab || sender.frameId !== 0
      || source.origin !== "https://chatgpt.com") return;

  // Construct the destination here rather than accepting arbitrary URLs from the page.
  chrome.tabs.create({
    url: "https://chatgpt.com/",
    active: message.active === true,
    windowId: sender.tab.windowId,
    index: sender.tab.index + 1,
    openerTabId: sender.tab.id
  }).then(() => respond({ ok: true })).catch(() => respond({ ok: false }));
  return true;
});
