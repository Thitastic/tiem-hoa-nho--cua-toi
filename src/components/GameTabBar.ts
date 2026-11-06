import {
    Container,
    FederatedPointerEvent,
    Graphics,
    Rectangle,
    Text,
    TextStyle,
    Ticker,
} from "pixi.js";

export interface GameTabItem {
    id: string;
    label: string;
}

export interface GameTabBarOptions {
    width: number;
    tabs: GameTabItem[];
    selectedIndex?: number;
    /** Hiệu ứng các ô rơi vào lúc đầu (mặc định: true) */
    intro?: boolean;
    onChange?: (index: number, tab: GameTabItem) => void;
}

// Tên cũ vẫn dùng được nếu code của bạn đang import chúng
export type WoodTabItem = GameTabItem;
export type WoodTabBarOptions = GameTabBarOptions;

// ==============================================================
// CẤU HÌNH TÙY CHỈNH
// ==============================================================

export const TAB_BAR_CONFIG = {
    /** Độ trong suốt của nền nâu (khay) phía sau các ô: 0 = trong suốt hoàn toàn, 1 = đặc */
    trayAlpha: 0.3,
    /** Độ trong suốt của viền khay: 0 = ẩn viền, 1 = đặc */
    trayOutlineAlpha: 0.3,
};

const C = {
    // khay chứa
    trayOutline: 0x1f1409,
    tray: 0x3a2812,
    trayShade: 0x2a1c0c,

    // ô chưa chọn (kem)
    faceIdle: 0xf4e4b8,
    hiIdle: 0xfffaf0,
    loIdle: 0xb08a4a,
    sideIdle: 0xb48d4c,
    textIdle: 0x6b4a1f,
    strokeIdle: 0xfff3cf,

    // ô đang chọn (xanh lá)
    faceOn: 0x7fd13b,
    hiOn: 0xc6f57e,
    loOn: 0x2f7d14,
    sideOn: 0x3d8a21,
    textOn: 0xffffff,
    strokeOn: 0x2a6511,

    outline: 0x24170a,
    gold: 0xffd24a,
    white: 0xffffff,

    leaf: 0x5fa332,
    leafLight: 0x9bd35a,
    leafDark: 0x3f7a1f,
};

const FACE_H = 52; // chiều cao mặt trên của ô
const SIDE = 8; // độ dày (cạnh 3D) tối đa
const TRAY_PAD = 12;
const BAR_HEIGHT = TRAY_PAD * 2 + FACE_H + SIDE; // 84

// ==============================================================
// TIỆN ÍCH
// ==============================================================

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

function lerpColor(a: number, b: number, t: number): number {
    t = clamp01(t);
    const r = ((a >> 16) & 255) + ((((b >> 16) & 255) - ((a >> 16) & 255)) * t);
    const g = ((a >> 8) & 255) + ((((b >> 8) & 255) - ((a >> 8) & 255)) * t);
    const bl = (a & 255) + (((b & 255) - (a & 255)) * t);
    return ((r | 0) << 16) | ((g | 0) << 8) | (bl | 0);
}

/** Lò xo: cho cảm giác nảy khi chuyển trạng thái */
class Spring {
    public x: number;
    public v = 0;
    public target: number;

    constructor(
        value: number,
        private readonly k = 190,
        private readonly d = 15
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
        .stroke({ color: C.leafDark, width: 1, alpha: 0.7 });
    leaf.pivot.set(7, 0);
    return leaf;
}

function createStar(): Graphics {
    return new Graphics()
        .poly([0, -7, 1.8, -1.8, 7, 0, 1.8, 1.8, 0, 7, -1.8, 1.8, -7, 0, -1.8, -1.8])
        .fill(C.gold)
        .poly([0, -3.5, 0.9, -0.9, 3.5, 0, 0.9, 0.9, 0, 3.5, -0.9, 0.9, -3.5, 0, -0.9, -0.9])
        .fill(C.white);
}

// ==============================================================
// MỘT Ô TAB
// ==============================================================

class GameTabView extends Container {
    public readonly sel: Spring;
    public readonly enter = new Spring(0, 150, 11);
    private readonly press = new Spring(0, 330, 20);
    private readonly hover = new Spring(0, 260, 22);
    private readonly pop = new Spring(1, 320, 13);

    public slotX = 0;
    public tabWidth = 0;
    public enterDelay = 0;

    private readonly art = new Graphics();
    private readonly fxClip = new Container();
    private readonly fxMask = new Graphics();
    private readonly shine = new Graphics();
    private readonly labelIdle: Text;
    private readonly labelOn: Text;

    private shineT = -1;
    private idleTimer = 0;
    private age = 0;
    private ripples: { g: Graphics; x: number; y: number; age: number }[] = [];

