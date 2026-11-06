import { Assets, Container, Graphics, Rectangle, Sprite, Text, TextStyle, Texture, Ticker } from 'pixi.js';
import type { Event } from '../models/Event';
import { eventService } from '../services/EventService';

const SIZE = 54;
const STEP = 68;
const TOP = 68;
const MAIL_ASSET = '/assets/events/mail.png';

/** Vùng đệm quanh danh sách cuộn để vầng sáng / bóng / sóng của nút không bị mask cắt mất. */
const MASK_PAD_X = 28;
const MASK_PAD_Y = 6;

/** Kích thước tối đa của ảnh (px). Đổi tại đây nếu muốn ảnh to / nhỏ hơn. */
const IMAGE_SIZE = 50;

/** Độ lệch của các bản sao ảnh để tạo viền "sticker" đậm quanh hình. */
const OUTLINE_OFFSETS: readonly (readonly [number, number])[] = [
  [-2.5, 0], [2.5, 0], [0, -2.5], [0, 2.5],
  [-1.8, -1.8], [1.8, -1.8], [-1.8, 1.8], [1.8, 1.8],
];

const COLORS = {
  outline: 0x24170a,
  glyph: 0x47723f,
  white: 0xffffff,
  gold: 0xffd24a,
  mail: 0xff7a5a,
  scroll: 0x749c59,
};

interface FloatingEventsOptions {
  visibleEventCount?: number;
  onOpenEvent: (event: Event) => void;
  onOpenMail: () => void;
}

// ==============================================================
// TIỆN ÍCH
// ==============================================================

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

class Spring {
  x: number;
  v = 0;
  target: number;

  constructor(value: number, private readonly k = 220, private readonly d = 14) {
    this.x = value;
    this.target = value;
  }

  step(dt: number): void {
    const n = 2;
    const h = dt / n;
    for (let i = 0; i < n; i++) {
      const a = this.k * (this.target - this.x) - this.d * this.v;
      this.v += a * h;
      this.x += this.v * h;
    }
  }
}

function createStar(color: number, size = 1): Graphics {
  const s = size;
  return new Graphics()
      .poly([0, -7 * s, 1.8 * s, -1.8 * s, 7 * s, 0, 1.8 * s, 1.8 * s, 0, 7 * s, -1.8 * s, 1.8 * s, -7 * s, 0, -1.8 * s, -1.8 * s])
      .fill(color)
      .poly([0, -3.5 * s, 0.9 * s, -0.9 * s, 3.5 * s, 0, 0.9 * s, 0.9 * s, 0, 3.5 * s, -0.9 * s, 0.9 * s, -3.5 * s, 0, -0.9 * s, -0.9 * s])
      .fill(COLORS.white);
}

interface Particle {
  g: Graphics;
  vx: number;
  vy: number;
  vr: number;
  age: number;
  life: number;
}

// ==============================================================
// NÚT NỔI (mail / sự kiện)
// ==============================================================

/**
 * Chỉ hiển thị ảnh (không có vòng tròn / khung bao quanh). Để vẫn nổi bật trên mọi nền UI:
 * ảnh có viền "sticker" đậm bám theo hình dạng thật, vầng sáng nhịp thở bám theo hình ảnh,
 * bóng đổ dưới chân, nhấp nhô lơ lửng, rung lắc và lấp lánh định kỳ.
 */
class FloatingButton extends Container {
  private readonly shadow = new Graphics();
  private readonly body = new Container();
  private readonly art = new Container();
  private readonly glint: Graphics;

  private glow: Sprite | null = null;
  private artScale = 1;

  private readonly hover = new Spring(0, 260, 22);
  private readonly press = new Spring(0, 340, 22);
  private readonly pop = new Spring(1, 320, 13);
  private readonly wiggle = new Spring(0, 200, 6);
  private readonly intro = new Spring(0, 170, 10);

  private readonly phase = Math.random() * Math.PI * 2;
  private readonly attentionEvery: number;
  private readonly wiggleKick: number;
  private attentionTimer: number;
  private introDelay = 0;
  private age = 0;
  private time = 0;
  private pingT = -1;
  private glintT = -1;
  private tapT = -1;
  private leaving = false;

  /** Vị trí y mong muốn trong danh sách; nút trượt mượt tới đó khi danh sách đổi. */
  targetY = 0;

