# Privacy

Effective October 15, 2026. Applies to version 1.0.0 of ChatGPT — New Chat in a Tab.

The extension does not collect, store, sell, or transmit personal information, chat contents, account details, browsing history, or analytics. It contains no external services or remote code.

The extension runs only on https://chatgpt.com/. When you use a supported modified click, it examines the clicked control's label and surrounding element structure to recognize the general New chat button. It sends an internal message to its own background worker to open https://chatgpt.com/ in a new tab. That message contains only an action identifier and whether to select the new tab.

Chrome supplies the originating tab's address, identifier, window, and position to the worker. The worker checks that the request came from the top-level ChatGPT page and opens the new tab beside it. This information is used in memory and is not stored or sent to any server by the extension.

Opening ChatGPT makes a normal request to ChatGPT, subject to that service's own privacy practices. The extension does not modify those practices.

Chrome's site-access notice allows this extension's content script to operate on ChatGPT. The extension does not request access to other sites or additional browser API permissions.

For questions, open an issue in the public project repository without including private conversations or account information.