    constructor(
        label: string,
        private readonly index: number,
        selected: boolean,
        private readonly onTap: (index: number) => void
    ) {
        super();

        this.sel = new Spring(selected ? 1 : 0, 170, 12);

        const makeLabel = (fill: number, stroke: number, width: number) =>
            new Text({
                text: label,
                style: new TextStyle({
                    fontFamily: "Oswald, Arial, sans-serif",
                    fontSize: 17,
                    fontWeight: "700",
                    fill,
                    stroke: { color: stroke, width, join: "round" },
                    align: "center",
                }),
            });

        this.labelIdle = makeLabel(C.textIdle, C.strokeIdle, 3);
        this.labelOn = makeLabel(C.textOn, C.strokeOn, 5);
        this.labelIdle.anchor.set(0.5);
        this.labelOn.anchor.set(0.5);

        this.fxClip.addChild(this.shine);
        this.fxClip.mask = this.fxMask;

        this.addChild(
            this.art,
            this.fxClip,
            this.fxMask,
            this.labelIdle,
            this.labelOn
        );

        this.eventMode = "static";
        this.cursor = "pointer";

        this.on("pointerdown", () => (this.press.target = 1));
        this.on("pointerup", () => (this.press.target = 0));
        this.on("pointerupoutside", () => (this.press.target = 0));
        this.on("pointerover", () => (this.hover.target = 1));
        this.on("pointerout", () => {
            this.hover.target = 0;
            this.press.target = 0;
        });
        this.on("pointertap", (e: FederatedPointerEvent) => {
            const p = e.getLocalPosition(this);
            this.spawnRipple(p.x, p.y);
            this.onTap(this.index);
        });
    }

    public build(width: number): void {
        this.tabWidth = width;
        this.pivot.set(width / 2, SIDE + FACE_H);
        this.hitArea = new Rectangle(0, 0, width, SIDE + FACE_H);
        this.labelIdle.position.x = width / 2;
        this.labelOn.position.x = width / 2;
    }

    public startEnter(delay: number): void {
        this.enter.snap(0);
        this.enter.target = 1;
        this.enterDelay = delay;
        this.age = 0;
    }

    public skipEnter(): void {
        this.enter.snap(1);
        this.enterDelay = 0;
    }

    public select(): void {
        this.sel.target = 1;
        this.sel.v += 5;
        this.pop.v += 5;
        this.shineT = 0;
        this.idleTimer = 0;
    }

    public deselect(): void {
        this.sel.target = 0;
    }

    /** Bấm lại ô đang chọn: nảy nhẹ + quét sáng */
    public bump(): void {
        this.pop.v += 3.5;
        this.shineT = 0;
    }

    private spawnRipple(x: number, y: number): void {
        const g = new Graphics();
        this.fxClip.addChild(g);
        this.ripples.push({ g, x, y, age: 0 });
    }

    // -------- vẽ ô 3D (mỗi frame, vì độ dày thay đổi) --------

    private draw(top: number, s: number): void {
        const w = this.tabWidth;
        const face = lerpColor(C.faceIdle, C.faceOn, s);
        const hi = lerpColor(C.hiIdle, C.hiOn, s);
        const lo = lerpColor(C.loIdle, C.loOn, s);
        const side = lerpColor(C.sideIdle, C.sideOn, s);

        this.art
            .clear()
            // viền ngoài đậm
            .roundRect(-2, top - 2, w + 4, SIDE + FACE_H - top + 4, 11)
            .fill(C.outline)
            // khối cạnh 3D
            .roundRect(0, top + 8, w, FACE_H - top, 8)
            .fill(side)
            // mặt trên
            .roundRect(0, top, w, FACE_H, 8)
            .fill(face)
            // bóng gloss phía trên
            .roundRect(3, top + 3, w - 6, FACE_H * 0.46, 6)
            .fill({ color: hi, alpha: 0.6 })
            // bóng tối nhẹ phía dưới
            .roundRect(3, top + FACE_H * 0.66, w - 6, FACE_H * 0.3, 6)
            .fill({ color: lo, alpha: 0.14 })
            // viền sáng bên trong
            .roundRect(1.5, top + 1.5, w - 3, FACE_H - 3, 7)
            .stroke({ color: C.white, width: 1.5, alpha: 0.35 });

        this.fxMask.clear().roundRect(0, top, w, FACE_H, 8).fill(C.white);
    }

