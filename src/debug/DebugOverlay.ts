import { Container, Graphics } from 'pixi.js';
import type { ViewportInfo } from '../layout/LayoutManager';
import { computeRegions } from '../layout/LayoutManager';
import { LAYOUT } from '../data/layout';
import { THEME } from '../data/theme';

export class DebugOverlay extends Container {
  private graphics = new Graphics();
  private enabled = false;
  private viewport?: ViewportInfo;

  constructor(private root: Container) { super(); this.eventMode = 'none'; this.addChild(this.graphics); }

  toggle(): boolean { this.enabled = !this.enabled; this.visible = this.enabled; if (this.enabled && this.viewport) this.layout(this.viewport); return this.enabled; }

  layout(vp: ViewportInfo): void {
    this.viewport = vp; if (!this.enabled) { this.visible = false; return; } this.visible = true;
    const regions = computeRegions(vp); const graphics = this.graphics.clear();
    graphics.rect(regions.frame.x, regions.frame.y, regions.frame.width, regions.frame.height).stroke({ color: THEME.colors.accent, width: THEME.stroke.strong });
    graphics.rect(regions.hud.x, regions.hud.y, regions.hud.width, regions.hud.height).stroke({ color: THEME.colors.success, width: THEME.stroke.normal });
    graphics.rect(regions.content.x, regions.content.y, regions.content.width, regions.content.height).stroke({ color: THEME.colors.outline, width: THEME.stroke.normal });
    graphics.rect(regions.tabs.x, regions.tabs.y, regions.tabs.width, regions.tabs.height).stroke({ color: THEME.colors.danger, width: THEME.stroke.normal });
    const safeY = (vp.height - LAYOUT.safeFrameHeight) / 2 + vp.safe.top;
    graphics.rect(vp.safe.left, safeY, vp.width - vp.safe.left - vp.safe.right, LAYOUT.safeFrameHeight - vp.safe.top - vp.safe.bottom).stroke({ color: THEME.colors.accent, width: THEME.stroke.thin, alpha: THEME.opacity.safeGuide });
    this.drawTargets(this.root, vp.scale);
  }

  private drawTargets(container: Container, scale: number): void {
    for (const child of container.children) {
      if (child === this || !child.visible) continue;
      if (child.eventMode === 'static' && child.hitArea) {
        const bounds = child.getBounds();
        this.graphics.rect(bounds.x / scale, bounds.y / scale, bounds.width / scale, bounds.height / scale).stroke({ color: THEME.colors.danger, width: THEME.stroke.thin, alpha: THEME.opacity.targetGuide });
      }
      if (child instanceof Container && child.children.length) this.drawTargets(child, scale);
    }
  }
}
