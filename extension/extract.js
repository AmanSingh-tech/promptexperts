// Injected into the active tab. The value of the last expression goes back to the popup.
(() => {
  const SITES = {
    'chatgpt.com': { tool: 'ChatGPT', roleOf: (el) => el.dataset.messageAuthorRole, selector: '[data-message-author-role]' },
    'claude.ai': {
      tool: 'Claude',
      roleOf: (el) => (el.matches('[data-testid="user-message"]') ? 'user' : 'assistant'),
      selector: '[data-testid="user-message"], .font-claude-response, .font-claude-message'
    },
    'gemini.google.com': {
      tool: 'Gemini',
      roleOf: (el) => (el.matches('user-query') ? 'user' : 'assistant'),
      selector: 'user-query, model-response'
    }
  };

  // innerText needs a rendered node, so the cleaned copy is measured off screen.
  function textOf(el) {
    const copy = el.cloneNode(true);
    copy.querySelectorAll('button, [role="button"], svg, .cdk-visually-hidden, .sr-only').forEach((n) => n.remove());
    copy.style.cssText = 'position:fixed;left:-99999px;top:0;width:800px';
    document.body.append(copy);
    const text = copy.innerText.trim();
    copy.remove();
    return text;
  }

  const site = SITES[location.hostname];
  if (!site) return { error: 'Open a conversation in ChatGPT, Claude or Gemini first.' };

  const nodes = [...document.querySelectorAll(site.selector)].filter((el, _, all) => !all.some((o) => o !== el && o.contains(el)));
  const messages = nodes
    .map((el) => ({ role: site.roleOf(el), content: textOf(el) }))
    .filter((m) => (m.role === 'user' || m.role === 'assistant') && m.content);
  return { tool: site.tool, key: location.pathname, messages };
})();
