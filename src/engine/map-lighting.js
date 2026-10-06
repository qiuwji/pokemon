/** Content validation only. Visibility rendering and field-effect rules are separate consumers. */
export function validDarkness(d) {
  return (
    !!d &&
    typeof d === "object" &&
    !Array.isArray(d) &&
    Object.keys(d).every((k) =>
      ["radius", "illuminatedRadius", "opacity"].includes(k),
    ) &&
    [d.radius, d.illuminatedRadius].every(
      (n) => Number.isInteger(n) && n >= 0 && n <= 512,
    ) &&
    d.illuminatedRadius >= d.radius &&
    (d.opacity === undefined ||
      (Number.isFinite(d.opacity) && d.opacity >= 0 && d.opacity <= 1))
  );
}
