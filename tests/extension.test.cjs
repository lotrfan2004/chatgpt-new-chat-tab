const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const root = path.join(__dirname, '..', 'extension');

// A small DOM/event harness keeps tests dependency-free. Browser-specific behavior
// still needs a manual check after loading in Chrome; these are logic tests.
class Element {
  constructor(tag = 'button', attrs = {}, text = '') {
    this.tag = tag;
    this.attrs = attrs;
    this.textContent = text;
    this.inConversation = false;
  }
  getAttribute(name) { return this.attrs[name] ?? null; }
  matches(selector) {
    if (selector.startsWith(':disabled')) {
      return 'disabled' in this.attrs || this.attrs['aria-disabled'] === 'true';
    }
    return ['button', 'a'].includes(this.tag) || ['button', 'link'].includes(this.attrs.role);
  }
  closest() { return this.inConversation ? this : null; }
}

function contentHarness() {
  const listeners = new Map();
  const messages = [];
  const chrome = { runtime: {
    id: 'test-extension',
    sendMessage(message, callback) { messages.push(message); callback(); }
  } };
  vm.runInNewContext(readFileSync(path.join(root, 'content.js'), 'utf8'), {
    Element, chrome, console,
    window: { addEventListener(type, fn, options) {
      assert.equal(options.capture, true);
      assert.equal(options.passive, false);
      listeners.set(type, fn);
    } }
  });
  return {
    chrome, messages,
    fire(control, overrides = {}, type = 'click', prefix = []) {
      const event = {
        isTrusted: true, type, button: 0, metaKey: true, ctrlKey: false,
        shiftKey: false, altKey: false, prevented: false, stopped: false,
        composedPath: () => [...prefix, control],
        preventDefault() { this.prevented = true; },
        stopImmediatePropagation() { this.stopped = true; },
        ...overrides
      };
      listeners.get(type)(event);
      return event;
    }
  };
}

test('Command-click opens one background tab and stops the page click', () => {
  const h = contentHarness();
  const event = h.fire(new Element('button', { 'aria-label': 'New chat' }));
  assert.equal(h.messages.length, 1);
  assert.equal(h.messages[0].active, false);
  assert.equal(event.prevented, true);
  assert.equal(event.stopped, true);
});

test('a full mouse sequence opens once, not on pointerdown or mousedown', () => {
  const h = contentHarness();
  const button = new Element('button', {}, 'New chat');
  for (const type of ['pointerdown', 'mousedown', 'pointerup', 'mouseup', 'click']) {
    assert.equal(h.fire(button, {}, type).stopped, true);
  }
  assert.equal(h.messages.length, 1);
});

test('Command-Shift-click requests the foreground', () => {
  const h = contentHarness();
  h.fire(new Element('button', { title: 'New chat' }), { shiftKey: true });
  assert.equal(h.messages[0].active, true);
});

test('Ctrl-click and middle-click open tabs', () => {
  const h = contentHarness();
  const button = new Element('button', {}, 'New chat');
  h.fire(button, { metaKey: false, ctrlKey: true });
  h.fire(button, { button: 1, metaKey: false }, 'auxclick');
  assert.equal(h.messages.length, 2);
});

test('ordinary clicks, right clicks, Alt clicks and synthetic clicks pass through', () => {
  const h = contentHarness();
  const button = new Element('button', {}, 'New chat');
  for (const override of [{ metaKey: false }, { button: 2 }, { altKey: true }, { isTrusted: false }]) {
    const event = h.fire(button, override);
    assert.equal(event.prevented, false);
    assert.equal(event.stopped, false);
  }
  assert.equal(h.messages.length, 0);
});

test('nested icons and late-rendered controls work without rescanning the page', () => {
  const h = contentHarness();
  h.fire(new Element('button', { 'aria-label': 'New chat' }), {}, 'click', [new Element('svg')]);
  h.fire(new Element('a', {}, 'New chat ⌘⇧O'));
  h.fire(new Element('div', { role: 'button', 'data-testid': 'create-new-chat-button' }));
  assert.equal(h.messages.length, 3);
});

