import {
  Assets,
  Container,
  FederatedPointerEvent,
  Graphics,
  Rectangle,
  Sprite,
  Text,
  TextStyle,
  Texture,
  Ticker,
} from 'pixi.js';
import type { ShopItem } from '../models/ShopItem';
import { getPotById } from '../data/pots';
import { getFlowerSeedById } from '../data/flowerSeeds';
import { SeedPack } from './SeedPack';

export interface ShopItemCardOptions {
  /** Trễ (giây) trước khi thẻ xuất hiện, dùng để các thẻ hiện lần lượt. Mặc định 0. */
  introDelay?: number;
  /** Bật hiệu ứng xuất hiện. Mặc định true. */
  animateIn?: boolean;
}

// ==============================================================
// MÀU SẮC / KÍCH THƯỚC (đồng bộ với các UI game khác)
// ==============================================================

const C = {
  outline: 0x24170a,
  white: 0xffffff,
  gold: 0xffd24a,

  // thẻ
  cardFace: 0xfff4d9,
  cardHi: 0xfffbee,
  cardSide: 0xb48d4c,
  cardShade: 0xb08a4a,
  title: 0x315f45,
  titleStroke: 0xfffbee,

  // bệ đặt chậu
  stage: 0xe8f5d6,
  stageFloor: 0xc9dfb0,

  leaf: 0x5fa332,
  leafLight: 0x9bd35a,
  leafDark: 0x3f7a1f,
};

interface ButtonPalette {
  face: number;
  highlight: number;
  shade: number;
  side: number;
  text: number;
  stroke: number;
}

const BUY_READY: ButtonPalette = {
  face: 0x7fd13b,
  highlight: 0xc6f57e,
  shade: 0x2f7d14,
  side: 0x3d8a21,
  text: 0xffffff,
  stroke: 0x2a6511,
};

const BUY_DISABLED: ButtonPalette = {
  face: 0xbdb8ac,
  highlight: 0xdcd8ce,
  shade: 0x6e695e,
  side: 0x8d887b,
  text: 0xf3f0e8,
  stroke: 0x6e695e,
};

const CURRENCY_ICON = {
  coin: '/assets/ui/coin.png',
  diamond: '/assets/ui/diamond.png',
} as const;

const CARD_W = 228;
const CARD_H = 184;
const SIDE = 7; // độ dày 3D của thẻ
const FACE_H = CARD_H - SIDE;

const BTN_X = 20;
const BTN_Y = 122;
const BTN_W = CARD_W - 40;
const BTN_FACE = 38;
const BTN_SIDE = 6;

const POT_BASE_Y = 108; // đáy chậu (tâm scale + bóng)
const POT_SIZE = 80;

// ==============================================================
// TIỆN ÍCH
// ==============================================================

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

function lerpColor(a: number, b: number, t: number): number {
  t = clamp01(t);
  const ch = (shift: number) => {
    const x = (a >> shift) & 255;
    const y = (b >> shift) & 255;
    return (x + (y - x) * t) | 0;
  };
  return (ch(16) << 16) | (ch(8) << 8) | ch(0);
}

class Spring {
  public x: number;
  public v = 0;
  public target: number;

  constructor(
      value: number,
      private readonly k = 200,
      private readonly d = 14,
  ) {
    this.x = value;
    this.target = value;
  }

  public snap(value: number): void {
    this.x = value;
    this.target = value;
    this.v = 0;
  }

  public step(dt: number): void {
    const n = 2;
    const h = dt / n;
    for (let i = 0; i < n; i++) {
      const a = this.k * (this.target - this.x) - this.d * this.v;
      this.v += a * h;
      this.x += this.v * h;
    }
  }
}

function createStar(): Graphics {
  return new Graphics()
      .poly([0, -7, 1.8, -1.8, 7, 0, 1.8, 1.8, 0, 7, -1.8, 1.8, -7, 0, -1.8, -1.8])
      .fill(C.gold)
      .poly([0, -3.5, 0.9, -0.9, 3.5, 0, 0.9, 0.9, 0, 3.5, -0.9, 0.9, -3.5, 0, -0.9, -0.9])
      .fill(C.white);
}