  constructor(
      label: string,
      url: string,
      private readonly accent: number,
      attentionEvery: number,
      wiggleKick: number,
      onTap: () => void,
      private readonly onBurst: (button: FloatingButton) => void,
  ) {
    super();

    this.attentionEvery = attentionEvery;
    this.wiggleKick = wiggleKick;
    this.attentionTimer = Math.random() * attentionEvery * 0.6; // lệch pha giữa các nút

    const c = SIZE / 2;

    // Icon dự phòng (hiện khi ảnh chưa tải xong hoặc chưa có asset)
    const fallback = new Text({
      text: label === 'Hòm thư' ? '✉' : '★',
      style: new TextStyle({
        fontFamily: 'Oswald, Arial, sans-serif',
        fontSize: 34,
        fill: COLORS.glyph,
        stroke: { color: COLORS.outline, width: 4, join: 'round' },
      }),
    });
    fallback.anchor.set(0.5);
    fallback.position.set(c);
    this.art.addChild(fallback);

    void Assets.load<Texture>(url)
        .then((texture) => {
          if (this.destroyed) return;

          const scale = IMAGE_SIZE / Math.max(texture.width, texture.height);
          this.artScale = scale;

          const makeSprite = (tint: number, dx = 0, dy = 0): Sprite => {
            const sprite = new Sprite(texture);
            sprite.anchor.set(0.5);
            sprite.position.set(c + dx, c + dy);
            sprite.scale.set(scale);
            sprite.tint = tint;
            sprite.eventMode = 'none';
            return sprite;
          };

          // vầng sáng bám theo hình ảnh (phóng to nhẹ, màu nhấn)
          const glow = makeSprite(this.accent);
          glow.alpha = 0.4;
          this.glow = glow;

          // viền "sticker" đậm quanh hình ảnh
          const outline = OUTLINE_OFFSETS.map(([dx, dy]) => makeSprite(COLORS.outline, dx, dy));

          // ảnh chính
          const image = makeSprite(COLORS.white);

          this.art.addChild(glow, ...outline, image);
          fallback.visible = false;
        })
        .catch(() => { /* Asset chưa có: giữ icon dự phòng. */ });

    // tia lấp lánh ở góc trên phải
    this.glint = createStar(COLORS.white, 1);
    this.glint.visible = false;

    this.body.pivot.set(c, c);
    this.body.addChild(this.art);
    this.addChild(this.shadow, this.body, this.glint);

    this.eventMode = 'static';
    this.cursor = 'pointer';
    this.hitArea = new Rectangle(0, 0, SIZE, SIZE);

    this.on('pointerdown', () => (this.press.target = 1));
    this.on('pointerup', () => (this.press.target = 0));
    this.on('pointerupoutside', () => (this.press.target = 0));
    this.on('pointerover', () => {
      this.hover.target = 1;
      this.glintT = 0;
    });
    this.on('pointerout', () => {
      this.hover.target = 0;
      this.press.target = 0;
    });
    this.on('pointertap', () => {
      this.pop.v += 5;
      this.wiggle.v += 8;
      this.tapT = 0;
      this.onBurst(this);
      onTap();
    });
  }

  /** Xuất hiện: nảy ra với độ trễ (giây). */
  startIntro(delay: number): void {
    this.introDelay = delay;
    this.age = 0;
    this.intro.target = 1;
    this.visible = delay <= 0;
  }

  /** Thu hút sự chú ý ngay: vầng sáng loé + rung + lấp lánh. */
  attention(): void {
    this.pingT = 0;
    this.glintT = 0;
    this.wiggle.v += this.wiggleKick * (Math.random() < 0.5 ? -1 : 1);
    this.attentionTimer = 0;
  }

  /** Dừng cảm giác "đang nhấn" (dùng khi người chơi bắt đầu kéo cuộn danh sách). */
  cancelPress(): void {
    this.press.target = 0;
  }

  /** Biến mất rồi tự báo `isGone`. */
  leave(): void {
    this.leaving = true;
    this.intro.target = 0;
    this.eventMode = 'none';
  }

  get isGone(): boolean {
    return this.leaving && this.intro.x < 0.02;
  }

