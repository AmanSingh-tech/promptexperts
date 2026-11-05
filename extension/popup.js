const DEFAULT_APP = 'http://localhost:3000';
const $ = (id) => document.getElementById(id);

let app = DEFAULT_APP;
let chat = null;

function status(text, isError = false) {
  $('status').textContent = text;
  $('status').className = isError ? 'error' : '';
}

async function api(path, options = {}) {
  const res = await fetch(app + path, {
    ...options,
    credentials: 'include',
    headers: { 'content-type': 'application/json', 'X-Requested-With': 'ailogracer' }
  });
  const body = await res.json().catch(() => null);
  if (!res.ok) throw Object.assign(new Error(body?.error ?? `Request failed (${res.status})`), { status: res.status });
  return body;
}

async function readTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const [frame] = await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ['extract.js'] });
  return frame.result;
}

// Remembers how much of each conversation an attempt already holds, so a second send adds only new messages.
const sentKey = (sessionId) => `sent:${sessionId}:${chat.tool}:${chat.key}`;

async function send() {
  const sessionId = $('attempt').value;
  const key = sentKey(sessionId);
  const sent = (await chrome.storage.local.get(key))[key] ?? 0;
  const fresh = chat.messages.slice(sent);
  if (!fresh.length) return status('Nothing new to send.');
  $('send').disabled = true;
  try {
    const { imported } = await api(`/api/sessions/${sessionId}/import`, {
      method: 'POST',
      body: JSON.stringify({ tool: chat.tool, transcript: JSON.stringify(fresh) })
    });
    await chrome.storage.local.set({ [key]: chat.messages.length });
    status(`Sent ${imported} ${imported === 1 ? 'message' : 'messages'} to your attempt.`);
  } catch (err) {
    status(err.message, true);
  } finally {
    $('send').disabled = false;
  }
}

async function load() {
  try {
    chat = await readTab();
  } catch {
    return status('Open a conversation in ChatGPT, Claude or Gemini first.', true);
  }
  if (chat.error) return status(chat.error, true);
  if (!chat.messages.length) return status(`No messages found on this ${chat.tool} page.`, true);

  let sessions;
  try {
    ({ sessions } = await api('/api/sessions/active'));
  } catch (err) {
    return status(err.status === 401 ? `Log in at ${app} first, then reopen this popup.` : `Can't reach ${app}. Check the site address below.`, true);
  }
  if (!sessions.length) return status('Open a challenge to start an attempt, then reopen this popup.', true);

  $('attempt').replaceChildren(...sessions.map((s) => new Option(s.problem.title, s.id)));
  $('attemptField').hidden = false;
  $('send').hidden = false;
  $('send').disabled = false;
  status(`${chat.messages.length} messages found in ${chat.tool}.`);
}

$('send').addEventListener('click', send);
$('save').addEventListener('click', async () => {
  const value = $('app').value.trim().replace(/\/+$/, '');
  let origin;
  try {
    origin = new URL(value).origin;
  } catch {
    return status('Enter a full address, such as https://example.com.', true);
  }
  if (origin !== DEFAULT_APP && !(await chrome.permissions.request({ origins: [`${origin}/*`] }))) {
    return status('Permission is needed to reach that address.', true);
  }
  await chrome.storage.local.set({ app: origin });
  location.reload();
});

chrome.storage.local.get('app').then((stored) => {
  app = stored.app ?? DEFAULT_APP;
  $('app').value = app;
  load();
});