function createLeaf(color: number): Graphics {
  const leaf = new Graphics()
      .moveTo(0, 0)
      .quadraticCurveTo(6, -6, 14, 0)
      .quadraticCurveTo(6, 6, 0, 0)
      .fill(color)
      .moveTo(1, 0)
      .lineTo(11, 0)
      .stroke({ color: C.leafDark, width: 1, alpha: 0.7 });
  leaf.pivot.set(7, 0);
  return leaf;
}

interface Particle {
  g: Graphics;
  vx: number;
  vy: number;
  vr: number;
  gravity: number;
  age: number;
  life: number;
  star: boolean;
}

interface Ripple {
  g: Graphics;
  x: number;
  y: number;
  radius: number;
  flat: number;
  color: number;
  age: number;
}

// ==============================================================
// NÚT MUA 3D
// ==============================================================

class ShopBuyButton extends Container {
  private readonly inner = new Container(); // scale / rung quanh đáy nút
  private readonly art = new Graphics();
  private readonly fxClip = new Container();
  private readonly fxMask = new Graphics();
  private readonly shine = new Graphics();
  private readonly priceRow = new Container();
  private readonly priceText: Text;
  private iconNode: Container | null = null;

  private readonly hover = new Spring(0, 260, 22);
  private readonly press = new Spring(0, 340, 22);
  private readonly pop = new Spring(1, 320, 13);
  private readonly ready: Spring; // 1 = mua được, 0 = không đủ tiền

  private canBuy = true;
  private shineT = -1;
  private shineTimer = 0;
  private shakeLeft = 0;
  private time = 0;
  private ripples: { g: Graphics; x: number; y: number; age: number }[] = [];

  constructor(
      private readonly onBuyTap: () => void,
      private readonly onDenied: () => void,
      currency: ShopItem['currency'],
  ) {
    super();

    this.ready = new Spring(1, 300, 30);

    this.priceText = new Text({
      text: '',
      style: this.makeStyle(BUY_READY),
    });
    this.priceText.anchor.set(0, 0.5);

    this.priceRow.addChild(this.priceText);
    this.loadCurrencyIcon(currency);

    this.fxClip.addChild(this.shine);
    this.fxClip.mask = this.fxMask;

    this.inner.pivot.set(BTN_W / 2, BTN_SIDE + BTN_FACE);
    this.inner.position.set(BTN_W / 2, BTN_SIDE + BTN_FACE);
    this.inner.addChild(this.art, this.fxClip, this.fxMask, this.priceRow);
    this.addChild(this.inner);

    this.hitArea = new Rectangle(0, 0, BTN_W, BTN_SIDE + BTN_FACE);
    this.eventMode = 'static';
    this.cursor = 'pointer';

    this.on('pointerdown', (e: FederatedPointerEvent) => {
      e.stopPropagation(); // không làm thẻ bị "nhấn" theo
      this.press.target = 1;
    });
    this.on('pointerup', () => (this.press.target = 0));
    this.on('pointerupoutside', () => (this.press.target = 0));
    this.on('pointerover', () => {
      this.hover.target = this.canBuy ? 1 : 0;
      if (this.canBuy) this.shineT = 0;
    });
    this.on('pointerout', () => {
      this.hover.target = 0;
      this.press.target = 0;
    });
    this.on('pointertap', (e: FederatedPointerEvent) => {
      e.stopPropagation();
      const p = e.getLocalPosition(this.inner);
      this.spawnRipple(p.x, p.y);

      if (this.canBuy) {
        this.pop.v += 4.5;
        this.shineT = 0;
        this.onBuyTap();
      } else {
        this.shakeLeft = 1; // rung báo "không đủ tiền"
        this.onDenied();
      }
    });
  }

  // ---------- API ----------