  update(dt: number): void {
    this.age += dt;
    this.time += dt;

    if (this.age < this.introDelay) {
      this.visible = false;
      return;
    }
    this.visible = true;

    this.intro.step(dt);
    this.hover.step(dt);
    this.press.step(dt);
    this.pop.step(dt);
    this.wiggle.step(dt);

    // trượt mượt tới vị trí trong danh sách
    this.y += (this.targetY - this.y) * (1 - Math.exp(-dt * 12));

    // định kỳ gây chú ý
    if (!this.leaving) {
      this.attentionTimer += dt;
      if (this.attentionTimer >= this.attentionEvery) this.attention();
    }

    const c = SIZE / 2;
    const e = Math.max(0, this.intro.x);
    const hv = this.hover.x;
    const pr = this.press.x;

    // ---- ảnh: lơ lửng nhấp nhô, hover nhấc lên, nhấn lún xuống ----
    const bob = Math.sin(this.time * 2 + this.phase) * 2.4;
    const floatY = bob - 3 * hv + 3 * pr + (1 - e) * 12;
    this.body.position.set(c, c + floatY);
    this.body.scale.set(
        e * this.pop.x * (1 + 0.1 * hv) * (1 + 0.08 * pr),
        e * this.pop.x * (1 + 0.1 * hv) * (1 - 0.1 * pr),
    );
    this.body.rotation = this.wiggle.x * 0.25 + Math.sin(this.time * 1.3 + this.phase) * 0.03;
    this.body.alpha = clamp01(e * 2);

    // ---- vầng sáng bám theo hình ảnh: nhịp thở, loé lên khi gây chú ý / bấm ----
    const breathe = 0.5 + 0.5 * Math.sin(this.time * 2.6 + this.phase);
    let glowAlpha = 0.3 + 0.2 * breathe + 0.2 * hv;
    let glowScale = 1.1 + 0.04 * breathe;

    if (this.pingT >= 0) {
      this.pingT += dt / 0.95;
      if (this.pingT >= 1) {
        this.pingT = -1;
      } else {
        const t = 1 - Math.pow(1 - this.pingT, 2);
        glowScale += 0.4 * t;
        glowAlpha += 0.6 * (1 - t);
      }
    }

    if (this.tapT >= 0) {
      this.tapT += dt / 0.5;
      if (this.tapT >= 1) {
        this.tapT = -1;
      } else {
        const t = 1 - Math.pow(1 - this.tapT, 3);
        glowScale += 0.25 * t;
        glowAlpha += 0.5 * (1 - t);
      }
    }

    if (this.glow) {
      this.glow.alpha = clamp01(glowAlpha);
      this.glow.scale.set(this.artScale * glowScale);
    }

    // ---- bóng đổ dưới chân: nhỏ lại khi ảnh nhấc cao ----
    const lift = clamp01((-floatY + 4) / 10);
    this.shadow
        .clear()
        .ellipse(c, SIZE + 4, 16 * (1 - 0.25 * lift) * e, 3.6 * e)
        .fill({ color: 0x000000, alpha: 0.2 * (1 - 0.3 * lift) * e });

    // ---- tia lấp lánh góc trên phải ----
    if (this.glintT >= 0) {
      this.glintT += dt / 0.7;
      if (this.glintT >= 1) {
        this.glintT = -1;
        this.glint.visible = false;
      } else {
        this.glint.visible = true;
        this.glint.position.set(c + c * 0.62, c - c * 0.62 + floatY);
        this.glint.scale.set(Math.sin(this.glintT * Math.PI) * 1.15);
        this.glint.rotation = this.glintT * Math.PI * 0.6;
      }
    }

    this.alpha = clamp01(e * 1.6);
  }
}

// ==============================================================
// KHỐI SỰ KIỆN NỔI
// ==============================================================

/** Nút mail vĩnh viễn phía trên, các sự kiện còn hạn cuộn độc lập bên dưới. */
export class FloatingEvents extends Container {
  private readonly list = new Container();
  private readonly viewport = new Container();
  private readonly listMask = new Graphics();
  private readonly scrollTrack = new Graphics();
  private readonly scrollHints = new Graphics();
  private readonly fxLayer = new Container();
  private readonly mail: FloatingButton;
  private readonly visibleCount: number;
  private readonly onOpenEvent: (event: Event) => void;

  private readonly eventButtons = new Map<Event['id'], FloatingButton>();
  private leavingButtons: FloatingButton[] = [];
  private particles: Particle[] = [];

  private scrollY = 0; // vị trí cuộn đang hiển thị (đã làm mượt)
  private scrollTarget = 0; // vị trí cuộn muốn tới
  private maxScroll = 0;
  private pointerStartY: number | null = null;
  private scrollStartY = 0;
  private moved = false;
  private refreshElapsed = 0;
  private thumbTimer = 0;
  private time = 0;

