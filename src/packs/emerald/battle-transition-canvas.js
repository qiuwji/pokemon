import { sampleOpeningTransition, OPENING_TRANSITION_PATTERNS } from "./battle-transitions.js";
/** Source-specific drawing adapter; pure samplers never import Canvas or assets. */
const clamp = (n, max = 1) => Math.max(0, Math.min(max, n));
export function emeraldTransitionPatterns(assets) {
  return Object.fromEntries(OPENING_TRANSITION_PATTERNS.map(pattern => ['emerald:' + pattern, (ctx, frame) => {
    if (frame.phase === 'reveal') { ctx.globalAlpha = frame.opacity; ctx.fillRect(0, 0, frame.width, frame.height); return; }
    const visual = sampleOpeningTransition(pattern, frame.opacity);
    ctx.scale(frame.width / 240, frame.height / 160);
    ctx.fillStyle = '#000';
    if (visual.gray !== undefined) {
      ctx.fillStyle = '#5a5a5a'; ctx.globalAlpha = visual.gray; ctx.fillRect(0, 0, 240, 160);
    } else if (visual.team) {
      ctx.globalAlpha = 1 - visual.base;
      ctx.fillRect(0,0,240,160);
      const image = assets[visual.resource];
      if (!image) throw new Error(`Missing team transition resource ${visual.resource}`);
      ctx.globalAlpha = visual.logo;
      // The original 32x32 BG wraps every 256 pixels; never smear a scaled emblem.
      for (let y=0;y<160;y++) {
        const sx = ((visual.offsets[y] % 256) + 256) % 256, width=Math.min(240,256-sx);
        ctx.drawImage(image,sx,y,width,1,0,y,width,1);
        if (width < 240) ctx.drawImage(image,0,y,240-width,1,width,y,240-width,1);
      }
      if (visual.mask) {
        ctx.globalAlpha=1;
        for (let y=0;y<160;y++) {
          ctx.fillRect(0,y,visual.mask.left[y],1);
          ctx.fillRect(visual.mask.right[y],y,240-visual.mask.right[y],1);
        }
      }
    } else if (visual.mask) {
      for (let y = 0; y < 160; y++) {
        ctx.fillRect(0, y, visual.mask.left[y], 1);
        ctx.fillRect(visual.mask.right[y], y, 240 - visual.mask.right[y], 1);
      }
    } else if (visual.slice !== undefined) {
      for (let y = 0; y < 160; y++) ctx.fillRect(y % 2 ? 240 - visual.slice : 0, y, visual.slice, 1);
    } else if (visual.bars) {
      ctx.fillStyle = '#fff';
      visual.bars.forEach((bar, i) => { ctx.globalAlpha = bar.alpha; ctx.fillRect(bar.x, i * 20, 240 - bar.x, 20); });
      ctx.globalAlpha = visual.black; ctx.fillStyle = '#000'; ctx.fillRect(0, 0, 240, 160);
    } else for (const ball of visual.balls) {
      const edge = Math.floor(ball.x / 8) * 8;
      ctx.fillRect(ball.rightward ? 0 : clamp(edge, 240), ball.y - 16, ball.rightward ? clamp(edge, 240) : 240 - clamp(edge, 240), 32);
      const image = assets['battle-transition-pokeball'];
      if (image) ctx.drawImage(image, ball.x - 16, ball.y - 16, 32, 32);
    }
  }]));
}
