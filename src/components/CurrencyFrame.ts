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
} from "pixi.js";

export type CurrencyType = "coin" | "diamond";

export interface CurrencyFrameOptions {
    type: CurrencyType;
    value?: number;
    onPlus?: () => void;
}

const THEMES = {
    coin: {
        light: 0xfff3b0,
        main: 0xe0a526,
        dark: 0x8a5a00,
        max: 999_999,
        asset: "/assets/ui/coin.png",
    },
    diamond: {
        light: 0xd6f6ff,
        main: 0x3fb8ea,
        dark: 0x0c4f80,
        max: 99_999,
        asset: "/assets/ui/diamond.png",
    },
} as const;

// =============================================
// CẤU HÌNH GIAO DIỆN
// =============================================

const UI = {
    width: 120,
    height: 30,

    // Icon PNG
    iconSize: 38,
    iconX: 13,
    iconY: 15,

    // Số dư
    fontFamily: "Arial, sans-serif",
    fontSize: 15,
    fontWeight: "800" as const,
    valueRightX: 87,
    valueY: 15,

    // Nút cộng
    plusX: 105,
    plusY: 15,
    plusRadius: 12,
};

// =============================================
// CẤU HÌNH HIỆU ỨNG - chỉnh / tắt tại đây
// =============================================

export const CURRENCY_FX = {
    /** Số chạy dần tới giá trị mới (tốc độ càng lớn càng nhanh) */
    countSpeed: 9,
    /** Chữ "+100" / "-50" bay lên khi số dư thay đổi */
    floatingText: true,
    /** Tia sáng bắn ra khi nhận thêm */
    sparkles: true,
    /** Khoảng thời gian (giây) giữa các lần vệt sáng quét ngang khung. 0 = tắt */
    idleShineEvery: 4.5,
    /** Vòng sáng định kỳ quanh nút + để gợi ý bấm. 0 = tắt */
    plusPulseEvery: 3.4,
};