    public update(dt: number, time: number): void {
        this.age += dt;

        if (this.age < this.enterDelay) {
            this.visible = false;
            return;
        }
        this.visible = true;

        this.enter.step(dt);
        this.sel.step(dt);
        this.press.step(dt);
        this.hover.step(dt);
        this.pop.step(dt);

        const s = clamp01(this.sel.x);

        // độ nổi 3D: chọn -> cao hơn, nhấn -> lún xuống, hover -> nhích lên
        let lift =
            5 +
            3 * this.sel.x -
            4.2 * this.press.x +
            1.5 * this.hover.x * (1 - s) +
            Math.sin(time * 3 + this.index) * 0.7 * s;
        lift = Math.max(0.8, lift);
        const top = SIDE - lift;

        this.draw(top, s);

        // chữ đổi kiểu theo trạng thái
        const labelY = top + FACE_H / 2 + this.press.x * 1.5;
        this.labelIdle.position.y = labelY;
        this.labelOn.position.y = labelY;
        this.labelIdle.alpha = 1 - s;
        this.labelOn.alpha = s;

        // vệt sáng quét ngang (khi chọn + thỉnh thoảng lặp lại)
        if (s > 0.9 && this.shineT < 0) {
            this.idleTimer += dt;
            if (this.idleTimer > 3.4) {
                this.idleTimer = 0;
                this.shineT = 0;
            }
        }
        this.shine.clear();
        if (this.shineT >= 0) {
            this.shineT += dt / 0.7;
            if (this.shineT >= 1) {
                this.shineT = -1;
            } else {
                const e = 1 - Math.pow(1 - this.shineT, 2);
                const x = -40 + (this.tabWidth + 70) * e;
                this.shine
                    .poly([x + 14, top, x + 32, top, x + 18, top + FACE_H, x, top + FACE_H])
                    .fill({ color: C.white, alpha: 0.5 })
                    .poly([x + 36, top, x + 42, top, x + 28, top + FACE_H, x + 22, top + FACE_H])
                    .fill({ color: C.white, alpha: 0.32 });
            }
        }

        // sóng lan khi click
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
            r.g.clear()
                .circle(r.x, r.y, eased * this.tabWidth * 0.7)
                .fill({ color: C.white, alpha: 0.25 * (1 - t) })
                .stroke({ color: C.white, width: 2.5 * (1 - t) + 0.5, alpha: 0.8 * (1 - t) });
        }

        // vị trí, scale, hiệu ứng rơi vào
        const e = this.enter.x;
        this.position.set(
            this.slotX + this.tabWidth / 2,
            TRAY_PAD + SIDE + FACE_H + (1 - e) * -40
        );
        this.alpha = clamp01(e * 1.8);
        this.scale.set(this.pop.x * (1 - 0.02 * this.press.x));
    }
}

// ==============================================================
// THANH TAB
// ==============================================================

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

export class GameTabBar extends Container {
    private readonly tabs: GameTabItem[];
    private selectedIndex: number;
    private readonly onChange?: (index: number, tab: GameTabItem) => void;

    private barWidth: number;
    private time = 0;

    private readonly tray = new Graphics();
    private readonly selector = new Graphics();
    private readonly tabLayer = new Container();
    private readonly fxLayer = new Container();

    // khung vàng trượt theo ô được chọn
    private readonly selX = new Spring(0, 250, 19);
    private readonly selW = new Spring(0, 250, 24);

    private views: GameTabView[] = [];
    private particles: Particle[] = [];

    constructor(options: GameTabBarOptions) {
        super();

        this.tabs = options.tabs;
        this.barWidth = options.width;
        this.onChange = options.onChange;

        this.selectedIndex = Math.max(
            0,
            Math.min(options.selectedIndex ?? 0, this.tabs.length - 1)
        );

        this.addChild(this.tray, this.tabLayer, this.selector, this.fxLayer);

        this.tabs.forEach((item, i) => {
            const view = new GameTabView(
                item.label,
                i,
                i === this.selectedIndex,
                (index) => this.handleTap(index)
            );
            this.views.push(view);
            this.tabLayer.addChild(view);
        });

        this.layout(true);

        const intro = options.intro ?? true;
        this.views.forEach((v, i) => (intro ? v.startEnter(i * 0.08) : v.skipEnter()));
        this.views.forEach((v) => v.update(0, 0));

        Ticker.shared.add(this.tick, this);
    }

    // ==========================================
    // PUBLIC
    // ==========================================

    public getHeight(): number {
        return BAR_HEIGHT;
    }

    public getSelectedIndex(): number {
        return this.selectedIndex;
    }

    public setSelected(index: number): void {
        if (index < 0 || index >= this.tabs.length) return;
        if (index === this.selectedIndex) return;

        this.views[this.selectedIndex].deselect();
        this.selectedIndex = index;
        this.views[index].select();

        const v = this.views[index];
        this.selX.target = v.slotX;
        this.selW.target = v.tabWidth;

        this.burst(v);
        this.onChange?.(index, this.tabs[index]);
    }

    public resize(width: number): void {
        this.barWidth = width;
        this.layout(true);
    }

