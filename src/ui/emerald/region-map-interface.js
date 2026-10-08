import { RegionMapCursor } from "../../engine/extensions/region-map.js";
import { EMERALD_REGION_GRID, emeraldRegionLocation, emeraldRegionName } from "../../packs/emerald/region-map.js";
/** One view for browsing and selecting destinations; selection consequences remain with the caller. */
export function createRegionMapInterface(game, { modal, closeModal, root, escapeHTML }) {
  function showRegionMap({ title = "丰缘地图", back = closeModal, destinations = [], markers = [], onSelect = null } = {}) {
    const player = emeraldRegionLocation(game.state.position, game.db.maps);
    const cursor = new RegionMapCursor({ width: EMERALD_REGION_GRID.width, height: EMERALD_REGION_GRID.height, cells: EMERALD_REGION_GRID.cells }, player || undefined);
    const points = destinations.flatMap(destination => {
      const position = destination.position || { map: destination.id, x: 0, y: 0 };
      const point = emeraldRegionLocation(position, game.db.maps);
      return point ? [{ ...point, ...destination }] : [];
    });
    const art = name => `generated/assets/ui/region-${name}.png`;
    const pixel = point => `left:${(point.x * 8 + 12) / 240 * 100}%;top:${(point.y * 8 + 20) / 160 * 100}%`;
    const markerHTML = markers.map(marker => `<span class="region-marker" style="${pixel(marker)}" title="${escapeHTML(marker.label || "")}">●</span>`).join("");
    const cells = EMERALD_REGION_GRID.cells.map((section, index) => {
      if (!section) return "";
      const x = index % EMERALD_REGION_GRID.width, y = Math.floor(index / EMERALD_REGION_GRID.width);
      return `<button class="region-cell" tabindex="-1" data-region-x="${x}" data-region-y="${y}" style="left:${(x * 8 + 8) / 240 * 100}%;top:${(y * 8 + 16) / 160 * 100}%" aria-label="${escapeHTML(emeraldRegionName(section))}"></button>`;
    }).join("");
    modal(title, `<div class="region-native"><div class="region-heading">${escapeHTML(title)}</div>${cells}${markerHTML}
      ${player ? `<img class="region-player" src="${art(game.state.playerGender === "female" ? "player-female" : "player-male")}" style="${pixel(player)}" alt="当前位置">` : ""}
      <span class="region-cursor" data-region-cursor aria-label="游标"></span>
      <div class="region-name" data-region-name aria-live="polite"></div>
      <button class="region-confirm" data-region-confirm>查看</button><button class="region-close" data-region-close>返回</button></div>`, {
      type: "region-map", close: false, back,
      navigate(direction) { cursor.move(direction); update(); return true; },
    });
    function selection() {
      const current = cursor.view();
      return points.find(point => point.section === current.section && point.ok);
    }
    function update() {
      const current = cursor.view(), destination = selection();
      const image = root.querySelector("[data-region-cursor]");
      image.setAttribute("style", pixel(current));
      root.querySelector("[data-region-name]").textContent = emeraldRegionName(current.section);
      const button = root.querySelector("[data-region-confirm]");
      button.textContent = onSelect ? destination ? `飞往${destination.name}` : "不能飞往这里" : "查看地图";
      button.setAttribute("aria-disabled", String(!!onSelect && !destination));
    }
    function confirm() {
      const destination = selection();
      if (onSelect && destination) return onSelect(destination.id);
    }
    root.querySelectorAll("[data-region-x]").forEach(button => {
      button.onclick = () => {
        cursor.select(Number(button.dataset.regionX), Number(button.dataset.regionY)); update();
        root.querySelector("[data-region-confirm]").focus();
      };
      button.onfocus = () => { cursor.select(Number(button.dataset.regionX), Number(button.dataset.regionY)); update(); };
    });
    root.querySelector("[data-region-close]").onclick = back;
    root.querySelector("[data-region-confirm]").onclick = confirm;
    update();
    root.querySelector("[data-region-confirm]").focus();
    return { cursor, confirm };
  }
  return { showRegionMap };
}
