/** An HTML button/attribute port for page command tests; it does not emulate browser layout. */
export function buttonPage() {
  let html = '', options, nodes = [];
  const document = { activeElement: null };
  const root = {
    querySelectorAll(selector) {
      const m = selector.match(/\[data-([\w-]+)(?:="([^"]*)")?\]/);
      if (m) {
        const key = m[1].replace(/-([a-z])/g, (_, c) => c.toUpperCase());
        return nodes.filter(n => Object.hasOwn(n.dataset, key) && (m[2] === undefined || n.dataset[key] === m[2]));
      }
      return nodes.filter(n => n.tagName === 'BUTTON' && (!selector.includes(':disabled') || !n.disabled));
    },
    querySelector(selector) { return this.querySelectorAll(selector)[0] || null; },
  };
  function modal(_title, body, settings) {
    html = body; options = settings;
    nodes = [...body.matchAll(/<(button|div|img)[^>]*>/g)].filter(m => m[0].includes('data-')).map(m => {
      const dataset = Object.fromEntries([...m[0].matchAll(/data-([\w-]+)(?:="([^"]*)")?/g)]
        .map(a => [a[1].replace(/-([a-z])/g, (_, c) => c.toUpperCase()), a[2] || '']));
      const node = { dataset, tagName: m[1].toUpperCase(), disabled: /\sdisabled(?:\s|>)/.test(m[0]),
        querySelector() { return null; },
        focus() { document.activeElement = node; }, scrollIntoView() {} };
      return node;
    });
  }
  const deps = { root, document, modal, closeModal() {}, showMenu() {}, hpTrack: () => '', toast() {}, updateSide() {}, escapeHTML: String };
  const selectItem = item => {
    for (let i = 0; i < 32; i++) {
      const button = root.querySelectorAll('[data-item]').find(b => b.dataset.item === item);
      if (button) { button.onclick(); return; }
      root.querySelector('[data-pocket="1"]').onclick();
    }
    throw new Error('Item not rendered: ' + item);
  };
  return { ...deps, deps, selectItem, body: () => html, options: () => options };
}