  public setCanBuy(canBuy: boolean): void {
    if (canBuy === this.canBuy) return;
    this.canBuy = canBuy;
    this.ready.target = canBuy ? 1 : 0;
    if (!canBuy) {
      this.hover.target = 0;
      this.press.target = 0;
    }
    this.priceText.style = this.makeStyle(canBuy ? BUY_READY : BUY_DISABLED);
    this.layoutPrice();
  }

  public setPrice(text: string): void {
    this.priceText.text = text;
    this.layoutPrice();
  }

  // ---------- nội bộ ----------

  private makeStyle(p: ButtonPalette): TextStyle {
    return new TextStyle({
      fontFamily: 'Oswald, Arial, sans-serif',
      fontSize: 17,
      fontWeight: '700',
      fill: p.text,
      stroke: { color: p.stroke, width: 4, join: 'round' },
    });
  }

  /** Icon tiền: dùng PNG của game, nếu lỗi thì rơi về emoji như bản cũ */
  private loadCurrencyIcon(currency: ShopItem['currency']): void {
    const url = currency === 'coin' ? CURRENCY_ICON.coin : CURRENCY_ICON.diamond;

    void Assets.load<Texture>(url)
        .then((texture) => {
          if (this.destroyed) return;
          const sprite = new Sprite(texture);
          sprite.anchor.set(0.5);
          sprite.scale.set(24 / Math.max(texture.width, texture.height));
          this.setIcon(sprite, 24);
        })
        .catch(() => {
          if (this.destroyed) return;
          const emoji = new Text({
            text: currency === 'coin' ? '🪙' : '💎',
            style: new TextStyle({ fontSize: 18 }),
          });
          emoji.anchor.set(0.5);
          this.setIcon(emoji, 22);
        });
  }

  private iconWidth = 0;

  private setIcon(node: Container, width: number): void {
    this.iconNode = node;
    this.iconWidth = width;
    this.priceRow.addChild(node);
    this.layoutPrice();
  }

  /** Căn [icon] [giá] vào giữa nút */
  private layoutPrice(): void {
    const gap = this.iconNode ? 6 : 0;
    const total = this.iconWidth + gap + this.priceText.width;
    const left = -total / 2;

    if (this.iconNode) this.iconNode.position.set(left + this.iconWidth / 2, 0);
    this.priceText.position.set(left + this.iconWidth + gap, 0);
  }

  private spawnRipple(x: number, y: number): void {
    const g = new Graphics();
    this.fxClip.addChild(g);
    this.ripples.push({ g, x, y, age: 0 });
  }

  private draw(top: number, t: number): void {
    const w = BTN_W;
    const h = BTN_FACE;
    const face = lerpColor(BUY_DISABLED.face, BUY_READY.face, t);
    const hi = lerpColor(BUY_DISABLED.highlight, BUY_READY.highlight, t);
    const lo = lerpColor(BUY_DISABLED.shade, BUY_READY.shade, t);
    const side = lerpColor(BUY_DISABLED.side, BUY_READY.side, t);

    this.art
        .clear()
        .roundRect(-2, top - 2, w + 4, BTN_SIDE + h - top + 4, 12)
        .fill(C.outline)
        .roundRect(0, top + 8, w, BTN_SIDE + h - top - 8, 9)
        .fill(side)
        .roundRect(0, top, w, h, 9)
        .fill(face)
        .roundRect(3, top + 3, w - 6, h * 0.46, 6)
        .fill({ color: hi, alpha: 0.6 })
        .roundRect(3, top + h * 0.66, w - 6, h * 0.3, 6)
        .fill({ color: lo, alpha: 0.14 })
        .roundRect(1.5, top + 1.5, w - 3, h - 3, 8)
        .stroke({ color: C.white, width: 1.5, alpha: 0.35 });

    this.fxMask.clear().roundRect(0, top, w, h, 9).fill(C.white);
  }

