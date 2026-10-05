/** Small browser port for declarative-created nodes, not a substitute for browser layout/input verification. */
export function layoutDocument() {
  const elements = new Map();
  const doc = {
    activeElement: null,
    defaultView: { requestAnimationFrame: (fn) => fn() },
    addEventListener() {},
  };
  const matches = (node, selector) => {
    if (selector.startsWith("."))
      return node.className.split(/\s+/).includes(selector.slice(1));
    if (selector.startsWith("[")) {
      const m = selector.match(/^\[([^=\]]+)(?:="([^"]*)")?\]$/);
      return (
        m &&
        node.hasAttribute(m[1]) &&
        (m[2] === undefined || node.getAttribute(m[1]) === m[2])
      );
    }
    return node.tagName === selector.toUpperCase();
  };
  doc.createElement = (tag) => {
    const attrs = new Map(),
      listeners = new Map(),
      node = {
        tagName: tag.toUpperCase(),
        children: [],
        className: "",
        value: "",
        disabled: false,
        hidden: false,
        style: {
          values: {},
          setProperty(k, v) {
            this.values[k] = v;
          },
        },
        classList: {
          add(k) {
            node.className += " " + k;
          },
          remove() {},
        },
        addEventListener(type, fn) {
          if (!listeners.has(type)) listeners.set(type, []);
          listeners.get(type).push(fn);
        },
        dispatchEvent(event) {
          for (const fn of listeners.get(event.type) || []) fn(event);
        },
        append(...nodes) {
          this.children.push(...nodes);
        },
        replaceChildren(...nodes) {
          this.children = nodes;
        },
        setAttribute(k, v) {
          attrs.set(k, String(v));
        },
        getAttribute: (k) => attrs.get(k) ?? null,
        hasAttribute: (k) => attrs.has(k),
        removeAttribute: (k) => attrs.delete(k),
        focus() {
          doc.activeElement = this;
        },
        setSelectionRange(start, end) {
          this.selectionStart = start;
          this.selectionEnd = end;
        },
        getClientRects: () => [{}],
        querySelectorAll(selector) {
          const selected = [],
            selectors = selector.split(",").map((s) => s.trim());
          const visit = (n) => {
            for (const child of n.children) {
              if (selectors.some((s) => matches(child, s)))
                selected.push(child);
              visit(child);
            }
          };
          visit(this);
          return selected;
        },
        querySelector(selector) {
          return this.querySelectorAll(selector)[0] || null;
        },
        getContext: () => ({ clearRect() {} }),
      };
    return node;
  };
  doc.createTextNode = (text) => ({
    textContent: text,
    children: [],
    tagName: "#TEXT",
    className: "",
    hasAttribute: () => false,
  });
  doc.getElementById = (id) => {
    if (!elements.has(id)) elements.set(id, doc.createElement("div"));
    return elements.get(id);
  };
  doc.querySelector = (selector) =>
    selector === ".screen" ? doc.getElementById("screen") : null;
  doc.querySelectorAll = () => [];
  return doc;
}
