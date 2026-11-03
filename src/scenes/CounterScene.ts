import { Container, Graphics, Sprite, Text } from 'pixi.js';
import type { Game } from '../Game';
import type { TextureProvider } from '../render/TextureProvider';
import type { Toast } from '../ui/Toast';
import type { Modal } from '../ui/Modal';
import type { ViewportInfo } from '../layout/LayoutManager';
import type { OrderInstance } from '../model/OrderInstance';
import { computeRegions } from '../layout/LayoutManager';
import { customerById } from '../data/customers';
import { variantById } from '../data/catalogRegistry';
import { bouquetById } from '../data/bouquets';
import { FAVOR_LEVELS } from '../data/favorLevels';
import { STRINGS } from '../data/strings';
import { LAYOUT } from '../data/layout';
import { THEME } from '../data/theme';
import { formatDuration } from '../core/format';
import { ScrollList } from '../ui/ScrollList';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { ProgressBar } from '../ui/ProgressBar';
import { CurrencyLabel } from '../ui/CurrencyLabel';

export class CounterScene {
  readonly view = new Container();
  private background: Sprite;
  private shade = new Graphics();
  private customerCard = new Card(LAYOUT.designWidth - LAYOUT.sidePadding * 2, LAYOUT.counter.customerHeight);
  private portrait = new Sprite();
  private customerName = new Text({ style: this.textStyle(THEME.font.heading, THEME.colors.text, true) });
  private favorText = new Text({ style: this.textStyle(THEME.font.body, THEME.colors.muted) });
  private favorBar = new ProgressBar(LAYOUT.designWidth / 2, THEME.spacing.sm);
  private title = new Text({ style: this.textStyle(THEME.font.heading, THEME.colors.textOnDark, true) });
  private list = new ScrollList(LAYOUT.designWidth - LAYOUT.sidePadding * 2, LAYOUT.minHeight);
  private lastSecond = -1;

  constructor(private game: Game, private textures: TextureProvider, private toast: Toast, private modal: Modal) {
    this.background = new Sprite(textures.getBackground('counter_shop'));
    this.customerCard.addChild(this.portrait, this.customerName, this.favorText, this.favorBar);
    this.view.addChild(this.background, this.shade, this.customerCard, this.title, this.list);
    this.refresh();
  }

  layout(vp: ViewportInfo): void {
    const content = computeRegions(vp).content;
    this.background.width = vp.width; this.background.height = vp.height;
    this.shade.clear().rect(0, 0, vp.width, vp.height).fill({ color: THEME.colors.shadow, alpha: LAYOUT.scene.backgroundShadeAlpha });
    this.customerCard.position.set(LAYOUT.sidePadding, content.y + THEME.spacing.sm);
    this.customerCard.resize(content.width - LAYOUT.sidePadding * 2, LAYOUT.counter.customerHeight);
    this.portrait.position.set(THEME.spacing.md, THEME.spacing.md); this.portrait.width = this.portrait.height = LAYOUT.counter.portraitSize;
    this.customerName.position.set(LAYOUT.counter.portraitSize + THEME.spacing.xl, THEME.spacing.lg);
    this.favorText.position.set(this.customerName.x, THEME.spacing.xxl + THEME.spacing.md);
    this.favorBar.position.set(this.customerName.x, THEME.spacing.xxl + THEME.spacing.xl);
    this.favorBar.resize(content.width - this.customerName.x - LAYOUT.sidePadding * 3, THEME.spacing.sm);
    this.title.position.set(LAYOUT.sidePadding, this.customerCard.y + LAYOUT.counter.customerHeight + THEME.spacing.sm);
    this.list.position.set(LAYOUT.sidePadding, this.title.y + LAYOUT.scene.titleHeight);
    this.list.resize(content.width - LAYOUT.sidePadding * 2, content.y + content.height - THEME.spacing.sm - this.list.y);
  }

  update(): void { const second = Math.floor(this.game.clock.now() / 1000); if (second !== this.lastSecond) { this.lastSecond = second; this.refresh(); } }
  destroy(): void { this.view.destroy({ children: true }); }

