/** Region cursor locations from data/region_map/region_map_sections.json (x+1,y+2 map border). */
const points = { LittlerootTown: [4, 11], OldaleTown: [4, 9] };
export function flightMap(destinations, esc) {
  return `<div class="flight-native"><div class="flight-heading">飞往哪里？</div>${destinations
    .filter((d) => points[d.id])
    .map((d) => {
      const [x, y] = points[d.id];
      return `<button class="flight-marker" style="left:${(((x + 1) * 8) / 240) * 100}%;top:${(((y + 2) * 8) / 160) * 100}%" data-party-flight="${esc(d.id)}" ${d.ok ? "" : "disabled"} aria-label="${esc(d.name)}">＋</button>`;
    })
    .join(
      "",
    )}<div class="native-window flight-list">${destinations.map((d) => `<button data-party-flight="${esc(d.id)}" ${d.ok ? "" : "disabled"}>${esc(d.name)}</button>`).join("")}</div></div>`;
}
