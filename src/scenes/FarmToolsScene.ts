import { Container, Graphics, Sprite, Text, Texture } from 'pixi.js';
import type { Game } from '../Game';
import type { TextureProvider } from '../render/TextureProvider';
import type { Toast } from '../ui/Toast';
import type { ViewportInfo } from '../layout/LayoutManager';
import type { ShopEntry } from '../core/types';
import { computeRegions } from '../layout/LayoutManager';
import { SHOP_ENTRIES } from '../data/shop';
import { seedById } from '../data/seeds';
import { potById } from '../data/pots';
import { upgradeById } from '../data/upgrades';
import { greenhouseById } from '../data/greenhouses';
import { STRINGS } from '../data/strings';
import { LAYOUT } from '../data/layout';
import { THEME } from '../data/theme';
import { ScrollList } from '../ui/ScrollList';
import { SegmentedTabs } from '../ui/SegmentedTabs';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';

type ShopCategory = 'seed' | 'pot' | 'greenhouse' | 'upgrade';

export class FarmToolsScene {
  readonly view = new Container();
  private background: Sprite;
  private shade = new Graphics();
  private title = new Text({ text: STRINGS.shopTitle, style: { fontFamily: THEME.font.family, fontSize: THEME.font.heading, fontWeight: '700', fill: THEME.colors.textOnDark } });
  private category: ShopCategory = 'seed';
  private tabs: SegmentedTabs<ShopCategory>;
  private list = new ScrollList(LAYOUT.designWidth - LAYOUT.sidePadding * 2, LAYOUT.minHeight);

  constructor(private game: Game, private textures: TextureProvider, private toast: Toast) {
    this.background = new Sprite(textures.getBackground('farm_tools_shop'));
    this.tabs = new SegmentedTabs([
      { id: 'seed', label: STRINGS.shopCategories.seeds }, { id: 'pot', label: STRINGS.shopCategories.pots },
      { id: 'greenhouse', label: STRINGS.shopCategories.greenhouses }, { id: 'upgrade', label: STRINGS.shopCategories.upgrades },
    ], this.category, (category) => { this.category = category; this.refresh(); }, LAYOUT.designWidth - LAYOUT.sidePadding * 2, LAYOUT.shop.tabsHeight);
    this.view.addChild(this.background, this.shade, this.title, this.tabs, this.list); this.refresh();
  }

  layout(vp: ViewportInfo): void {
    const content = computeRegions(vp).content;
    this.background.width = vp.width; this.background.height = vp.height;
    this.shade.clear().rect(0, 0, vp.width, vp.height).fill({ color: THEME.colors.shadow, alpha: LAYOUT.scene.backgroundShadeAlpha });
    this.title.position.set(LAYOUT.sidePadding, content.y + THEME.spacing.sm);
    this.tabs.position.set(LAYOUT.sidePadding, this.title.y + LAYOUT.scene.titleHeight);
    this.list.position.set(LAYOUT.sidePadding, this.tabs.y + LAYOUT.shop.tabsHeight + THEME.spacing.sm);
    this.list.resize(content.width - LAYOUT.sidePadding * 2, content.y + content.height - THEME.spacing.sm - this.list.y);
  }

  update(): void {}
  destroy(): void { this.view.destroy({ children: true }); }

  private refresh(): void {
    const width = LAYOUT.designWidth - LAYOUT.sidePadding * 2;
    const entries = [...SHOP_ENTRIES].filter((entry) => entry.type === this.category).sort((a, b) => a.order - b.order);
    this.list.setItems(entries.map((entry) => this.itemCard(entry, width)), LAYOUT.scene.listGap); this.list.scrollToTop();
  }

  private itemCard(entry: ShopEntry, width: number): Container {
    let name = ''; let effect = ''; let cost: number | null = null; let texture: Texture;
    if (entry.type === 'seed') { const def = seedById(entry.targetId); name = def.name; cost = def.price; texture = this.textures.getItemTexture(def.id); effect = `${def.starLevel}★`; }
    else if (entry.type === 'pot') { const def = potById(entry.targetId); name = def.name; cost = def.price; texture = this.textures.getPotTexture(def.id); effect = def.rarity; }
    else if (entry.type === 'upgrade') { const def = upgradeById(entry.targetId); const level = this.game.upgrades.level(def.id); name = def.name; cost = def.levels[level]?.cost ?? null; texture = this.textures.getItemTexture(def.id); effect = `${STRINGS.rank} ${level}/${def.maxLevel}`; }
    else { const def = greenhouseById(entry.targetId); name = def.name; cost = def.buildCost; texture = this.textures.getItemTexture(def.id); effect = `${def.slotsGrid.w * def.slotsGrid.h} ${STRINGS.inventoryCategories.pots}`; }
    const card = new Card(width, LAYOUT.shop.cardHeight);
    const icon = new Sprite(texture); icon.position.set(THEME.spacing.md, THEME.spacing.md); icon.width = icon.height = LAYOUT.shop.iconSize;
    const title = new Text({ text: name, style: { fontFamily: THEME.font.family, fontSize: THEME.font.body, fontWeight: '700', fill: THEME.colors.text } }); title.position.set(THEME.spacing.xxl + LAYOUT.shop.iconSize, THEME.spacing.md);
    const info = new Text({ text: `${effect}\n${STRINGS.price}: ${cost ?? '—'} ${STRINGS.coins}`, style: { fontFamily: THEME.font.family, fontSize: THEME.font.caption, fill: cost !== null && cost > this.game.wallet.balance('coin') ? THEME.colors.danger : THEME.colors.muted, lineHeight: THEME.font.body } }); info.position.set(title.x, THEME.spacing.xl + THEME.spacing.sm);
    const owned = entry.type === 'upgrade' && this.game.upgrades.level(entry.targetId) >= upgradeById(entry.targetId).maxLevel;
    const button = new Button(owned ? STRINGS.owned : STRINGS.buy, LAYOUT.shop.actionWidth, () => this.buy(entry), THEME.tap.min, THEME.font.caption); button.position.set(width - LAYOUT.shop.actionWidth - THEME.spacing.md, LAYOUT.shop.cardHeight - THEME.tap.min - THEME.spacing.md); button.setEnabled(!owned && cost !== null && cost <= this.game.wallet.balance('coin'));
    card.addChild(icon, title, info, button); return card;
  }

  private buy(entry: ShopEntry): void {
    const result = this.game.shop.buy(entry);
    if (result === 'ok') this.toast.show(entry.type === 'seed' ? STRINGS.seedBought : entry.type === 'pot' ? STRINGS.potBought : entry.type === 'upgrade' ? STRINGS.upgradeBought : STRINGS.greenhouseBuilt);
    else this.toast.show(result === 'funds' ? STRINGS.notEnoughCoins : result === 'full' ? STRINGS.fullGreenhouse : result === 'owned' ? STRINGS.owned : STRINGS.noRoom);
    this.refresh();
  }
}
