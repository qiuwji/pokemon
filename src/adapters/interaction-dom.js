const finite = (value) => typeof value === "number" && Number.isFinite(value);
const color = (value, fallback) =>
  typeof value === "string" && /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/.test(value)
    ? value
    : fallback;

/** Draws host-validated FrameData; plugins never receive the canvas context. */
export class InteractionDOM {
  constructor({ canvas, assets = {}, onError = () => {} }) {
    this.canvas = canvas;
    this.assets = assets;
    this.ctx = canvas.getContext("2d");
    this.onError = onError;
  }
  clear() {
    if (this.canvas.hidden) return;
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.canvas.hidden = true;
  }
  render(frame) {
    if (!frame || !Array.isArray(frame.data?.nodes)) {
      this.clear();
      return;
    }
    try {
      this.canvas.hidden = false;
      const ctx = this.ctx;
      ctx.save();
      ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      ctx.imageSmoothingEnabled = false;
      for (const node of frame.data.nodes) this.#node(ctx, node);
      if (typeof frame.data.statusText === "string") {
        ctx.fillStyle = "#ffffff";
        ctx.font = "8px monospace";
        ctx.textAlign = "left";
        ctx.fillText(frame.data.statusText, 4, this.canvas.height - 6);
      }
      ctx.restore();
    } catch (error) {
      this.clear();
      this.onError(error);
    }
  }
  #fillOrStroke(ctx, colorValue, fill, width) {
    if (fill === false) {
      ctx.lineWidth = Number.isFinite(width) && width > 0 ? width : 1;
      ctx.strokeStyle = colorValue;
      ctx.stroke();
    } else {
      ctx.fillStyle = colorValue;
      ctx.fill();
    }
  }
  #node(ctx, node) {
    if (!node || typeof node.kind !== "string") return;
    switch (node.kind) {
      case "rect":
        if (![node.x, node.y, node.width, node.height].every(finite)) return;
        ctx.fillStyle = color(node.color, "#222222");
        ctx.fillRect(node.x, node.y, node.width, node.height);
        return;
      case "panel":
        if (![node.x, node.y, node.width, node.height].every(finite)) return;
        ctx.fillStyle = color(node.background, "#101820");
        ctx.fillRect(node.x, node.y, node.width, node.height);
        if (color(node.border, null)) {
          ctx.lineWidth = finite(node.borderWidth) && node.borderWidth > 0 ? node.borderWidth : 1;
          ctx.strokeStyle = node.border;
          ctx.strokeRect(node.x, node.y, node.width, node.height);
        }
        return;
      case "line":
        if (![node.x1, node.y1, node.x2, node.y2, node.width].every(finite)) return;
        ctx.strokeStyle = color(node.color, "#ffffff");
        ctx.lineWidth = node.width;
        ctx.beginPath();
        ctx.moveTo(node.x1, node.y1);
        ctx.lineTo(node.x2, node.y2);
        ctx.stroke();
        return;
      case "circle":
        if (![node.x, node.y, node.radius].every(finite)) return;
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
        this.#fillOrStroke(ctx, color(node.color, "#ffffff"), node.fill, 1);
        return;
      case "ellipse":
        if (![node.x, node.y, node.radiusX, node.radiusY].every(finite)) return;
        ctx.beginPath();
        ctx.ellipse(node.x, node.y, node.radiusX, node.radiusY, 0, 0, Math.PI * 2);
        this.#fillOrStroke(ctx, color(node.color, "#ffffff"), node.fill, 1);
        return;
      case "arc":
        if (![node.x, node.y, node.radius, node.startAngle, node.endAngle].every(finite)) return;
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.radius, node.startAngle, node.endAngle);
        ctx.lineWidth = finite(node.width) && node.width > 0 ? node.width : 1;
        ctx.strokeStyle = color(node.color, "#ffffff");
        ctx.stroke();
        return;
      case "polygon": {
        if (!Array.isArray(node.points) || !node.points.length) return;
        ctx.beginPath();
        node.points.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
        ctx.closePath();
        this.#fillOrStroke(ctx, color(node.color, "#ffffff"), node.fill, node.width);
        return;
      }
      case "text":
        if (![node.x, node.y].every(finite) || typeof node.text !== "string") return;
        ctx.fillStyle = color(node.color, "#ffffff");
        ctx.font = `${finite(node.size) && node.size > 0 ? node.size : 8}px monospace`;
        ctx.textAlign = node.align || "left";
        ctx.fillText(node.text.slice(0, 240), node.x, node.y);
        return;
      case "meter": {
        if (![node.x, node.y, node.width, node.height, node.value].every(finite)) return;
        const ratio = Math.max(0, Math.min(1, node.value));
        ctx.fillStyle = color(node.background, "#333333");
        ctx.fillRect(node.x, node.y, node.width, node.height);
        ctx.fillStyle = color(node.color, "#f2d94e");
        ctx.fillRect(node.x, node.y, node.width * ratio, node.height);
        return;
      }
      case "sprite": {
        const image = this.assets?.[node.resource];
        if (!image || !image.width || !image.height) return;
        const width = finite(node.width) && node.width > 0 ? node.width : image.width;
        const height = finite(node.height) && node.height > 0 ? node.height : image.height;
        if (Number.isSafeInteger(node.frame) && node.frame > 0)
          ctx.drawImage(
            image,
            node.frame * width,
            0,
            width,
            height,
            node.x,
            node.y,
            width,
            height,
          );
        else ctx.drawImage(image, node.x, node.y, width, height);
        return;
      }
      default:
        return;
    }
  }
}
