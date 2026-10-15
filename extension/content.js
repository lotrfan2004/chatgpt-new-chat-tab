(() => {
  "use strict";

  const controls = 'button, a, [role="button"], [role="link"]';
  const normalize = (value) => (value || "").replace(/\s+/g, " ").trim();
  const isNewChatLabel = (value) => /^new chat(?:\s*(?:[⌘⇧⌃⌥+]|ctrl|shift|alt|command).*)?$/i.test(normalize(value));

  function findNewChat(event) {
    // Delegation survives React replacing either sidebar, including collapsed icon buttons.
    // Only inspect the clicked control, never scan conversation messages.
    for (const node of event.composedPath()) {
      if (!(node instanceof Element) || !node.matches(controls)) continue;
      if (node.closest('main, [role="main"], [data-message-author-role], [contenteditable="true"]')) return null;
      if (node.matches(':disabled, [aria-disabled="true"]')) return null;

      const label = node.getAttribute("aria-label") || node.getAttribute("title");
      const isNewChat = label
        ? isNewChatLabel(label)
        : node.getAttribute("data-testid") === "create-new-chat-button"
          || isNewChatLabel(node.textContent);
      // Do not accidentally match "New chat in <project>" or a named conversation.
      return isNewChat ? node : null;
    }
    return null;
  }

  function handle(event) {
    if (!event.isTrusted) return;
    const modifiedClick = event.button === 0 && (event.metaKey || event.ctrlKey);
    const middleClick = event.button === 1;
    if (event.altKey || (!modifiedClick && !middleClick)) return;
    if (!findNewChat(event) || !chrome.runtime?.id) return;

    // Capture before React's delegated handlers so the original chat stays untouched.
    event.preventDefault();
    event.stopImmediatePropagation();
    // Suppress early mouse handlers, but open exactly once on the final click event.
    if (event.type !== "click" && event.type !== "auxclick") return;
    chrome.runtime.sendMessage({ type: "open-new-chat", active: event.shiftKey }, () => {
      if (chrome.runtime.lastError) {
        console.warn("New Chat in a Tab: reload this ChatGPT tab after reloading the extension.");
      }
    });
  }

  for (const name of ["pointerdown", "pointerup", "mousedown", "mouseup", "click", "auxclick"]) {
    window.addEventListener(name, handle, { capture: true, passive: false });
  }
})();