  public update(dt: number): void {
    this.time += dt;
    this.hover.step(dt);
    this.press.step(dt);
    this.pop.step(dt);
    this.ready.step(dt);

    const t = clamp01(this.ready.x);

    // độ nổi: mua được -> nhô cao + hover; không mua được -> thấp hẳn
    let lift = 2 + t * (3 + 1.8 * this.hover.x - 4.2 * this.press.x + Math.sin(this.time * 2.6) * 0.25);
    lift = Math.max(0.8, lift);
    const top = BTN_SIDE - lift;

    this.draw(top, t);
    this.priceRow.position.set(BTN_W / 2, top + BTN_FACE / 2 + this.press.x * 1.5);
    this.priceRow.alpha = 1;

    // vệt sáng quét: khi hover/bấm, và thỉnh thoảng khi đang mua được
    if (this.shineT < 0 && this.canBuy) {
      this.shineTimer += dt;
      if (this.shineTimer > 3.4) {
        this.shineTimer = 0;
        this.shineT = 0;
      }
    }
    this.shine.clear();
    if (this.shineT >= 0) {
      this.shineT += dt / 0.65;
      if (this.shineT >= 1) {
        this.shineT = -1;
      } else {
        const e = 1 - Math.pow(1 - this.shineT, 2);
        const x = -40 + (BTN_W + 70) * e;
        this.shine
            .poly([x + 14, top, x + 32, top, x + 18, top + BTN_FACE, x, top + BTN_FACE])
            .fill({ color: C.white, alpha: 0.5 })
            .poly([x + 36, top, x + 42, top, x + 28, top + BTN_FACE, x + 22, top + BTN_FACE])
            .fill({ color: C.white, alpha: 0.32 });
      }
    }

    // sóng lan khi bấm
    for (let i = this.ripples.length - 1; i >= 0; i--) {
      const r = this.ripples[i];
      r.age += dt;
      const k = r.age / 0.55;
      if (k >= 1) {
        r.g.destroy();
        this.ripples.splice(i, 1);
        continue;
      }
      const eased = 1 - Math.pow(1 - k, 3);
      r.g.clear()
          .circle(r.x, r.y, eased * BTN_W * 0.5)
          .fill({ color: C.white, alpha: 0.25 * (1 - k) })
          .stroke({ color: C.white, width: 2.5 * (1 - k) + 0.5, alpha: 0.8 * (1 - k) });
    }

    // rung ngang khi không đủ tiền
    let shakeX = 0;
    if (this.shakeLeft > 0) {
      this.shakeLeft = Math.max(0, this.shakeLeft - dt / 0.42);
      shakeX = Math.sin((1 - this.shakeLeft) * 46) * 6 * this.shakeLeft;
    }
    this.inner.position.x = BTN_W / 2 + shakeX;
    this.inner.scale.set(this.pop.x * (1 - 0.02 * this.press.x));
  }
}

// ==============================================================
// THẺ VẬT PHẨM
// ==============================================================

export class ShopItemCard extends Container {
  readonly widthPx = CARD_W;
  readonly heightPx = CARD_H;

  private readonly body = new Container(); // scale quanh đáy thẻ
  private readonly art = new Graphics();
  private readonly content = new Container(); // nội dung nằm trên mặt thẻ (di chuyển theo độ nổi)
  private readonly backdrop = new Graphics();
  private readonly potHolder = new Container();
  private readonly buyButton: ShopBuyButton;
  private readonly fxLayer = new Container();

  private readonly intro = new Spring(0, 170, 11);
  private readonly hover = new Spring(0, 260, 22);
  private readonly press = new Spring(0, 320, 22);
  private readonly pop = new Spring(1, 300, 12);
  private readonly potJump = new Spring(0, 260, 9);
  private readonly potWiggle = new Spring(0, 220, 8);

  private readonly phase = Math.random() * Math.PI * 2;
  private readonly introDelay: number;
  private readonly animateIn: boolean;
  private elapsed = 0;
  private time = 0;
  private shakeLeft = 0;

  private particles: Particle[] = [];
  private ripples: Ripple[] = [];

