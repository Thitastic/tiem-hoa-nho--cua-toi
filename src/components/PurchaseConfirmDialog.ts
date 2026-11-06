import { Assets, Container, Graphics, Sprite, Text, TextStyle, Texture, Ticker } from 'pixi.js';
import type { ShopItem } from '../models/ShopItem';
import { getPotById } from '../data/pots';
import { getFlowerSeedById } from '../data/flowerSeeds';
import { gameStore } from '../services/GameSession';
import { buyService } from '../services/BuyService';
import { GameDialog, GameDialogButton } from './GameDialog';
import { SeedPack } from './SeedPack';

/** Nội dung chuyên biệt cho giao dịch mua hàng, sử dụng GameDialog làm khung UI chung. */
export class PurchaseConfirmDialog extends Container {
  private readonly dialog: GameDialog;
  private readonly body = new Container();
  private readonly image = new Container();
  private readonly quantityText = new Text({ text: '1', style: PurchaseConfirmDialog.font(27, 0x315f45) });
  private readonly nameText = new Text({ text: '', style: PurchaseConfirmDialog.font(20, 0x315f45) });
  private readonly totalText = new Text({ text: '', style: PurchaseConfirmDialog.font(19, 0x315f45) });
  private readonly balanceText = new Text({ text: '', style: PurchaseConfirmDialog.font(15, 0x6a7566, '500') });
  private readonly messageText = new Text({ text: '', style: PurchaseConfirmDialog.font(14, 0xbd433a, '600') });
  private readonly minus: GameDialogButton;
  private readonly plus: GameDialogButton;
  private currentItem?: ShopItem;
  private onResult?: (message: string) => void;
  private quantity = 1;
  private imageToken = 0;
  private time = 0;
  private jump = 0;
  private readonly ticker = (ticker: Ticker) => this.animate(ticker);

  private static font(size: number, fill: number, weight: '500' | '600' | '700' = '700'): TextStyle {
    return new TextStyle({ fontFamily: 'Oswald, Arial, sans-serif', fontWeight: weight, fontSize: size, fill });
  }

  constructor() {
    super();
    this.dialog = new GameDialog({
      title: 'XÁC NHẬN MUA HÀNG',
      height: 430,
      content: this.body,
      actions: [
        { label: 'Hủy', kind: 'secondary', onClick: () => this.close() },
        { label: 'Xác nhận mua', kind: 'primary', closeOnClick: false, onClick: () => this.purchase() },
      ],
      onClose: () => { this.currentItem = undefined; this.onResult = undefined; },
    });
    this.addChild(this.dialog);

    this.image.position.set(154, 51);
    this.body.addChild(new Graphics()
        .circle(154, 55, 46).fill({ color: 0xe8f5d6, alpha: 0.85 })
        .ellipse(154, 89, 48, 9).fill({ color: 0xc9dfb0, alpha: 0.85 }));
    this.body.addChild(this.image);
    this.nameText.anchor.set(0.5);
    this.nameText.position.set(154, 115);
    this.body.addChild(this.nameText);

    this.body.addChild(new Graphics()
        .roundRect(101, 145, 106, 47, 13).fill(0x24170a)
        .roundRect(104, 148, 100, 41, 11).fill(0xefe0b4));
    this.quantityText.anchor.set(0.5);
    this.quantityText.position.set(154, 169);
    this.body.addChild(this.quantityText);
    this.minus = new GameDialogButton('−', 53, 42, 'secondary', () => this.changeQuantity(-1));
    this.plus = new GameDialogButton('+', 53, 42, 'secondary', () => this.changeQuantity(1));
    this.minus.position.set(35, 146);
    this.plus.position.set(220, 146);
    this.body.addChild(this.minus, this.plus);

    this.totalText.anchor.set(0.5);
    this.totalText.position.set(154, 213);
    this.balanceText.anchor.set(0.5);
    this.balanceText.position.set(154, 235);
    this.messageText.anchor.set(0.5);
    this.messageText.position.set(154, 256);
    this.body.addChild(this.totalText, this.balanceText, this.messageText);
    Ticker.shared.add(this.ticker);
  }

  /** Giữ API tương thích với ToolShopScene hiện tại. */
  open(item: ShopItem, onResult: (message: string) => void): void {
    this.currentItem = item;
    this.onResult = onResult;
    this.quantity = 1;
    this.messageText.text = '';
    const pot = item.itemType === 'pot' ? getPotById(item.itemId) : undefined;
    const seed = item.itemType === 'seed' ? getFlowerSeedById(item.itemId) : undefined;
    this.nameText.text = pot?.name ?? seed?.name ?? `Vật phẩm #${item.itemId}`;
    this.nameText.scale.set(1);
    if (this.nameText.width > 290) this.nameText.scale.set(290 / this.nameText.width);
    this.loadPreview(pot?.assetUrl, seed);
    this.jump = 0;
    this.refresh();
    this.dialog.open();
  }