  private refresh(): void {
    const orders = this.game.orders.open();
    this.title.text = `${STRINGS.counterTitle} · ${orders.length}`;
    const first = orders[0];
    this.customerCard.visible = Boolean(first);
    if (first) {
      const customer = customerById(first.customerId); const state = this.game.favor.get(first.customerId); const level = this.game.favor.level(first.customerId);
      const levelIndex = FAVOR_LEVELS.findIndex((item) => item.id === level.id); const next = FAVOR_LEVELS[levelIndex + 1];
      this.portrait.texture = this.textures.getCustomerTexture(customer.id, 'base');
      this.customerName.text = customer.name; this.favorText.text = `${level.name} · ${state.favor} ${STRINGS.favor}`;
      this.favorBar.set(next ? (state.favor - level.minFavor) / (next.minFavor - level.minFavor) : 1, THEME.colors.accent);
    }
    const width = LAYOUT.designWidth - LAYOUT.sidePadding * 2;
    this.list.setItems(orders.length ? orders.map((order) => this.orderCard(order, width)) : [this.emptyCard(width)], LAYOUT.scene.listGap);
  }

  private orderCard(order: OrderInstance, width: number): Container {
    const customer = customerById(order.customerId);
    const request = order.lines.map((line) => { const name=line.match.itemId?bouquetById(line.match.itemId).name:line.match.variantId?variantById(line.match.variantId).name:STRINGS.flowerInventory;const have=line.match.itemId?this.game.inventory.count('bouquets',line.match.itemId):this.game.inventory.matchingFlowers(line.match).reduce((sum,[,count])=>sum+count,0);return`${name} ${have}/${line.count}`; }).join('\n');
    const card = new Card(width, LAYOUT.counter.cardHeight);
    const name = new Text({ text: customer.name, style: this.textStyle(THEME.font.heading, THEME.colors.text, true) }); name.position.set(THEME.spacing.md, THEME.spacing.md);
    const info = new Text({ text: `${request}\n${STRINGS.expires}: ${formatDuration((order.expiresAt - this.game.clock.now()) / 1000)}`, style: { ...this.textStyle(THEME.font.caption, THEME.colors.muted), lineHeight: THEME.font.body, wordWrap: true, wordWrapWidth: width - THEME.spacing.xl } }); info.position.set(THEME.spacing.md, THEME.spacing.xl + THEME.spacing.md);
    const reward = new CurrencyLabel(this.textures, order.reward, THEME.font.caption, THEME.colors.primaryDark); reward.position.set(width - THEME.spacing.xxl - THEME.spacing.lg, THEME.spacing.md);
    const deliver = new Button(STRINGS.deliver, LAYOUT.counter.actionWidth, () => this.deliver(order), THEME.tap.min, THEME.font.caption);
    const reject = new Button(STRINGS.reject, LAYOUT.counter.actionWidth, () => this.confirmReject(order), THEME.tap.min, THEME.font.caption);
    const buttonsY = LAYOUT.counter.cardHeight - THEME.tap.min - THEME.spacing.md; deliver.position.set(THEME.spacing.md, buttonsY); reject.position.set(width - LAYOUT.counter.actionWidth - THEME.spacing.md, buttonsY);
    deliver.setEnabled(this.game.orders.canDeliver(order)); card.addChild(name, reward, info, deliver, reject); return card;
  }

  private emptyCard(width: number): Container {
    const card = new Card(width, LAYOUT.counter.cardHeight); const text = new Text({ text: STRINGS.noOrders, style: this.textStyle(THEME.font.body, THEME.colors.muted) }); text.anchor.set(.5); text.position.set(width / 2, LAYOUT.counter.cardHeight / 2); card.addChild(text); return card;
  }

  private deliver(order: OrderInstance): void {
    if (this.game.orders.deliver(order)) { this.toast.showCurrency(`${STRINGS.orderDone} +${order.reward} ${STRINGS.coins}`); this.refresh(); }
    else this.toast.show(STRINGS.orderNeedItems);
  }

  private confirmReject(order: OrderInstance): void {
    this.modal.confirm(STRINGS.rejectOrder, STRINGS.rejectConfirm, () => { if (this.game.orders.failOrder(order, 'Rejected')) { this.toast.show(STRINGS.orderFailed); this.refresh(); } });
  }

  private textStyle(fontSize: number, fill: number, bold = false) { return { fontFamily: THEME.font.family, fontSize, fill, fontWeight: bold ? '700' as const : '400' as const }; }
}