  constructor(
      readonly shopItem: ShopItem,
      onBuy: (id: number) => void,
      options: ShopItemCardOptions = {},
  ) {
    super();

    this.introDelay = options.introDelay ?? 0;
    this.animateIn = options.animateIn ?? true;

    const pot = shopItem.itemType === 'pot' ? getPotById(shopItem.itemId) : undefined;
    const seed = shopItem.itemType === 'seed' ? getFlowerSeedById(shopItem.itemId) : undefined;
    const title = pot?.name ?? seed?.name ?? `Vật phẩm #${shopItem.itemId}`;

    // ---- tên vật phẩm (tự thu nhỏ nếu quá dài) ----
    const nameText = new Text({
      text: title,
      style: new TextStyle({
        fontFamily: 'Oswald, Arial, sans-serif',
        fontSize: 17,
        fontWeight: '700',
        fill: C.title,
        stroke: { color: C.titleStroke, width: 3, join: 'round' },
      }),
    });
    nameText.anchor.set(0.5, 0);
    nameText.position.set(CARD_W / 2, 7);
    const maxNameW = CARD_W - 28;
    if (nameText.width > maxNameW) nameText.scale.set(maxNameW / nameText.width);

    // ---- chậu / vật phẩm ----
    this.potHolder.position.set(CARD_W / 2, POT_BASE_Y);
    if (seed) {
      const seedPack = new SeedPack(seed, { size: POT_SIZE, labelScale: 0.5 });
      seedPack.position.set(0, -POT_SIZE / 2 - 4);
      this.potHolder.addChild(seedPack);
    } else if (pot) {
      void Assets.load<Texture>(pot.assetUrl)
          .then((texture) => {
            if (this.destroyed) return;
            const sprite = new Sprite(texture);
            sprite.anchor.set(0.5);
            sprite.position.set(0, -POT_SIZE / 2 - 4);
            sprite.scale.set(POT_SIZE / Math.max(texture.width, texture.height));
            sprite.eventMode = 'none';
            this.potHolder.addChild(sprite);
          })
          .catch((err: unknown) => console.warn(`Không tải được ảnh ${pot.assetUrl}`, err));
    } else {
      const placeholder = new Text({ text: '🎁', style: new TextStyle({ fontSize: 46 }) });
      placeholder.anchor.set(0.5);
      placeholder.position.set(0, -POT_SIZE / 2 - 4);
      this.potHolder.addChild(placeholder);
    }

    // ---- nút mua ----
    this.buyButton = new ShopBuyButton(
        () => this.handleBuy(onBuy),
        () => this.handleDenied(),
        shopItem.currency,
    );
    this.buyButton.position.set(BTN_X, BTN_Y);

    this.content.addChild(this.backdrop, this.potHolder, nameText, this.buyButton);
    this.body.pivot.set(CARD_W / 2, CARD_H);
    this.body.position.set(CARD_W / 2, CARD_H);
    this.body.addChild(this.art, this.content);
    this.addChild(this.body, this.fxLayer);

    // ---- tương tác của thẻ ----
    this.eventMode = 'static';
    this.hitArea = new Rectangle(0, 0, CARD_W, CARD_H);
    this.on('pointerenter', () => {
      this.hover.target = 1;
      this.potWiggle.v += 4;
    });
    this.on('pointerleave', () => {
      this.hover.target = 0;
      this.press.target = 0;
    });
    this.on('pointerdown', () => (this.press.target = 1));
    this.on('pointerup', () => (this.press.target = 0));
    this.on('pointerupoutside', () => (this.press.target = 0));
    this.on('pointertap', () => {
      // bấm vào thân thẻ (không phải nút mua): chậu nhún nhảy cho vui mắt
      this.potJump.v += 7;
      this.potWiggle.v += (Math.random() < 0.5 ? -1 : 1) * 6;
      this.addRipple(CARD_W / 2, POT_BASE_Y, 50, 0.3, C.leafLight);
    });

    // ---- giá + trạng thái ban đầu ----
    this.buyButton.setPrice(this.shopItem.price.toLocaleString('vi-VN'));
    this.setAvailability(true);

    if (!this.animateIn) this.intro.snap(1);

    this.updateVisuals(0);
    this.buyButton.update(0);
    Ticker.shared.add(this.tick, this);
  }