    public override destroy(options?: Parameters<Container["destroy"]>[0]): void {
        Ticker.shared.remove(this.tick, this);
        super.destroy(options ?? { children: true });
    }

    // ==========================================
    // NỘI BỘ
    // ==========================================

    private handleTap(index: number): void {
        if (index === this.selectedIndex) {
            this.views[index].bump();
            return;
        }
        this.setSelected(index);
    }

    private layout(snapSelector: boolean): void {
        this.drawTray();

        const n = this.views.length;
        if (n === 0) return;

        const pad = 12;
        const gap = 8;
        const w = (this.barWidth - pad * 2 - gap * (n - 1)) / n;

        this.views.forEach((v, i) => {
            v.slotX = pad + i * (w + gap);
            v.build(w);
        });

        const cur = this.views[this.selectedIndex];
        if (snapSelector) {
            this.selX.snap(cur.slotX);
            this.selW.snap(cur.tabWidth);
        }
    }

    /** Khay chứa: tối, có bóng lõm phía trên và viền sáng phía dưới */
    private drawTray(): void {
        const w = this.barWidth;
        const a = clamp01(TAB_BAR_CONFIG.trayAlpha);
        const oa = clamp01(TAB_BAR_CONFIG.trayOutlineAlpha);

        this.tray
            .clear()
            // viền: vẽ dạng vòng (khoét giữa) để không bị chồng lên phần nền khi trong suốt
            .roundRect(0, 0, w, BAR_HEIGHT, 16)
            .fill({ color: C.trayOutline, alpha: oa })
            .roundRect(3, 3, w - 6, BAR_HEIGHT - 6, 13)
            .cut()
            // nền nâu
            .roundRect(3, 3, w - 6, BAR_HEIGHT - 6, 13)
            .fill({ color: C.tray, alpha: a })
            // bóng lõm phía trên
            .roundRect(3, 3, w - 6, 16, 13)
            .fill({ color: C.trayShade, alpha: 0.75 * a })
            // viền sáng phía dưới
            .moveTo(14, BAR_HEIGHT - 4.5)
            .lineTo(w - 14, BAR_HEIGHT - 4.5)
            .stroke({ color: C.white, width: 1.2, alpha: 0.12 * a });
    }

    /** Gọi sau khi đổi TAB_BAR_CONFIG lúc đang chạy để vẽ lại nền */
    public refreshStyle(): void {
        this.drawTray();
    }

    // ==========================================
    // HIỆU ỨNG HẠT KHI CHỌN
    // ==========================================

    private burst(view: GameTabView): void {
        const cx = view.slotX + view.tabWidth / 2;
        const cy = TRAY_PAD + 8;

        const spawn = (star: boolean) => {
            const g = star ? createStar() : createLeaf(Math.random() < 0.5 ? C.leaf : C.leafLight);
            g.position.set(cx + (Math.random() - 0.5) * view.tabWidth * 0.6, cy);
            g.rotation = Math.random() * Math.PI * 2;
            this.fxLayer.addChild(g);

            const angle = -Math.PI / 2 + (Math.random() - 0.5) * 2;
            const speed = star ? 90 + Math.random() * 110 : 110 + Math.random() * 130;

            this.particles.push({
                g,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                vr: (Math.random() - 0.5) * (star ? 4 : 9),
                gravity: star ? 140 : 520,
                age: 0,
                life: star ? 0.55 + Math.random() * 0.3 : 0.75 + Math.random() * 0.4,
                star,
            });
        };

        for (let i = 0; i < 7; i++) spawn(false);
        for (let i = 0; i < 6; i++) spawn(true);
    }

    private tick(ticker: Ticker): void {
        const dt = Math.min(ticker.deltaMS / 1000, 1 / 30);
        this.time += dt;

        for (const v of this.views) v.update(dt, this.time);

        this.drawSelector(dt);

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

    /** Khung vàng phát sáng trượt (có overshoot) tới ô được chọn */
    private drawSelector(dt: number): void {
        if (this.views.length === 0) return;

        this.selX.step(dt);
        this.selW.step(dt);

        const pulse = 0.75 + 0.25 * Math.sin(this.time * 4);
        const x = this.selX.x - 5;
        const w = this.selW.x + 10;
        const y = TRAY_PAD - 6;
        const h = SIDE + FACE_H + 12;

        this.selector
            .clear()
            .roundRect(x, y, w, h, 14)
            .stroke({ color: C.gold, width: 10, alpha: 0.16 * pulse })
            .roundRect(x, y, w, h, 14)
            .stroke({ color: C.gold, width: 5, alpha: 0.34 * pulse })
            .roundRect(x, y, w, h, 14)
            .stroke({ color: C.gold, width: 2.5, alpha: 0.95 });

        this.selector.alpha = clamp01(this.views[this.selectedIndex].enter.x);
    }
}
