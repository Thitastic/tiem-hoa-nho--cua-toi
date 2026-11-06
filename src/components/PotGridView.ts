import {
    Assets,
    Container,
    Graphics,
    Rectangle,
    Sprite,
    Text,
    TextStyle,
    Texture,
    Ticker,
} from "pixi.js";
import { getPotById } from "../data/pots";
import type { PotGrid } from "../models/PotGrid";

export interface PotGridViewOptions {
    plot: PotGrid;
    size: number;
    onClick?: (plotId: number) => void;
    /** Trễ (giây) trước khi ô xuất hiện, dùng để các ô hiện lần lượt. Mặc định 0. */
    introDelay?: number;
    /** Bật hiệu ứng xuất hiện (ô nảy ra, mầm cây mọc lên). Mặc định true. */
    animateIn?: boolean;
}

// ==============================================================
// TIỆN ÍCH
// ==============================================================

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

/** Lò xo: cho cảm giác nảy / đàn hồi */
class Spring {
    public x: number;
    public v = 0;
    public target: number;

    constructor(
        value: number,
        private readonly k = 200,
        private readonly d = 14
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

function createLeaf(color: number): Graphics {
    const leaf = new Graphics()
        .moveTo(0, 0)
        .quadraticCurveTo(6, -6, 14, 0)
        .quadraticCurveTo(6, 6, 0, 0)
        .fill(color)
        .moveTo(1, 0)
        .lineTo(11, 0)
        .stroke({ color: 0x2f6b34, width: 1, alpha: 0.7 });
    leaf.pivot.set(7, 0);
    return leaf;
}

function createStar(): Graphics {
    return new Graphics()
        .poly([0, -7, 1.8, -1.8, 7, 0, 1.8, 1.8, 0, 7, -1.8, 1.8, -7, 0, -1.8, -1.8])
        .fill(0xffd24a)
        .poly([0, -3.5, 0.9, -0.9, 3.5, 0, 0.9, 0.9, 0, 3.5, -0.9, 0.9, -3.5, 0, -0.9, -0.9])
        .fill(0xffffff);
}

function createDot(color: number, radius: number): Graphics {
    return new Graphics().circle(0, 0, radius).fill(color);
}

interface Particle {
    g: Graphics;
    vx: number;
    vy: number;
    vr: number;
    gravity: number;
    age: number;
    life: number;
    twinkle: boolean;
}

interface Ripple {
    g: Graphics;
    cx: number;
    cy: number;
    radius: number;
    flat: number; // 1 = tròn, <1 = elip nằm trên mặt đất
    color: number;
    age: number;
}

// ==============================================================
// VIEW
// ==============================================================

/** Một ô trồng cây: chỉ lo phần hiển thị và tương tác, không thay đổi dữ liệu game. */
export class PotGridView extends Container {
    // lớp hiển thị
    private readonly shadow = new Graphics(); // bóng + vầng sáng dưới chậu
    private readonly body = new Container(); // chậu / khóa / nút +, scale quanh đáy chậu
    private readonly fxLayer = new Container(); // sóng lan + hạt bay

    // phần tử riêng để animate
    private sprout: Container | null = null;
    private lock: Container | null = null;
    private cta: Container | null = null;
    private readonly ctaRing = new Graphics();

    // lò xo trạng thái
    private readonly intro = new Spring(0, 170, 11);
    private readonly hover = new Spring(0, 260, 22);
    private readonly press = new Spring(0, 340, 22);
    private readonly squash = new Spring(0, 280, 10);
    private readonly wobble = new Spring(0, 220, 8);
    private readonly grow = new Spring(0, 150, 9);
    private readonly sproutWiggle = new Spring(0, 200, 6);
    private readonly spin = new Spring(0, 160, 9);

    private baseY: number;
    private time = 0;
    private elapsed = 0;
    private shakeLeft = 0;
    private readonly phase = Math.random() * Math.PI * 2;
    private readonly introDelay: number;
    private readonly animateIn: boolean;

    private ripples: Ripple[] = [];
    private particles: Particle[] = [];

    constructor(private readonly options: PotGridViewOptions) {
        super();

        this.introDelay = options.introDelay ?? 0;
        this.animateIn = options.animateIn ?? true;
        this.baseY = options.size * 0.86;

        this.addChild(this.shadow, this.body, this.fxLayer);
        this.render();

        if (!this.animateIn) {
            this.intro.snap(1);
            this.grow.snap(1);
        }

        this.updateVisuals(0);
        Ticker.shared.add(this.tick, this);
    }

    // ==========================================
    // PUBLIC
    // ==========================================

    /** Phát hiệu ứng mầm cây mọc lên (gọi khi vừa trồng cây). */
    public playGrow(): void {
        if (!this.sprout) return;
        this.grow.snap(0);
        this.grow.target = 1;
        this.squash.v += 4;
        this.burstLeaves(this.options.size / 2, this.options.size / 2 - this.options.size * 0.28, 6);
    }

    /** Rung báo "không thể thao tác" (ví dụ ô khóa hoặc thiếu tài nguyên). */
    public playDenied(): void {
        this.shakeLeft = 1;
        this.addRipple(this.options.size / 2, this.options.size / 2, this.options.size * 0.32, 1, 0xff6b5a);
    }

    public override destroy(options?: Parameters<Container["destroy"]>[0]): void {
        Ticker.shared.remove(this.tick, this);
        super.destroy(options ?? { children: true });
    }

    // ==========================================
    // DỰNG GIAO DIỆN (giữ nguyên bố cục gốc)
    // ==========================================

    private makeLabel(value: string, size: number, color: number): Text {
        const label = new Text({
            text: value,
            style: new TextStyle({
                fontFamily: "Arial, sans-serif",
                fontWeight: "bold",
                fontSize: size,
                fill: color,
                align: "center",
            }),
        });
        label.anchor.set(0.5);
        label.position.set(this.options.size / 2, this.options.size / 2);
        return label;
    }

    private render(): void {
        const { plot, size, onClick } = this.options;
        const center = size / 2;

        if (!plot.unlock) {
            // Ô khóa chỉ có biểu tượng khóa tròn, không có khung vuông.
            const lock = new Container();
            lock.pivot.set(center, center);
            lock.position.set(center, center);
            lock.addChild(
                new Graphics()
                    .circle(center, center, size * 0.26)
                    .fill({ color: 0x24332b, alpha: 0.6 }),
                this.makeLabel("🔒", Math.max(18, size * 0.25), 0xffffff)
            );
            this.lock = lock;
            this.body.addChild(lock);
        } else if (plot.potId !== null) {
            this.renderPot(plot.potId, plot.flowerVariantId !== null);
        } else {
            // CTA hình tròn cho ô trống.
            const cta = new Container();
            cta.pivot.set(center, center);
            cta.position.set(center, center);
            cta.addChild(
                new Graphics()
                    .circle(center, center, size * 0.23)
                    .fill({ color: 0xfff5df, alpha: 0.92 })
                    .circle(center, center, size * 0.23)
                    .stroke({ color: 0x477f58, width: 2 }),
                this.makeLabel("+", Math.max(18, size * 0.36), 0x315f45)
            );
            this.cta = cta;
            this.body.addChild(this.ctaRing, cta);
        }

        const interactive = plot.unlock;
        this.eventMode = "static";
        this.cursor = interactive ? "pointer" : "default";
        this.hitArea = new Rectangle(0, 0, size, size);

        this.on("pointerdown", () => {
            if (interactive) this.press.target = 1;
        });
        this.on("pointerup", () => (this.press.target = 0));
        this.on("pointerupoutside", () => (this.press.target = 0));
        this.on("pointerover", () => {
            if (interactive) this.hover.target = 1;
        });
        this.on("pointerout", () => {
            this.hover.target = 0;
            this.press.target = 0;
        });
        this.on("pointertap", () => {
            if (interactive) this.playClick();
            else this.playDenied();
            onClick?.(plot.id);
        });
    }

    private renderPot(potId: number, planted: boolean): void {
        const pot = getPotById(potId);
        if (!pot) {
            console.warn(`Không tìm thấy chậu với id ${potId}`);
            return;
        }

        const size = this.options.size;
        void Assets.load<Texture>(pot.assetUrl).then((texture) => {
            if (this.destroyed) return;
            const sprite = new Sprite(texture);
            sprite.anchor.set(0.5);
            sprite.position.set(size / 2, size * 0.55);
            sprite.eventMode = "none";
            // Đổi 0.7 để chỉnh tỷ lệ ảnh chậu trong mỗi ô.
            const maxSize = size * 0.7;
            const scale = Math.min(maxSize / texture.width, maxSize / texture.height);
            sprite.scale.set(scale);
            // Chậu dưới lớp mầm cây (nếu có).
            this.body.addChildAt(sprite, 0);

            // Đặt tâm scale / bóng đúng đáy chậu thật
            this.baseY = size * 0.55 + (texture.height * scale) / 2;
            this.updateVisuals(0);
        }).catch((error: unknown) => {
            console.warn(`Không tải được asset chậu: ${pot.assetUrl}`, error);
        });

        if (planted) {
            const sprout = new Container();
            sprout.pivot.set(size / 2, size / 2);
            sprout.position.set(size / 2, size / 2);
            // Gốc mầm nằm ở (size/2, size/2) như bản gốc, nên pivot đặt đúng gốc để xoay / mọc từ đó.
            const center = size / 2;
            sprout.addChild(
                new Graphics()
                    .moveTo(center, center)
                    .lineTo(center, center - size * 0.3)
                    .stroke({ color: 0x428e50, width: Math.max(2, size * 0.04) })
                    .ellipse(center - size * 0.1, center - size * 0.18, size * 0.13, size * 0.06)
                    .fill(0x63ad66)
                    .ellipse(center + size * 0.1, center - size * 0.24, size * 0.13, size * 0.06)
                    .fill(0x63ad66)
            );
            this.sprout = sprout;
            this.body.addChild(sprout);

            if (this.animateIn) {
                this.grow.snap(0);
                this.grow.target = 1;
            } else {
                this.grow.snap(1);
            }
        }
    }

    // ==========================================
    // HIỆU ỨNG TƯƠNG TÁC
    // ==========================================

    private playClick(): void {
        const { plot, size } = this.options;
        const cx = size / 2;

        if (!plot.unlock) return;

        if (plot.potId === null) {
            // Ô trống: nút + xoay lắc, tỏa sao
            this.spin.v += 14;
            this.squash.v += 4;
            this.addRipple(cx, cx, size * 0.34, 1, 0x477f58);
            this.burstStars(cx, cx, 7);
        } else if (plot.flowerVariantId !== null) {
            // Chậu có cây: cây lắc, lá bay
            this.squash.v += 5;
            this.wobble.v += (Math.random() < 0.5 ? -1 : 1) * 3.5;
            this.sproutWiggle.v += 7;
            this.addRipple(cx, this.baseY, size * 0.36, 0.3, 0xfff5df);
            this.burstLeaves(cx, cx - size * 0.28, 5);
            this.burstStars(cx, cx - size * 0.3, 2);
        } else {
            // Chậu trống: lún xuống, đất văng lên
            this.squash.v += 6.5;
            this.wobble.v += (Math.random() < 0.5 ? -1 : 1) * 3;
            this.addRipple(cx, this.baseY, size * 0.36, 0.3, 0xfff5df);
            this.burstSoil(cx, this.baseY - size * 0.12, 8);
        }
    }

    private addRipple(cx: number, cy: number, radius: number, flat: number, color: number): void {
        const g = new Graphics();
        this.fxLayer.addChild(g);
        this.ripples.push({ g, cx, cy, radius, flat, color, age: 0 });
    }

    private spawn(
        g: Graphics,
        x: number,
        y: number,
        speed: number,
        gravity: number,
        life: number,
        twinkle: boolean,
        spread = 2.1
    ): void {
        g.position.set(x + (Math.random() - 0.5) * this.options.size * 0.2, y);
        g.rotation = Math.random() * Math.PI * 2;
        this.fxLayer.addChild(g);

        const angle = -Math.PI / 2 + (Math.random() - 0.5) * spread;
        this.particles.push({
            g,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            vr: (Math.random() - 0.5) * 9,
            gravity,
            age: 0,
            life,
            twinkle,
        });
    }

    private burstLeaves(x: number, y: number, count: number): void {
        for (let i = 0; i < count; i++) {
            const leaf = createLeaf(Math.random() < 0.5 ? 0x5fa332 : 0x9bd35a);
            this.spawn(leaf, x, y, 110 + Math.random() * 120, 520, 0.75 + Math.random() * 0.4, false);
        }
    }

    private burstStars(x: number, y: number, count: number): void {
        for (let i = 0; i < count; i++) {
            this.spawn(createStar(), x, y, 90 + Math.random() * 110, 140, 0.55 + Math.random() * 0.3, true);
        }
    }

    private burstSoil(x: number, y: number, count: number): void {
        const colors = [0x8a5a2b, 0xb98550, 0x6b4423];
        for (let i = 0; i < count; i++) {
            const dot = createDot(colors[i % colors.length], 2 + Math.random() * 2.2);
            this.spawn(dot, x, y, 100 + Math.random() * 130, 620, 0.5 + Math.random() * 0.3, false, 2.6);
        }
    }

    // ==========================================
    // CẬP NHẬT MỖI FRAME
    // ==========================================

    private tick(ticker: Ticker): void {
        const dt = Math.min(ticker.deltaMS / 1000, 1 / 30);
        this.time += dt;
        this.elapsed += dt;

        // Chờ tới lượt xuất hiện
        if (this.elapsed >= this.introDelay && this.intro.target === 0) {
            this.intro.target = 1;
        }
        if (this.intro.target === 0) return;

        this.updateVisuals(dt);
        this.updateFx(dt);
    }

    private updateVisuals(dt: number): void {
        const { size, plot } = this.options;
        const center = size / 2;

        this.intro.step(dt);
        this.hover.step(dt);
        this.press.step(dt);
        this.squash.step(dt);
        this.wobble.step(dt);
        this.grow.step(dt);
        this.sproutWiggle.step(dt);
        this.spin.step(dt);

        const e = this.intro.x;
        const hv = this.hover.x;
        const pr = this.press.x;
        const sq = this.squash.x;

        // Chậu / nút: scale quanh đáy chậu, nhấc nhẹ khi hover, bóp méo khi nhấn / click
        this.body.pivot.set(center, this.baseY);
        this.body.position.set(center, this.baseY - 3.5 * hv + (1 - e) * -26);
        this.body.scale.set(
            e * (1 + 0.05 * hv + 0.08 * pr + 0.14 * sq),
            e * (1 + 0.05 * hv - 0.1 * pr - 0.14 * sq)
        );
        this.body.rotation = this.wobble.x * 0.14;
        this.body.alpha = clamp01(e * 2);

        // Bóng + vầng sáng dưới chậu
        this.shadow.clear();
        if (plot.unlock && plot.potId !== null) {
            this.shadow
                .ellipse(center, this.baseY, size * 0.27 * (1 - 0.08 * hv) * e, size * 0.06 * e)
                .fill({ color: 0x000000, alpha: 0.2 * (1 - 0.4 * hv) * e });
            if (hv > 0.01) {
                this.shadow
                    .ellipse(center, this.baseY, size * 0.36, size * 0.095)
                    .fill({ color: 0xfff5df, alpha: 0.3 * hv });
            }
        }

        // Mầm cây: mọc lên đàn hồi, đung đưa nhẹ, lắc khi click
        if (this.sprout) {
            const g = Math.max(0, this.grow.x);
            this.sprout.visible = g > 0.01;
            this.sprout.scale.set(g);
            this.sprout.rotation =
                Math.sin(this.time * 1.9 + this.phase) * 0.045 + this.sproutWiggle.x * 0.3;
        }

        // Nút +: thở nhẹ, xoay lắc khi click, vòng sáng lan định kỳ
        if (this.cta) {
            this.cta.scale.set(1 + 0.05 * Math.sin(this.time * 3 + this.phase) + 0.06 * hv);
            this.cta.rotation = this.spin.x;

            const t = (this.time * 0.9 + this.phase) % 1;
            this.ctaRing
                .clear()
                .circle(center, center, size * 0.23 * (1 + 0.55 * t))
                .stroke({ color: 0x477f58, width: 2, alpha: 0.35 * (1 - t) * e });
        }

        // Ô khóa: rung khi bị bấm
        if (this.lock) {
            let shake = 0;
            if (this.shakeLeft > 0) {
                this.shakeLeft = Math.max(0, this.shakeLeft - dt / 0.45);
                shake = Math.sin((1 - this.shakeLeft) * 40) * 0.28 * this.shakeLeft;
            }
            this.lock.rotation = shake;
        } else if (this.shakeLeft > 0) {
            // ô không khóa nhưng bị playDenied(): rung ngang
            this.shakeLeft = Math.max(0, this.shakeLeft - dt / 0.45);
            this.body.x += Math.sin((1 - this.shakeLeft) * 46) * 5 * this.shakeLeft;
        }
    }

    private updateFx(dt: number): void {
        // sóng lan
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
                .ellipse(r.cx, r.cy, rad, rad * r.flat)
                .fill({ color: r.color, alpha: 0.18 * (1 - t) })
                .stroke({ color: r.color, width: 2.5 * (1 - t) + 0.5, alpha: 0.85 * (1 - t) });
        }

        // hạt bay
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
            p.g.scale.set(p.twinkle ? 1 + Math.sin(t * Math.PI) * 0.5 : 1 - t * 0.35);
        }
    }
}