/** Adapter-owned handles. Plugins receive only IDs/labels, never elements or callbacks. */
export function nativeUIControls(buttons, identity) {
  return new Map([...buttons].map(button => [identity(button), {
    label: button.textContent,
    get disabled() { return !!button.disabled; },
    activate() {
      if (!button.disabled) return button.onclick?.call(button);
    },
  }]));
}