const FLASH = {
    gain: 0x8dff85,
    spend: 0xff6b5a,
    max: 0xffd24a,
};

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
        private readonly k = 220,
        private readonly d = 14
    ) {
        this.x = value;
        this.target = value;
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

function createSparkle(color: number): Graphics {
    return new Graphics()
        .poly([0, -6, 1.6, -1.6, 6, 0, 1.6, 1.6, 0, 6, -1.6, 1.6, -6, 0, -1.6, -1.6])
        .fill(color)
        .poly([0, -3, 0.8, -0.8, 3, 0, 0.8, 0.8, 0, 3, -0.8, 0.8, -3, 0, -0.8, -0.8])
        .fill(0xffffff);
}

interface Particle {
    g: Graphics;
    vx: number;
    vy: number;
    vr: number;
    age: number;
    life: number;
}

interface FloatText {
    t: Text;
    age: number;
    life: number;
}

interface Ripple {
    g: Graphics;
    x: number;
    y: number;
    radius: number;
    color: number;
    age: number;
}

// ==============================================================
// COMPONENT
// ==============================================================

export class CurrencyFrame extends Container {
    private readonly type: CurrencyType;
    private readonly onPlus?: () => void;

    private value: number; // giá trị thật
    private display: number; // giá trị đang hiển thị (chạy dần tới value)
    private shownText = "";

    // lớp hiển thị
    private readonly root = new Container(); // scale / rung quanh tâm khung
    private readonly glow = new Graphics();
    private border!: Graphics;
    private valueText!: Text;
    private readonly shineClip = new Container();
    private readonly shineMask = new Graphics();
    private readonly shine = new Graphics();
    private readonly iconHolder = new Container();
    private readonly plus = new Container();
    private readonly plusRing = new Graphics();
    private readonly plusLabel: Text;
    private readonly fxLayer = new Container(); // chữ bay, tia sáng, sóng lan (không bị scale)

    // lò xo
    private readonly frameHover = new Spring(0, 260, 22);
    private readonly framePulse = new Spring(0, 260, 11);
    private readonly valuePop = new Spring(0, 280, 11);
    private readonly iconPop = new Spring(0, 240, 10);
    private readonly plusHover = new Spring(0, 280, 22);
    private readonly plusPress = new Spring(0, 340, 22);
    private readonly plusPop = new Spring(0, 260, 10);
    private readonly plusSpin = new Spring(0, 200, 9);

    // trạng thái hiệu ứng
    private flash = 0;
    private flashColor: number = FLASH.gain;
    private shakeLeft = 0;
    private flipT = -1;
    private shineT = -1;
    private shineTimer = 0;
    private plusPulseTimer = 0;
    private time = 0;

    private particles: Particle[] = [];
    private floats: FloatText[] = [];
    private ripples: Ripple[] = [];

    constructor(options: CurrencyFrameOptions) {
        super();

        this.type = options.type;
        this.onPlus = options.onPlus;

        this.value = this.clamp(options.value ?? 0);
        this.display = this.value;

        this.plusLabel = new Text({
            text: "+",
            style: new TextStyle({
                fontFamily: "Arial",
                fontSize: 21,
                fontWeight: "bold",
                fill: 0xffffff,
            }),
        });

        this.renderFrame();

        void this.loadIcon().catch((error: unknown) => {
            console.error(`Không tải được icon ${this.type}:`, error);
        });

        Ticker.shared.add(this.tick, this);
    }

    private get theme() {
        return THEMES[this.type];
    }

    private clamp(value: number): number {
        if (!Number.isFinite(value)) return 0;
        return Math.max(0, Math.min(this.theme.max, Math.round(value)));
    }

    // ==========================================
    // DỰNG GIAO DIỆN
    // ==========================================

    private renderFrame(): void {
        const theme = this.theme;

        // root: tâm scale/rung nằm giữa khung, nhưng vị trí của component vẫn tính theo góc trên-trái
        this.root.pivot.set(UI.width / 2, UI.height / 2);
        this.root.position.set(UI.width / 2, UI.height / 2);
        this.root.hitArea = new Rectangle(0, 0, UI.width, UI.height);
        this.root.eventMode = "static";
        this.root.on("pointerenter", () => {
            this.frameHover.target = 1;
            this.shineT = 0;
        });
        this.root.on("pointerleave", () => (this.frameHover.target = 0));

        // Khung chính
        this.border = new Graphics()
            .roundRect(0, 0, UI.width, UI.height, 15)
            .fill(theme.dark)
            .roundRect(2, 2, UI.width - 4, UI.height - 4, 13)
            .fill(theme.main)
            .roundRect(4, 4, UI.width - 8, UI.height - 8, 11)
            .fill(0x11152c);

        // Ánh sáng bên trong
        const highlight = new Graphics()
            .roundRect(5, 5, UI.width - 10, 9, 5)
            .fill({ color: 0x394269, alpha: 0.4 });

        // Vệt sáng quét: bị cắt gọn trong lòng khung
        this.shineMask.roundRect(4, 4, UI.width - 8, UI.height - 8, 11).fill(0xffffff);
        this.shineClip.addChild(this.shine);
        this.shineClip.mask = this.shineMask;

        // Giá trị tiền: fill trắng + tint để đổi màu mượt mà không phải vẽ lại chữ
        this.valueText = new Text({
            text: "",
            style: new TextStyle({
                fontFamily: UI.fontFamily,
                fontSize: UI.fontSize,
                fontWeight: UI.fontWeight,
                fill: 0xffffff,
            }),
        });
        this.valueText.anchor.set(1, 0.5);
        this.valueText.position.set(UI.valueRightX, UI.valueY);
        this.valueText.tint = theme.light;

        // Nút cộng
        const plusBackground = new Graphics()
            .circle(0, 0, UI.plusRadius)
            .fill(0x145a1e)
            .circle(0, 0, 10.5)
            .fill(0x39b54a)
            .circle(-2.5, -3.5, 4)
            .fill({ color: 0xffffff, alpha: 0.22 });

        this.plusLabel.anchor.set(0.5);
        this.plusLabel.position.set(0, -1);

        this.plus.addChild(this.plusRing, plusBackground, this.plusLabel);
        this.plus.position.set(UI.plusX, UI.plusY);
        this.plus.eventMode = "static";
        this.plus.cursor = "pointer";
        this.plus.hitArea = new Rectangle(
            -UI.plusRadius - 2,
            -UI.plusRadius - 2,
            (UI.plusRadius + 2) * 2,
            (UI.plusRadius + 2) * 2
        );

        this.plus.on("pointerdown", () => (this.plusPress.target = 1));
        this.plus.on("pointerup", () => (this.plusPress.target = 0));
        this.plus.on("pointerupoutside", () => (this.plusPress.target = 0));
        this.plus.on("pointerover", () => (this.plusHover.target = 1));
        this.plus.on("pointerout", () => {
            this.plusHover.target = 0;
            this.plusPress.target = 0;
        });
        this.plus.on("pointertap", () => {
            this.plusPop.v += 6;
            this.plusSpin.v += 14; // dấu + xoay lắc
            this.addRipple(UI.plusX, UI.plusY, 24, 0x7dff7a);
            this.onPlus?.();
        });

        // Icon: nằm trong holder để scale / xoay / lật mà không ảnh hưởng kích thước gốc của sprite
        this.iconHolder.position.set(UI.iconX, UI.iconY);
        this.iconHolder.eventMode = "static";
        this.iconHolder.cursor = "pointer";
        this.iconHolder.hitArea = new Rectangle(
            -UI.iconSize / 2,
            -UI.iconSize / 2,
            UI.iconSize,
            UI.iconSize
        );
        this.iconHolder.on("pointertap", (e: FederatedPointerEvent) => {
            e.stopPropagation();
            this.playIcon();
        });

        this.root.addChild(
            this.glow,
            this.border,
            highlight,
            this.shineClip,
            this.shineMask,
            this.valueText,
            this.plus,
            this.iconHolder // icon nằm trên cùng, như bản gốc
        );

        this.addChild(this.root, this.fxLayer);

        this.renderText(true);
    }

    // =============================================
    // TẢI ẢNH ICON PNG
    // =============================================

    private async loadIcon(): Promise<void> {
        const texture = await Assets.load<Texture>(this.theme.asset);

        if (this.destroyed) return;

        const sprite = new Sprite(texture);
        sprite.anchor.set(0.5);

        // Giữ tỷ lệ ảnh
        const scale = UI.iconSize / Math.max(texture.width, texture.height);
        sprite.scale.set(scale);

        this.iconHolder.addChild(sprite);
    }

    // ==========================================
    // PUBLIC
    // ==========================================

    /**
     * Đặt số dư. Mặc định có animation (số chạy dần, hiệu ứng nhận / tiêu).
     * Truyền animate = false để đặt ngay lập tức (ví dụ khi load game).
     */
    public setValue(value: number, animate = true): void {
        const requested = Number.isFinite(value) ? Math.round(value) : 0;
        const next = this.clamp(value);
        const prev = this.value;
        const overflow = requested > this.theme.max;

        this.value = next;

        if (!animate) {
            this.display = next;
            this.renderText(true);
            return;
        }

        const delta = next - prev;
        if (delta > 0) this.onGain(delta);
        else if (delta < 0) this.onSpend(-delta);
        if (overflow) this.onOverflow();
    }

    public addValue(amount: number, animate = true): void {
        this.setValue(this.value + amount, animate);
    }

    public getValue(): number {
        return this.value;
    }

    public getMax(): number {
        return this.theme.max;
    }

    public override destroy(options?: Parameters<Container["destroy"]>[0]): void {
        Ticker.shared.remove(this.tick, this);
        super.destroy(options ?? { children: true });
    }

    // ==========================================
    // HIỆU ỨNG THEO SỰ KIỆN
    // ==========================================

    private onGain(delta: number): void {
        this.flash = 1;
        this.flashColor = FLASH.gain;
        this.valuePop.v += 7;
        this.framePulse.v += 3;
        this.iconPop.v += 8;
        this.flipT = 0;
        this.shineT = 0;

        this.spawnFloat(`+${delta.toLocaleString("vi-VN")}`, FLASH.gain);

        if (CURRENCY_FX.sparkles) {
            const count = Math.min(10, 4 + Math.floor(Math.log10(delta + 1) * 2));
            this.burstSparkles(UI.iconX, UI.iconY, count);
            this.burstSparkles(UI.valueRightX - 14, UI.valueY, 3);
        }
    }

    private onSpend(delta: number): void {
        this.flash = 1;
        this.flashColor = FLASH.spend;
        this.valuePop.v -= 5;
        this.framePulse.v -= 2;
        this.iconPop.v -= 3;

        this.spawnFloat(`-${delta.toLocaleString("vi-VN")}`, FLASH.spend);
    }

    private onOverflow(): void {
        this.flash = 1;
        this.flashColor = FLASH.max;
        this.shakeLeft = 1;
        this.framePulse.v += 2;
        this.spawnFloat("MAX", FLASH.max);
    }

    /** Bấm vào icon: đồng xu lật / kim cương lắc + tia sáng */
    private playIcon(): void {
        this.flipT = 0;
        this.iconPop.v += 7;
        this.shineT = 0;
        if (CURRENCY_FX.sparkles) this.burstSparkles(UI.iconX, UI.iconY, 5);
    }

    private spawnFloat(message: string, color: number): void {
        if (!CURRENCY_FX.floatingText) return;

        const t = new Text({
            text: message,
            style: new TextStyle({
                fontFamily: UI.fontFamily,
                fontSize: 16,
                fontWeight: "800",
                fill: color,
                stroke: { color: 0x11152c, width: 4, join: "round" },
            }),
        });
        t.anchor.set(1, 1);
        t.position.set(UI.valueRightX + 18, -2);
        this.fxLayer.addChild(t);
        this.floats.push({ t, age: 0, life: 1 });
    }

    private burstSparkles(x: number, y: number, count: number): void {
        for (let i = 0; i < count; i++) {
            const g = createSparkle(i % 2 === 0 ? this.theme.light : this.theme.main);
            g.position.set(x, y);
            g.rotation = Math.random() * Math.PI * 2;
            this.fxLayer.addChild(g);

            const angle = Math.random() * Math.PI * 2;
            const speed = 40 + Math.random() * 70;
            this.particles.push({
                g,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed - 25,
                vr: (Math.random() - 0.5) * 6,
                age: 0,
                life: 0.5 + Math.random() * 0.35,
            });
        }
    }

    private addRipple(x: number, y: number, radius: number, color: number): void {
        const g = new Graphics();
        this.fxLayer.addChild(g);
        this.ripples.push({ g, x, y, radius, color, age: 0 });
    }

    // ==========================================
    // HIỂN THỊ SỐ
    // ==========================================

    private renderText(force = false): void {
        const text = Math.round(this.display).toLocaleString("vi-VN");
        if (force || text !== this.shownText) {
            this.shownText = text;
            this.valueText.text = text;
        }
    }

    // ==========================================
    // CẬP NHẬT MỖI FRAME
    // ==========================================

    private tick(ticker: Ticker): void {
        const dt = Math.min(ticker.deltaMS / 1000, 1 / 30);
        this.time += dt;

        const theme = this.theme;

        this.frameHover.step(dt);
        this.framePulse.step(dt);
        this.valuePop.step(dt);
        this.iconPop.step(dt);
        this.plusHover.step(dt);
        this.plusPress.step(dt);
        this.plusPop.step(dt);
        this.plusSpin.step(dt);

        this.flash = Math.max(0, this.flash - dt / 0.7);

        // Số chạy dần tới giá trị thật
        if (this.display !== this.value) {
            const diff = this.value - this.display;
            if (Math.abs(diff) < 0.5) {
                this.display = this.value;
            } else {
                this.display += diff * (1 - Math.exp(-dt * CURRENCY_FX.countSpeed));
            }
            this.renderText();
        }

        const isMax = this.value >= theme.max && this.display >= this.value;

        // ---- Khung: nảy khi đổi, nhô nhẹ khi hover, rung khi vượt giới hạn ----
        let shakeX = 0;
        if (this.shakeLeft > 0) {
            this.shakeLeft = Math.max(0, this.shakeLeft - dt / 0.45);
            shakeX = Math.sin((1 - this.shakeLeft) * 48) * 5 * this.shakeLeft;
        }
        this.root.position.set(UI.width / 2 + shakeX, UI.height / 2);
        this.root.scale.set(1 + 0.03 * this.frameHover.x + 0.04 * this.framePulse.x);

        // ---- Vầng sáng viền: nháy màu khi nhận/tiêu, nhịp đập khi đạt MAX, sáng nhẹ khi hover ----
        const glowAlpha =
            this.flash * 0.65 +
            (isMax ? 0.22 + 0.12 * Math.sin(this.time * 4) : 0) +
            this.frameHover.x * 0.2;
        this.glow.clear();
        if (glowAlpha > 0.01) {
            const color = this.flash > 0.02 ? this.flashColor : isMax ? FLASH.max : theme.main;
            this.glow
                .roundRect(-3, -3, UI.width + 6, UI.height + 6, 18)
                .stroke({ color, width: 6, alpha: Math.min(1, glowAlpha) * 0.45 })
                .roundRect(-1.5, -1.5, UI.width + 3, UI.height + 3, 16.5)
                .stroke({ color, width: 2, alpha: Math.min(1, glowAlpha) });
        }

        // ---- Chữ số dư: pop khi đổi, đổi màu theo flash, trắng khi MAX ----
        this.valueText.scale.set(1 + 0.3 * this.valuePop.x);
        const baseColor = isMax ? 0xffffff : theme.light;
        this.valueText.tint = lerpColor(baseColor, this.flashColor, this.flash);

        // ---- Icon: nhún nhẹ, nảy khi đổi, lật (coin) / lắc (diamond) ----
        let flipScaleX = 1;
        let wobble = 0;
        if (this.flipT >= 0) {
            this.flipT += dt / 0.6;
            if (this.flipT >= 1) {
                this.flipT = -1;
            } else if (this.type === "coin") {
                flipScaleX = Math.cos(this.flipT * Math.PI * 2);
            } else {
                wobble = Math.sin(this.flipT * Math.PI * 4) * 0.5 * (1 - this.flipT);
            }
        }
        const iconScale = 1 + 0.3 * this.iconPop.x + 0.03 * Math.sin(this.time * 3);
        this.iconHolder.scale.set(iconScale * flipScaleX, iconScale);
        this.iconHolder.rotation = wobble + Math.sin(this.time * 2) * 0.05;
        this.iconHolder.position.y = UI.iconY + Math.sin(this.time * 2.5) * 0.8;

        // ---- Nút +: hover to ra, nhấn lún, click nảy + xoay, vòng sáng định kỳ ----
        this.plus.scale.set(
            1 + 0.14 * this.plusHover.x - 0.14 * this.plusPress.x + 0.3 * this.plusPop.x
        );
        this.plusLabel.rotation = this.plusSpin.x * 0.5;

        this.plusRing.clear();
        if (CURRENCY_FX.plusPulseEvery > 0) {
            this.plusPulseTimer += dt;
            const t = (this.plusPulseTimer % CURRENCY_FX.plusPulseEvery) / 1.1;
            if (t < 1) {
                this.plusRing
                    .circle(0, 0, UI.plusRadius * (1 + 0.8 * t))
                    .stroke({ color: 0x7dff7a, width: 2, alpha: 0.5 * (1 - t) });
            }
        }

        // ---- Vệt sáng quét ngang khung (định kỳ, khi hover, khi nhận thêm) ----
        if (this.shineT < 0 && CURRENCY_FX.idleShineEvery > 0) {
            this.shineTimer += dt;
            if (this.shineTimer > CURRENCY_FX.idleShineEvery) {
                this.shineTimer = 0;
                this.shineT = 0;
            }
        }
        this.shine.clear();
        if (this.shineT >= 0) {
            this.shineT += dt / 0.7;
            if (this.shineT >= 1) {
                this.shineT = -1;
                this.shineTimer = 0;
            } else {
                const e = 1 - Math.pow(1 - this.shineT, 2);
                const x = -30 + (UI.width + 50) * e;
                this.shine
                    .poly([x + 10, 4, x + 24, 4, x + 14, UI.height - 4, x, UI.height - 4])
                    .fill({ color: 0xffffff, alpha: 0.28 })
                    .poly([x + 28, 4, x + 33, 4, x + 23, UI.height - 4, x + 18, UI.height - 4])
                    .fill({ color: 0xffffff, alpha: 0.18 });
            }
        }

        this.updateFx(dt);
    }

    private updateFx(dt: number): void {
        // chữ "+N" / "-N" bay lên và mờ dần
        for (let i = this.floats.length - 1; i >= 0; i--) {
            const f = this.floats[i];
            f.age += dt;
            const t = f.age / f.life;
            if (t >= 1) {
                f.t.destroy();
                this.floats.splice(i, 1);
                continue;
            }
            const rise = 1 - Math.pow(1 - t, 3);
            f.t.y = -2 - rise * 22;
            f.t.alpha = t < 0.65 ? 1 : 1 - (t - 0.65) / 0.35;
            f.t.scale.set(t < 0.15 ? 0.6 + (t / 0.15) * 0.55 : 1.15 - Math.min(0.15, (t - 0.15) * 0.3));
        }

        // tia sáng
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.age += dt;
            if (p.age >= p.life) {
                p.g.destroy();
                this.particles.splice(i, 1);
                continue;
            }
            p.vy += 120 * dt;
            p.vx *= 1 - 1.5 * dt;
            p.g.x += p.vx * dt;
            p.g.y += p.vy * dt;
            p.g.rotation += p.vr * dt;

            const t = p.age / p.life;
            p.g.alpha = 1 - t * t;
            p.g.scale.set(1 + Math.sin(t * Math.PI) * 0.5);
        }

        // sóng lan
        for (let i = this.ripples.length - 1; i >= 0; i--) {
            const r = this.ripples[i];
            r.age += dt;
            const t = r.age / 0.5;
            if (t >= 1) {
                r.g.destroy();
                this.ripples.splice(i, 1);
                continue;
            }
            const eased = 1 - Math.pow(1 - t, 3);
            r.g.clear()
                .circle(r.x, r.y, r.radius * eased)
                .fill({ color: r.color, alpha: 0.16 * (1 - t) })
                .stroke({ color: r.color, width: 2.5 * (1 - t) + 0.5, alpha: 0.85 * (1 - t) });
        }
    }
}