  constructor(options: FloatingEventsOptions) {
    super();
    this.visibleCount = Math.max(1, Math.floor(options.visibleEventCount ?? 3));
    this.onOpenEvent = options.onOpenEvent;

    // Mail: màu cam đỏ, rung mạnh và thường xuyên hơn để dễ nhận thấy
    this.mail = new FloatingButton(
        'Hòm thư',
        MAIL_ASSET,
        COLORS.mail,
        3.4,
        14,
        options.onOpenMail,
        (button) => this.burstAt(button),
    );
    this.mail.startIntro(0);

    this.viewport.position.y = TOP;
    this.viewport.addChild(this.list);
    this.addChild(this.mail, this.viewport, this.listMask, this.scrollTrack, this.scrollHints, this.fxLayer);
    this.viewport.mask = this.listMask;
    this.viewport.eventMode = 'static';
    this.viewport.hitArea = new Rectangle(-MASK_PAD_X, 0, SIZE + MASK_PAD_X * 2, this.viewportHeight);
    this.viewport.on('pointerdown', (event) => {
      this.pointerStartY = event.global.y;
      this.scrollStartY = this.scrollTarget;
      this.moved = false;
    });
    this.viewport.on('globalpointermove', (event) => {
      if (this.pointerStartY === null || this.maxScroll === 0) return;
      const dy = event.global.y - this.pointerStartY;
      if (Math.abs(dy) > 7 && !this.moved) {
        this.moved = true;
        // đang kéo cuộn thì nút không còn ở trạng thái "đang nhấn"
        for (const button of this.eventButtons.values()) button.cancelPress();
      }
      if (this.moved) this.setScroll(this.scrollStartY - dy);
    });
    this.viewport.on('pointerup', this.endDrag, this);
    this.viewport.on('pointerupoutside', this.endDrag, this);
    this.viewport.on('wheel', (event) => {
      if (this.maxScroll === 0) return;
      this.setScroll(this.scrollTarget + event.deltaY);
      event.preventDefault();
    });
    this.refresh(true);
    Ticker.shared.add(this.tick, this);
  }

  private get viewportHeight(): number {
    return this.visibleCount * STEP - (STEP - SIZE);
  }

  private readonly endDrag = (): void => {
    this.pointerStartY = null;
  };

  /**
   * Đồng bộ danh sách với các sự kiện còn hạn.
   * Nút của sự kiện cũ được giữ nguyên (không tạo lại), sự kiện mới nảy ra, sự kiện hết hạn thu nhỏ biến mất.
   */
  refresh(initial = false): void {
    const events = eventService.getActiveEvents();
    const activeIds = new Set(events.map((event) => event.id));

    // sự kiện hết hạn -> thu nhỏ rồi xóa
    for (const [id, button] of this.eventButtons) {
      if (activeIds.has(id)) continue;
      button.leave();
      this.leavingButtons.push(button);
      this.eventButtons.delete(id);
    }

    // sự kiện mới -> tạo nút; sự kiện cũ -> cập nhật vị trí
    events.forEach((event, index) => {
      let button = this.eventButtons.get(event.id);
      if (!button) {
        button = new FloatingButton(
            event.name,
            event.asset,
            COLORS.gold,
            4.6 + (index % 3) * 0.7,
            10,
            () => {
              if (!this.moved && eventService.getActiveEvent(event.id)) this.onOpenEvent(event);
            },
            (b) => this.burstAt(b),
        );
        button.y = index * STEP;
        button.startIntro(initial ? 0.12 + index * 0.09 : 0);
        this.list.addChild(button);
        this.eventButtons.set(event.id, button);
        if (!initial) button.attention(); // sự kiện mới xuất hiện giữa chừng: báo hiệu ngay
      }
      button.targetY = index * STEP;
    });

    this.listMask
        .clear()
        .rect(-MASK_PAD_X, TOP - MASK_PAD_Y, SIZE + MASK_PAD_X * 2, this.viewportHeight + MASK_PAD_Y * 2)
        .fill(0xffffff);
    this.viewport.hitArea = new Rectangle(-MASK_PAD_X, 0, SIZE + MASK_PAD_X * 2, this.viewportHeight);

    this.maxScroll = Math.max(0, events.length * STEP - (STEP - SIZE) - this.viewportHeight);
    this.setScroll(Math.min(this.scrollTarget, this.maxScroll));
  }

  private setScroll(y: number): void {
    const next = Math.max(0, Math.min(this.maxScroll, y));
    if (next !== this.scrollTarget) this.thumbTimer = 1.2; // hiện thanh cuộn một lúc
    this.scrollTarget = next;
  }

  // ==========================================
  // HIỆU ỨNG
  // ==========================================

