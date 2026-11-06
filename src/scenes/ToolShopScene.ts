import { Container, Graphics, Rectangle, Text, TextStyle } from 'pixi.js';
import { BaseScene } from './BaseScene';
import { ShopItemCard } from '../components/ShopItemCard';
import { GameTabBar } from '../components/GameTabBar';
import { PurchaseConfirmDialog } from '../components/PurchaseConfirmDialog';
import { SHOP_ITEMS } from '../data/shopItems';
import { gameStore } from '../services/GameSession';
import type { ShopItemType } from '../models/ShopItem';

type ShopTab = Extract<ShopItemType, 'pot' | 'seed' | 'tool'>;
const SHOP_TABS: { id: ShopTab; label: string }[] = [
  { id: 'pot', label: 'Chậu cây' },
  { id: 'seed', label: 'Hạt giống' },
  { id: 'tool', label: 'Nông cụ' },
];

/** Cửa hàng chia danh mục; dùng chung danh sách hàng và dịch vụ mua. */
export class ToolShopScene extends BaseScene {
  readonly sceneName = 'Cửa hàng';
  private readonly cards = new Container();
  private readonly cardsMask = new Graphics();
  private readonly scrollIndicator = new Graphics();
  private readonly background = new Graphics();
  private readonly notice: Text;
  private readonly emptyMessage: Text;
  private readonly itemCards: ShopItemCard[] = [];
  private readonly tabBar: GameTabBar;
  private readonly purchaseDialog = new PurchaseConfirmDialog();
  private activeTab: ShopTab = 'pot';
  private scrollY = 0;
  private maxScrollY = 0;
  private readonly listTop = 108;
  private unsubscribe?: () => void;

  constructor() {
    super();
    this.addChild(this.background);
    this.tabBar = new GameTabBar({
      width: this.sceneWidth - 32,
      tabs: SHOP_TABS,
      selectedIndex: 0,
      intro: false,
      onChange: (_index, tab) => this.selectTab(tab.id as ShopTab),
    });
    this.addChild(this.tabBar);

    this.addChild(this.cards);
    this.addChild(this.cardsMask);
    this.cards.mask = this.cardsMask;
    this.addChild(this.scrollIndicator);
    this.eventMode = 'static';
    this.on('wheel', (event) => {
      const point = event.getLocalPosition(this);
      if (point.y < this.listTop || point.y > this.listBottom) return;
      if (this.maxScrollY <= 0) return;
      this.scrollY = Math.max(0, Math.min(this.maxScrollY, this.scrollY + event.deltaY));
      this.updateScrollPosition();
      event.preventDefault();
    });
    for (const item of SHOP_ITEMS.filter((entry) => entry.available)) {
      const card = new ShopItemCard(item, (id) => {
        const selected = SHOP_ITEMS.find((entry) => entry.id === id);
        if (selected) this.purchaseDialog.open(selected, (message) => { this.notice.text = message; });
      });
      this.cards.addChild(card);
      this.itemCards.push(card);
    }

    this.notice = new Text({ text: '', style: new TextStyle({
        fontFamily: 'Oswald, Arial, sans-serif', fontSize: 14, fill: 0x315f45,
      }) });
    this.notice.anchor.set(0.5, 0);
    this.addChild(this.notice);
    this.emptyMessage = new Text({
      text: 'Chưa có vật phẩm trong danh mục này.',
      style: new TextStyle({ fontFamily: 'Oswald, Arial, sans-serif', fontSize: 17, fill: 0x66816b }),
    });
    this.emptyMessage.anchor.set(0.5);
    this.addChild(this.emptyMessage);
    // Lớp xác nhận phải nằm trên danh sách hàng và bắt mọi thao tác khi đang mở.
    this.addChild(this.purchaseDialog);
    this.selectTab('pot');
    this.layout();
  }

  override onEnter(): void {
    this.unsubscribe?.();
    this.unsubscribe = gameStore.subscribe(() => this.updateCards());
    this.layout();
  }

  override onExit(): void {
    this.unsubscribe?.();
    this.unsubscribe = undefined;
  }

  override resize(width: number, height: number): void {
    super.resize(width, height);
    this.layout();
  }

  private updateCards(): void {
    for (const card of this.itemCards) {
      const item = card.shopItem;
      const bought = gameStore.state.purchasedCounts[String(item.id)] ?? 0;
      const stockOk = item.stock === -1 || bought < item.stock;
      card.setAvailability(stockOk && gameStore.player.level >= item.requiredLevel
          && item.available && gameStore.player[item.currency] >= item.price);
    }
  }

  private selectTab(tab: ShopTab): void {
    this.activeTab = tab;
    this.scrollY = 0;
    this.notice.text = '';
    this.layout();
  }

  private get listBottom(): number {
    return Math.max(this.listTop, this.sceneHeight - 38);
  }

  private updateScrollPosition(): void {
    this.cards.position.y = this.listTop - this.scrollY;
    this.scrollIndicator.clear();
    if (this.maxScrollY <= 0) return;

    const viewportHeight = this.listBottom - this.listTop;
    const contentHeight = viewportHeight + this.maxScrollY;
    const thumbHeight = Math.max(28, viewportHeight * viewportHeight / contentHeight);
    const thumbY = this.listTop + this.scrollY / this.maxScrollY * (viewportHeight - thumbHeight);
    this.scrollIndicator.roundRect(this.sceneWidth - 10, thumbY, 5, thumbHeight, 3)
        .fill({ color: 0x69955f, alpha: 0.85 });
  }

  private layout(): void {
    this.background.clear().rect(0, 0, this.sceneWidth, this.sceneHeight).fill(0xf1f0df);
    this.tabBar.position.set(16, 10);
    this.tabBar.resize(Math.max(200, this.sceneWidth - 32));
    this.hitArea = new Rectangle(0, 0, this.sceneWidth, this.sceneHeight);
    this.cardsMask.clear().rect(0, this.listTop, this.sceneWidth, this.listBottom - this.listTop)
        .fill(0xffffff);
    const columns = 2;
    const width = 228;
    const gap = Math.max(6, (this.sceneWidth - columns * width) / 3);
    const shownCards = this.itemCards.filter((card) => card.shopItem.itemType === this.activeTab);
    this.itemCards.forEach((card) => { card.visible = card.shopItem.itemType === this.activeTab; });
    shownCards.forEach((card, index) => {
      card.position.set(gap + (index % columns) * (width + gap), Math.floor(index / columns) * 194);
    });
    const totalRows = Math.ceil(shownCards.length / columns);
    const contentHeight = totalRows ? (totalRows - 1) * 194 + 184 : 0;
    this.maxScrollY = Math.max(0, contentHeight - (this.listBottom - this.listTop));
    this.scrollY = Math.min(this.scrollY, this.maxScrollY);
    this.updateScrollPosition();
    this.emptyMessage.visible = shownCards.length === 0;
    this.emptyMessage.position.set(this.sceneWidth / 2, this.sceneHeight / 2);
    this.notice.position.set(this.sceneWidth / 2, Math.max(0, this.sceneHeight - 24));
    this.purchaseDialog.resize(this.sceneWidth, this.sceneHeight);
  }
}
