import { layoutDocument } from "./layout-document.js";
import { ExtensionDOM } from "../../dist/adapters/extension-dom.js";

/** External DOM ports only; registration, layout resolution, rendering and commands are production code. */
export function canvasAdapter(session) {
  const doc = layoutDocument(),
    make = doc.createElement,
    lookup = doc.getElementById;
  const errors = [],
    paints = [];
  const listeners = new Map();
  doc.addEventListener = (type, fn) => {
    if (!listeners.has(type)) listeners.set(type, new Set());
    listeners.get(type).add(fn);
  };
  doc.removeEventListener = (type, fn) => listeners.get(type)?.delete(fn);
  doc.createElement = (tag) => {
    const node = make(tag),
      append = node.append,
      replace = node.replaceChildren;
    node.parentNode = null;
    Object.defineProperty(node, "isConnected", {
      get: () => !!node._root || !!node.parentNode?.isConnected,
    });
    node.append = (...children) => {
      for (const child of children) child.parentNode = node;
      append.call(node, ...children);
    };
    node.replaceChildren = (...children) => {
      for (const child of node.children) child.parentNode = null;
      replace.call(node);
      node.append(...children);
    };
    node.getClientRects = () => {
      for (let n = node; n; n = n.parentNode) if (n.hidden) return [];
      return node.isConnected ? [{}] : [];
    };
    node.getBoundingClientRect = () => ({
      left: 10,
      top: 20,
      width: node.width * 2,
      height: node.height * 2,
    });
    if (tag === "canvas") {
      const ctx = {
        canvas: node,
        clearRect() {},
        save() {},
        restore() {},
        fillRect: (...rect) => paints.push({ canvas: node, rect }),
        drawImage() {},
      };
      node.getContext = () => ctx;
    }
    return node;
  };
  doc.getElementById = (id) => {
    const node = lookup(id);
    node._root = true;
    return node;
  };
  const root = doc.getElementById("modal-root");
  let now = 0,
    reduced = false,
    ext;
  const shell = {
    root,
    modalType: "menu",
    reducedMotion: () => reduced,
    toast() {},
    closeModal() {
      ext.unmountRegions();
      root.replaceChildren();
      this.modalType = null;
    },
    modal(_title, _body, options) {
      ext.unmountRegions();
      root.replaceChildren();
      this.modalType = options.type;
      this.back = options.back;
      const page = doc.createElement("div");
      page.className = "extension-page";
      root.append(page);
    },
  };
  ext = new ExtensionDOM({
    host: session.host,
    shell,
    document: doc,
    resources: session.db.resources,
    assets: {},
    now: () => now,
    onError: (error) => errors.push(error),
  });
  return {
    ext,
    shell,
    doc,
    root,
    errors,
    paints,
    frame(value) {
      now = value;
      ext.render(now);
    },
    motion(value) {
      reduced = value;
    },
    visibility(hidden) {
      doc.hidden = hidden;
      doc.visibilityState = hidden ? "hidden" : "visible";
      for (const fn of listeners.get("visibilitychange") || []) fn();
    },
    listeners,
  };
}
