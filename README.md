# ChatGPT — New Chat in a Tab

Restores the Mac Command-click behavior on ChatGPT's New chat buttons, including the icon-only button and the button beside Recents.

Independent community extension. Not affiliated with or endorsed by OpenAI.

**Experimental release:** automated logic tests pass, but end-to-end behavior on the current signed-in ChatGPT interface has not yet been verified. Please test before relying on it.

## Install in Chrome

1. Download and extract the source ZIP, or clone this repository. Enter `chrome://extensions` in Chrome's address bar.
2. Turn on **Developer mode** at the top right.
3. Click **Load unpacked**.
4. Select the **extension** folder inside the extracted download or cloned repository. If you downloaded the extension-only release ZIP, select the extracted folder containing `manifest.json` instead.
5. Reload any already-open ChatGPT tabs once.

Keep the extension folder in place. Chrome loads the files from that folder.

## Use

| Gesture on New chat | Result |
| --- | --- |
| Command-click (Mac) | Fresh chat in a background tab; current chat stays open |
| Command-Shift-click | Fresh chat in a new tab and switch to it |
| Ctrl-click (Windows/Linux) | Fresh chat in a background tab |
| Middle-click | Fresh chat in a background tab |
| Ordinary click | ChatGPT's usual behavior |

Project-specific New chat controls are intentionally left to ChatGPT. New tabs start at `https://chatgpt.com/`; model, project, and temporary-chat context are not copied.

## Privacy and limitations

- Runs only on `https://chatgpt.com/*`.
- No external services, analytics, storage, account tokens, or dependencies.
- It examines the control you click to recognize New chat. It does not read or send conversation contents.
- Chrome may display a site-access notice because recognizing the button requires a content script on ChatGPT.
- A later ChatGPT redesign or a non-English button label could require an update.
- Install locally using the steps above. There is currently no Chrome Web Store listing.

See [PRIVACY.md](PRIVACY.md) for the privacy statement. Report problems through this repository's Issues tab; include the extension version, browser version, and which control you clicked. Do not attach private conversations.

## Remove or update

Remove it from `chrome://extensions` whenever you like. After changing the extension files, click its Reload button there and reload ChatGPT tabs.

## Verify

Run `npm test` from this directory. Tests exercise modified clicks, nested icons, ordinary clicks, late-rendered buttons, unrelated controls, and the tab-opening message boundary.

Chrome's official installation guide: https://developer.chrome.com/docs/extensions/get-started/tutorial/hello-world#load-unpacked
