/** Map metadata decides visibility; every entry cancels the previous popup lifetime. */
export class MapNameDOM {
    constructor({ element, schedule = setTimeout, cancel = clearTimeout }) {
        Object.assign(this, { element, schedule, cancel });
        this.timer = null;
    }
    hide() {
        if (this.timer !== null)
            this.cancel(this.timer);
        this.timer = null;
        this.element.classList.remove("show");
    }
    show(title, map) {
        this.hide();
        if (!map || map.indoor || map.showMapName === false)
            return;
        this.element.textContent = title;
        this.element.classList.add("show");
        this.timer = this.schedule(() => this.hide(), 2200);
    }
}