  // ==========================================
  // PUBLIC
  // ==========================================

  setAvailability(canBuy: boolean): void {
    this.buyButton.setPrice(this.shopItem.price.toLocaleString('vi-VN'));
    this.buyButton.setCanBuy(canBuy);
  }

  public override destroy(options?: Parameters<Container['destroy']>[0]): void {
    Ticker.shared.remove(this.tick, this);
    super.destroy(options ?? { children: true });
  }

  // ==========================================
  // HIỆU ỨNG MUA
  // ==========================================

  private handleBuy(onBuy: (id: number) => void): void {
    // chậu nhảy mừng + hạt bay + thẻ nảy
    this.potJump.v += 11;
    this.potWiggle.v += (Math.random() < 0.5 ? -1 : 1) * 8;
    this.pop.v += 3;

    const bx = BTN_X + BTN_W / 2;
    const by = BTN_Y + 6;
    this.addRipple(bx, by + 18, 70, 0.35, C.leafLight);
    this.burst(bx, by, 7, 6);

    onBuy(this.shopItem.id);
  }

  private handleDenied(): void {
    this.shakeLeft = 1;
    this.addRipple(BTN_X + BTN_W / 2, BTN_Y + 22, 60, 0.4, 0xff6b5a);
  }

  private burst(x: number, y: number, leaves: number, stars: number): void {
    const spawn = (star: boolean) => {
      const g = star ? createStar() : createLeaf(Math.random() < 0.5 ? C.leaf : C.leafLight);
      g.position.set(x + (Math.random() - 0.5) * 70, y);
      g.rotation = Math.random() * Math.PI * 2;
      this.fxLayer.addChild(g);

      const angle = -Math.PI / 2 + (Math.random() - 0.5) * 2.2;
      const speed = star ? 100 + Math.random() * 120 : 120 + Math.random() * 140;
      this.particles.push({
        g,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        vr: (Math.random() - 0.5) * (star ? 4 : 9),
        gravity: star ? 140 : 520,
        age: 0,
        life: star ? 0.6 + Math.random() * 0.3 : 0.8 + Math.random() * 0.4,
        star,
      });
    };

    for (let i = 0; i < leaves; i++) spawn(false);
    for (let i = 0; i < stars; i++) spawn(true);
  }

  private addRipple(x: number, y: number, radius: number, flat: number, color: number): void {
    const g = new Graphics();
    this.fxLayer.addChild(g);
    this.ripples.push({ g, x, y, radius, flat, color, age: 0 });
  }

  // ==========================================
  // CẬP NHẬT MỖI FRAME
  // ==========================================

  private tick(ticker: Ticker): void {
    const dt = Math.min(ticker.deltaMS / 1000, 1 / 30);
    this.time += dt;
    this.elapsed += dt;

    if (this.elapsed >= this.introDelay && this.intro.target === 0) this.intro.target = 1;
    if (this.intro.target === 0) {
      this.body.visible = false;
      return;
    }
    this.body.visible = true;

    this.updateVisuals(dt);
    this.buyButton.update(dt);
    this.updateFx(dt);
  }

