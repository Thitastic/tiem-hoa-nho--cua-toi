import { Container, Sprite, Text } from 'pixi.js';
import type { Game } from '../Game';
import type { TextureProvider } from '../render/TextureProvider';
import type { BottomSheet } from './BottomSheet';
import type { Modal } from './Modal';
import { seedById } from '../data/seeds';
import { variantById } from '../data/catalogRegistry';
import { bouquetById } from '../data/bouquets';
import { potById } from '../data/pots';
import { STRINGS } from '../data/strings';
import { LAYOUT } from '../data/layout';
import { THEME } from '../data/theme';
import { SegmentedTabs } from './SegmentedTabs';
import { ScrollList } from './ScrollList';
import { Card } from './Card';
import { PointerGesture } from '../layout/PointerGesture';
import { fitSprite } from '../render/fitSprite';

type Category = 'seeds' | 'flowers' | 'bouquets' | 'pots';

export class InventorySheet {
  private category: Category = 'seeds';
  private root?: Container;
  private tabs?: SegmentedTabs<Category>;
  private list?: ScrollList;

  constructor(private game: Game, private textures: TextureProvider, private sheet: BottomSheet, private modal: Modal) {}

  open(): void {
    const root = new Container();
    const tabs = new SegmentedTabs<Category>([
      { id: 'seeds', label: STRINGS.inventoryCategories.seeds }, { id: 'flowers', label: STRINGS.inventoryCategories.flowers },
      { id: 'bouquets', label: STRINGS.inventoryCategories.bouquets }, { id: 'pots', label: STRINGS.inventoryCategories.pots },
    ], this.category, (category) => { this.category = category; this.refresh(); }, LAYOUT.designWidth - LAYOUT.sheet.sidePadding * 2, LAYOUT.inventory.tabsHeight);
    const list = new ScrollList(LAYOUT.designWidth - LAYOUT.sheet.sidePadding * 2, LAYOUT.sheet.maxHeight);
    list.position.y = LAYOUT.inventory.tabsHeight + THEME.spacing.sm;
    root.addChild(tabs, list); this.root = root; this.tabs = tabs; this.list = list;
    this.refresh();
    this.sheet.show(STRINGS.inventory, root, LAYOUT.sheet.maxHeight, (width, height) => {
      tabs.position.set(0, 0); list.position.set(0, LAYOUT.inventory.tabsHeight + THEME.spacing.sm);
      list.resize(width, Math.max(0, height - list.y));
    });
  }

  private refresh(): void {
    if (!this.list) return;
    const entries = this.game.inventory.entries(this.category);
    const width = LAYOUT.designWidth - LAYOUT.sheet.sidePadding * 2;
    if (!entries.length) {
      const empty = new Card(width, LAYOUT.inventory.slotHeight);
      const label = new Text({ text: STRINGS.emptyInventory, style: { fontFamily: THEME.font.family, fontSize: THEME.font.body, fill: THEME.colors.muted } }); label.anchor.set(.5); label.position.set(width / 2, LAYOUT.inventory.slotHeight / 2); empty.addChild(label); this.list.setItems([empty]); return;
    }
    const gap = LAYOUT.inventory.slotGap; const slotWidth = (width - gap * (LAYOUT.inventory.columns - 1)) / LAYOUT.inventory.columns;
    const rows: Container[] = [];
    for (let start = 0; start < entries.length; start += LAYOUT.inventory.columns) {
      const row = new Container();
      entries.slice(start, start + LAYOUT.inventory.columns).forEach(([id, count], index) => {
        const card = this.slot(id, count, slotWidth); card.x = index * (slotWidth + gap); row.addChild(card);
      });
      rows.push(row);
    }
    this.list.setItems(rows, gap);
  }

  private slot(id: string, count: number, width: number): Container {
    const name = this.nameFor(id); const card = new Card(width, LAYOUT.inventory.slotHeight); card.eventMode = 'static'; card.cursor = 'pointer';
    const texture = this.category === 'pots' ? this.textures.getPotTexture(id) : this.textures.getItemTexture(id);
    const icon = new Sprite(texture); icon.anchor.set(.5); icon.position.set(width / 2, THEME.spacing.xl); fitSprite(icon,THEME.spacing.xxl,THEME.spacing.xxl);
    const label = new Text({ text: `${name}\n×${count}`, style: { fontFamily: THEME.font.family, fontSize: THEME.font.caption, fill: THEME.colors.text, align: 'center', wordWrap: true, wordWrapWidth: width - THEME.spacing.sm } }); label.anchor.set(.5, 0); label.position.set(width / 2, THEME.spacing.xxl + THEME.spacing.md);
    card.addChild(icon, label); card.hitArea = { contains: (x: number, y: number) => x >= 0 && x <= width && y >= 0 && y <= LAYOUT.inventory.slotHeight };
    const gesture=new PointerGesture(THEME.tap.dragCancelCss);card.on('pointerdown',(event)=>gesture.begin(event.pointerId,event.client.x,event.client.y));card.on('globalpointermove',(event)=>gesture.move(event.pointerId,event.client.x,event.client.y));card.on('pointerup',(event)=>{if(gesture.end(event.pointerId))this.modal.menu(STRINGS.inventoryDetails,`${name}\n${STRINGS.quantity}: ${count}`,[]);});card.on('pointerupoutside',(event)=>gesture.cancel(event.pointerId));card.on('pointercancel',(event)=>gesture.cancel(event.pointerId));return card;
  }

  private nameFor(id: string): string {
    if (this.category === 'seeds') return seedById(id).name;
    if (this.category === 'flowers') return variantById(id).name;
    if (this.category === 'bouquets') return bouquetById(id).name;
    return potById(id).name;
  }
}