  close(): void { this.dialog.close(); }
  resize(width: number, height: number): void { this.dialog.resize(width, height); }

  private remaining(item: ShopItem): number {
    const bought = gameStore.state.purchasedCounts[String(item.id)] ?? 0;
    return item.stock < 0 ? 9999 : Math.max(0, item.stock - bought);
  }

  private changeQuantity(delta: number): void {
    if (!this.currentItem) return;
    const next = Math.max(1, Math.min(9999, this.remaining(this.currentItem), this.quantity + delta));
    if (next !== this.quantity) { this.quantity = next; this.jump = 0.3; }
    this.messageText.text = '';
    this.refresh();
  }

  private refresh(): void {
    const item = this.currentItem;
    if (!item) return;
    const balance = gameStore.player[item.currency];
    const total = item.price * this.quantity;
    const unit = item.currency === 'coin' ? 'xu' : 'kim cương';
    this.quantityText.text = String(this.quantity);
    this.totalText.text = `Tổng: ${total.toLocaleString('vi-VN')} ${unit}`;
    this.balanceText.text = `Hiện có: ${balance.toLocaleString('vi-VN')} ${unit}`;
    const canBuy = balance >= total && this.remaining(item) >= this.quantity
        && gameStore.player.level >= item.requiredLevel;
    this.dialog.setActionEnabled(1, canBuy);
    this.minus.setEnabled(this.quantity > 1);
    this.plus.setEnabled(this.quantity < this.remaining(item));
    if (!canBuy && !this.messageText.text) {
      this.messageText.text = balance < total ? `Không đủ ${unit}` : 'Không thể mua vật phẩm này';
    }
  }

  private purchase(): void {
    const item = this.currentItem;
    if (!item) return;
    try {
      const result = buyService.buy(item.id, this.quantity);
      if (!result.ok) {
        this.messageText.text = result.reason;
        this.refresh();
        return;
      }
      this.jump = 0.8;
      // Giữ fix từ file bạn gửi: đóng trước, rồi mới thông báo cập nhật HUD.
      const notify = this.onResult;
      this.dialog.close();
      try {
        notify?.(`Đã mua ${result.quantity} vật phẩm, tiêu ${result.totalPrice.toLocaleString('vi-VN')} ${item.currency === 'coin' ? 'xu' : 'kim cương'}!`);
      } catch (error) {
        console.error('Không cập nhật được thông báo mua hàng:', error);
      }
    } catch (error) {
      console.error('Lỗi xác nhận mua hàng:', error);
      this.messageText.text = error instanceof Error ? error.message : 'Không thể mua hàng';
    }
  }

  private loadPreview(url?: string, seed?: ReturnType<typeof getFlowerSeedById>): void {
    const token = ++this.imageToken;
    this.image.removeChildren().forEach((node) => node.destroy());
    if (seed) {
      const pack = new SeedPack(seed, { size: 82, labelScale: 0.5 });
      pack.position.set(0, 0);
      this.image.addChild(pack);
      return;
    }
    if (!url) {
      const fallback = new Text({ text: '🎁', style: new TextStyle({ fontSize: 42 }) });
      fallback.anchor.set(0.5);
      this.image.addChild(fallback);
      return;
    }
    void Assets.load<Texture>(url).then((texture) => {
      if (this.destroyed || token !== this.imageToken) return;
      const sprite = new Sprite(texture);
      sprite.anchor.set(0.5);
      sprite.scale.set(78 / Math.max(texture.width, texture.height));
      this.image.addChild(sprite);
    }).catch((error: unknown) => console.warn(`Không tải được ảnh ${url}`, error));
  }

  private animate(ticker: Ticker): void {
    if (!this.dialog.visible) return;
    const dt = Math.min(ticker.deltaMS / 1000, 1 / 30);
    this.time += dt;
    this.jump = Math.max(0, this.jump - dt * 2.5);
    this.image.y = 51 + Math.sin(this.time * 2) * 2 - this.jump * 10;
    this.image.rotation = Math.sin(this.time * 1.3) * 0.02;
    this.quantityText.scale.set(1 + this.jump * 0.12);
  }

  override destroy(options?: Parameters<Container['destroy']>[0]): void {
    Ticker.shared.remove(this.ticker);
    super.destroy(options ?? { children: true });
  }
}