  private updateVisuals(dt: number): void {
    this.intro.step(dt);
    this.hover.step(dt);
    this.press.step(dt);
    this.pop.step(dt);
    this.potJump.step(dt);
    this.potWiggle.step(dt);

    const e = this.intro.x;
    const hv = this.hover.x;
    const pr = this.press.x;

    // ---- thẻ 3D: nhô lên khi hover, lún xuống khi nhấn ----
    const lift = Math.max(1, 5 + 2.5 * hv - 3.5 * pr);
    const top = SIDE - lift;
    this.drawCard(top);
    this.content.y = top;

    // rung nhẹ khi mua thất bại
    let shakeX = 0;
    if (this.shakeLeft > 0) {
      this.shakeLeft = Math.max(0, this.shakeLeft - dt / 0.42);
      shakeX = Math.sin((1 - this.shakeLeft) * 46) * 3 * this.shakeLeft;
    }

    this.body.position.set(CARD_W / 2 + shakeX, CARD_H + (1 - e) * 30);
    this.body.scale.set(
        e * this.pop.x * (1 + 0.015 * hv + 0.01 * pr),
        e * this.pop.x * (1 + 0.015 * hv - 0.02 * pr),
    );
    this.body.alpha = clamp01(e * 1.8);

    // ---- bệ đặt chậu: vầng sáng + bóng sàn, sáng hơn khi hover ----
    const pulse = 0.5 + 0.5 * Math.sin(this.time * 2 + this.phase);
    this.backdrop
        .clear()
        .circle(CARD_W / 2, POT_BASE_Y - 38, 46 + 2 * pulse + 4 * hv)
        .fill({ color: C.stage, alpha: 0.55 + 0.2 * hv })
        .ellipse(CARD_W / 2, POT_BASE_Y + 1, 46 + 4 * hv, 10)
        .fill({ color: C.stageFloor, alpha: 0.7 });

    // ---- chậu: nhún nhẹ liên tục, to ra + nghiêng khi hover, nhảy khi mua / bấm ----
    const bob = Math.sin(this.time * 2 + this.phase) * 1.8;
    this.potHolder.position.set(CARD_W / 2, POT_BASE_Y - bob - 3 * hv - Math.max(0, this.potJump.x) * 9);
    const s = 1 + 0.08 * hv + 0.12 * this.potJump.x;
    this.potHolder.scale.set(s * (1 + 0.04 * pr), s * (1 - 0.05 * pr));
    this.potHolder.rotation = this.potWiggle.x * 0.15 + Math.sin(this.time * 1.4 + this.phase) * 0.02;
  }

  private drawCard(top: number): void {
    const w = CARD_W;

    this.art
        .clear()
        // viền ngoài đậm
        .roundRect(-2, top - 2, w + 4, SIDE + FACE_H - top + 4, 17)
        .fill(C.outline)
        // cạnh 3D
        .roundRect(0, top + 10, w, SIDE + FACE_H - top - 10, 15)
        .fill(C.cardSide)
        // mặt thẻ
        .roundRect(0, top, w, FACE_H, 15)
        .fill(C.cardFace)
        // dải sáng phía sau tên
        .roundRect(5, top + 5, w - 10, 28, 10)
        .fill({ color: C.cardHi, alpha: 0.8 })
        // bóng tối nhẹ phía dưới
        .roundRect(5, top + FACE_H * 0.7, w - 10, FACE_H * 0.26, 10)
        .fill({ color: C.cardShade, alpha: 0.12 })
        // viền sáng bên trong
        .roundRect(2, top + 2, w - 4, FACE_H - 4, 13)
        .stroke({ color: C.white, width: 2, alpha: 0.5 });
  }

  private updateFx(dt: number): void {
    for (let i = this.ripples.length - 1; i >= 0; i--) {
      const r = this.ripples[i];
      r.age += dt;
      const t = r.age / 0.55;
      if (t >= 1) {
        r.g.destroy();
        this.ripples.splice(i, 1);
        continue;
      }
      const eased = 1 - Math.pow(1 - t, 3);
      const rad = r.radius * eased;
      r.g.clear()
          .ellipse(r.x, r.y, rad, rad * r.flat)
          .fill({ color: r.color, alpha: 0.18 * (1 - t) })
          .stroke({ color: r.color, width: 2.5 * (1 - t) + 0.5, alpha: 0.85 * (1 - t) });
    }

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.age += dt;
      if (p.age >= p.life) {
        p.g.destroy();
        this.particles.splice(i, 1);
        continue;
      }
      p.vy += p.gravity * dt;
      p.vx *= 1 - 1.2 * dt;
      p.g.x += p.vx * dt;
      p.g.y += p.vy * dt;
      p.g.rotation += p.vr * dt;

      const t = p.age / p.life;
      p.g.alpha = 1 - t * t;
      p.g.scale.set(p.star ? 1 + Math.sin(t * Math.PI) * 0.5 : 1 - t * 0.35);
    }
  }
}