  /** Bắn tia sáng từ một nút (toạ độ quy đổi về hệ của FloatingEvents). */
  private burstAt(button: FloatingButton): void {
    const isMail = button === this.mail;
    const x = SIZE / 2;
    const y = isMail ? SIZE / 2 : TOP + button.y - this.scrollY + SIZE / 2;

    for (let i = 0; i < 6; i++) {
      const g = createStar(i % 2 === 0 ? COLORS.gold : COLORS.white, 0.9);
      g.position.set(x, y);
      g.rotation = Math.random() * Math.PI * 2;
      this.fxLayer.addChild(g);

      const angle = Math.random() * Math.PI * 2;
      const speed = 70 + Math.random() * 90;
      this.particles.push({
        g,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 20,
        vr: (Math.random() - 0.5) * 6,
        age: 0,
        life: 0.5 + Math.random() * 0.35,
      });
    }
  }

  private updateScrollVisuals(dt: number): void {
    // cuộn mượt tới vị trí đích
    this.scrollY += (this.scrollTarget - this.scrollY) * (1 - Math.exp(-dt * 16));
    if (Math.abs(this.scrollTarget - this.scrollY) < 0.05) this.scrollY = this.scrollTarget;
    this.list.y = -this.scrollY;

    // thanh cuộn: hiện khi đang cuộn, mờ dần khi đứng yên
    this.thumbTimer = Math.max(0, this.thumbTimer - dt);
    this.scrollTrack.clear();
    if (this.maxScroll > 0 && this.thumbTimer > 0) {
      const alpha = clamp01(this.thumbTimer / 0.4);
      const thumbHeight = Math.max(22, this.viewportHeight ** 2 / (this.viewportHeight + this.maxScroll));
      const thumbY = TOP + this.scrollY / this.maxScroll * (this.viewportHeight - thumbHeight);
      this.scrollTrack
          .roundRect(SIZE + 5, thumbY, 6, thumbHeight, 3)
          .fill({ color: COLORS.scroll, alpha: 0.95 * alpha })
          .roundRect(SIZE + 5, thumbY, 6, thumbHeight, 3)
          .stroke({ color: COLORS.outline, width: 1.5, alpha: 0.8 * alpha });
    }

    // mũi tên gợi ý "còn nội dung phía trên / dưới", nhún nhẹ
    this.scrollHints.clear();
    if (this.maxScroll > 0) {
      const bounce = Math.sin(this.time * 5) * 2;
      const cx = SIZE / 2;
      const drawArrow = (y: number, dir: 1 | -1, alpha: number) => {
        if (alpha <= 0.01) return;
        this.scrollHints
            .poly([cx - 7, y - dir * 3, cx + 7, y - dir * 3, cx, y + dir * 5])
            .fill({ color: COLORS.white, alpha })
            .poly([cx - 7, y - dir * 3, cx + 7, y - dir * 3, cx, y + dir * 5])
            .stroke({ color: COLORS.outline, width: 1.5, alpha });
      };
      // mũi tên trên (chỉ lên) và dưới (chỉ xuống)
      drawArrow(TOP - 4 - bounce, -1, clamp01(this.scrollY / 14));
      drawArrow(TOP + this.viewportHeight + 5 + bounce, 1, clamp01((this.maxScroll - this.scrollY) / 14));
    }
  }

  private updateParticles(dt: number): void {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.age += dt;
      if (p.age >= p.life) {
        p.g.destroy();
        this.particles.splice(i, 1);
        continue;
      }
      p.vy += 140 * dt;
      p.vx *= 1 - 1.4 * dt;
      p.g.x += p.vx * dt;
      p.g.y += p.vy * dt;
      p.g.rotation += p.vr * dt;

      const t = p.age / p.life;
      p.g.alpha = 1 - t * t;
      p.g.scale.set(1 + Math.sin(t * Math.PI) * 0.5);
    }
  }

  private tick(ticker: Ticker): void {
    const dt = Math.min(ticker.deltaMS / 1000, 1 / 30);
    this.time += dt;

    this.refreshElapsed += ticker.deltaMS;
    if (this.refreshElapsed >= 10_000) {
      this.refreshElapsed = 0;
      this.refresh();
    }

    this.mail.update(dt);
    for (const button of this.eventButtons.values()) button.update(dt);

    for (let i = this.leavingButtons.length - 1; i >= 0; i--) {
      const button = this.leavingButtons[i];
      button.update(dt);
      if (button.isGone) {
        this.list.removeChild(button);
        button.destroy({ children: true });
        this.leavingButtons.splice(i, 1);
      }
    }

    this.updateScrollVisuals(dt);
    this.updateParticles(dt);
  }

  override destroy(options?: Parameters<Container['destroy']>[0]): void {
    Ticker.shared.remove(this.tick, this);
    super.destroy(options ?? { children: true });
  }
}