test('project buttons, unrelated links, disabled controls and message content are untouched', () => {
  const h = contentHarness();
  const messageButton = new Element('button', {}, 'New chat');
  messageButton.inConversation = true;
  for (const control of [
    new Element('button', { 'aria-label': 'New chat in My project' }),
    new Element('button', {}, 'New chat in My project'),
    new Element('a', {}, 'An existing conversation'),
    new Element('button', { 'aria-label': 'Search' }),
    new Element('button', { disabled: '', 'aria-label': 'New chat' }),
    messageButton
  ]) assert.equal(h.fire(control).prevented, false);
  assert.equal(h.messages.length, 0);
});

test('reloading the extension does not swallow clicks from stale content scripts', () => {
  const h = contentHarness();
  delete h.chrome.runtime.id;
  assert.equal(h.fire(new Element('button', {}, 'New chat')).prevented, false);
  assert.equal(h.messages.length, 0);
});

function backgroundHarness(fail = false) {
  const tabs = [];
  let listener;
  vm.runInNewContext(readFileSync(path.join(root, 'background.js'), 'utf8'), {
    URL,
    chrome: {
      runtime: { id: 'test-extension', onMessage: { addListener(fn) { listener = fn; } } },
      tabs: { create(options) { tabs.push(options); return fail ? Promise.reject(new Error('fail')) : Promise.resolve({ id: 7 }); } }
    }
  });
  return { tabs, call: (...args) => listener(...args) };
}
const sender = {
  id: 'test-extension', frameId: 0, url: 'https://chatgpt.com/c/existing',
  tab: { id: 42, windowId: 3, index: 2 }
};

test('worker opens a fixed fresh-chat URL beside the existing tab', async () => {
  const h = backgroundHarness();
  let reply;
  assert.equal(h.call({ type: 'open-new-chat', active: false, url: 'https://evil.example' }, sender, result => { reply = result; }), true);
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(h.tabs.length, 1);
  assert.deepEqual(JSON.parse(JSON.stringify(h.tabs[0])), {
    url: 'https://chatgpt.com/', active: false, windowId: 3, index: 3, openerTabId: 42
  });
  assert.equal(reply.ok, true);
});

test('worker rejects other origins, subframes, missing tabs and other extensions', () => {
  const h = backgroundHarness();
  for (const invalid of [
    { ...sender, url: 'https://evil.example' },
    { ...sender, url: 'https://chatgpt.com.evil.example/' },
    { ...sender, url: 'not a URL' },
    { ...sender, frameId: 1 },
    { ...sender, tab: undefined },
    { ...sender, id: 'another-extension' }
  ]) assert.equal(h.call({ type: 'open-new-chat' }, invalid, () => {}), undefined);
  assert.equal(h.call({ type: 'unknown' }, sender, () => {}), undefined);
  assert.equal(h.tabs.length, 0);
});

test('worker handles tab-creation errors and foreground requests', async () => {
  const h = backgroundHarness(true);
  let reply;
  h.call({ type: 'open-new-chat', active: true }, sender, result => { reply = result; });
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(h.tabs[0].active, true);
  assert.equal(reply.ok, false);
});

test('manifest limits injection to ChatGPT and references existing files', () => {
  const manifest = JSON.parse(readFileSync(path.join(root, 'manifest.json'), 'utf8'));
  assert.equal(manifest.manifest_version, 3);
  assert.deepEqual(manifest.content_scripts[0].matches, ['https://chatgpt.com/*']);
  assert.equal(manifest.content_scripts[0].run_at, 'document_start');
  assert.equal(manifest.permissions, undefined);
  for (const file of [...manifest.content_scripts[0].js, manifest.background.service_worker]) {
    assert.ok(readFileSync(path.join(root, file)).length > 0);
  }
});
