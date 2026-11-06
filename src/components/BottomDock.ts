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

export type DockSceneKey = "greenhouse" | "tools" | "market" | "bouquet";

const DOCK_ITEMS: readonly { key: DockSceneKey; label: string; asset: string }[] = [
    { key: "greenhouse", label: "Nhà kính", asset: "/assets/ui/green-house.png" },
    { key: "tools", label: "Cửa hàng", asset: "/assets/ui/shop.png" },
    { key: "market", label: "Bán hoa", asset: "/assets/ui/customer.png" },
    { key: "bouquet", label: "Gói hoa", asset: "/assets/ui/bouquet-table.png" },
];

export interface BottomDockOptions {
    width?: number;
    height?: number;
    selected?: DockSceneKey;
    /** Hiệu ứng các icon nảy lên lúc đầu (mặc định true) */
    intro?: boolean;
    onSelect: (key: DockSceneKey) => void;
}

// ==============================================================
// CẤU HÌNH TÙY CHỈNH
// ==============================================================

export const BOTTOM_DOCK_CONFIG = {
    /** Độ trong suốt của khay phía sau dock (cả nền lẫn viền). 0 = ẩn như bản cũ, 1 = đặc */
    trayAlpha: 0,
    /** Kích thước icon PNG (px) */
    iconSize: 60,
};

const C = {
    // khay (tông xanh nhạt, hợp với màu nhãn cũ)
    trayOutline: 0x4a7a3a,
    tray: 0xe6f1d8,
    trayShade: 0xcfe3bd,

    // nhãn chưa chọn / đang chọn
    textIdle: 0x3e7052,
    strokeIdle: 0xf6fff0,
    textOn: 0xffffff,
    strokeOn: 0x2a6511,

    // viên thuốc 3D của tab đang chọn
    pillFace: 0x7fd13b,
    pillHi: 0xc6f57e,
    pillSide: 0x3d8a21,
    outline: 0x24170a,

    glow: 0xfff2a8,
    gold: 0xffd24a,
    white: 0xffffff,

    leaf: 0x5fa332,
    leafLight: 0x9bd35a,
    leafDark: 0x3f7a1f,
};

const ICON_BASE_Y = 70; // đáy icon (nơi bóng đổ + tâm scale)
const ICON_CENTER_OFFSET = 30; // tâm icon cách đáy bao nhiêu px
const LABEL_Y_MAX = 91;

// ==============================================================
// TIỆN ÍCH
// ==============================================================

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

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

function createStar(size = 1): Graphics {
    const s = size;
    return new Graphics()
        .poly([0, -7 * s, 1.8 * s, -1.8 * s, 7 * s, 0, 1.8 * s, 1.8 * s, 0, 7 * s, -1.8 * s, 1.8 * s, -7 * s, 0, -1.8 * s, -1.8 * s])
        .fill(C.gold)
        .poly([0, -3.5 * s, 0.9 * s, -0.9 * s, 3.5 * s, 0, 0.9 * s, 0.9 * s, 0, 3.5 * s, -0.9 * s, 0.9 * s, -3.5 * s, 0, -0.9 * s, -0.9 * s])
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
    color: number;
    age: number;
}

// ==============================================================
// MỘT MỤC TRONG DOCK
// ==============================================================

class DockItemView extends Container {
    public readonly sel: Spring;
    public readonly enter = new Spring(0, 150, 11);
    private readonly press = new Spring(0, 340, 22);
    private readonly hover = new Spring(0, 260, 22);
    private readonly pop = new Spring(1, 320, 13);
    private readonly wiggle = new Spring(0, 220, 8);

    public enterDelay = 0;
    private age = 0;

    private readonly glow = new Graphics();
    private readonly shadow = new Graphics();
    private readonly iconHolder = new Container();
    private readonly twinkles = new Container();
    private readonly pill = new Container();
    private readonly labelIdle: Text;
    private readonly labelOn: Text;
    private readonly stars: Graphics[] = [];

    private labelY = LABEL_Y_MAX;

    constructor(
        public readonly key: DockSceneKey,
        label: string,
        asset: string,
        selected: boolean,
        private readonly index: number,
        onTap: (key: DockSceneKey) => void,
        onPress: (view: DockItemView) => void
    ) {
        super();

        this.sel = new Spring(selected ? 1 : 0, 170, 12);

        const makeLabel = (fill: number, stroke: number, width: number) =>
            new Text({
                text: label,
                style: new TextStyle({
                    fontFamily: "Baloo 2, Arial, sans-serif",
                    fontSize: 14,
                    fontWeight: "800",
                    fill,
                    stroke: { color: stroke, width, join: "round" },
                    align: "center",
                }),
            });

        this.labelIdle = makeLabel(C.textIdle, C.strokeIdle, 3);
        this.labelOn = makeLabel(C.textOn, C.strokeOn, 4);
        this.labelIdle.anchor.set(0.5);
        this.labelOn.anchor.set(0.5);

        // 3 ngôi sao nhỏ lấp lánh quanh icon đang chọn
        for (let i = 0; i < 3; i++) {
            const star = createStar(0.8);
            this.stars.push(star);
            this.twinkles.addChild(star);
        }

        this.iconHolder.position.set(0, ICON_BASE_Y);

        this.addChild(
            this.glow,
            this.shadow,
            this.iconHolder,
            this.twinkles,
            this.pill,
            this.labelIdle,
            this.labelOn
        );

        // PNG icon (tâm cách đáy 30px, giống vị trí tâm cũ ở y = 40)
        void Assets.load<Texture>(asset)
            .then((texture) => {
                if (this.destroyed) return;
                const sprite = new Sprite(texture);
                sprite.anchor.set(0.5);
                sprite.eventMode = "none";
                const factor = BOTTOM_DOCK_CONFIG.iconSize / Math.max(texture.width, texture.height);
                sprite.scale.set(factor);
                sprite.position.set(0, -ICON_CENTER_OFFSET);
                this.iconHolder.addChild(sprite);
            })
            .catch((error: unknown) => console.warn(`Không tải được icon Dock: ${asset}`, error));

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
        this.on("pointertap", () => {
            this.pop.v += 3.5; // phản hồi ngay khi bấm
            this.wiggle.v += (Math.random() < 0.5 ? -1 : 1) * 5;
            onPress(this);
            onTap(this.key);
        });
    }

    public build(columnWidth: number, dockHeight: number): void {
        this.hitArea = new Rectangle(-columnWidth / 2, 0, columnWidth, dockHeight);
        this.labelY = Math.min(dockHeight - 20, LABEL_Y_MAX);
        this.labelIdle.position.set(0, this.labelY);
        this.labelOn.position.set(0, this.labelY);

        // Viên thuốc 3D phía sau nhãn của tab đang chọn
        const pw = Math.min(columnWidth * 0.84, 110);
        const ph = 24;
        this.pill.position.set(0, this.labelY);
        this.pill.removeChildren().forEach((c) => c.destroy());
        this.pill.addChild(
            new Graphics()
                .roundRect(-pw / 2 - 2, -ph / 2 - 2, pw + 4, ph + 7, 13)
                .fill(C.outline)
                .roundRect(-pw / 2, -ph / 2 + 3, pw, ph, 11)
                .fill(C.pillSide)
                .roundRect(-pw / 2, -ph / 2, pw, ph, 11)
                .fill(C.pillFace)
                .roundRect(-pw / 2 + 3, -ph / 2 + 2.5, pw - 6, ph * 0.42, 6)
                .fill({ color: C.pillHi, alpha: 0.65 })
                .roundRect(-pw / 2 + 1.5, -ph / 2 + 1.5, pw - 3, ph - 3, 10)
                .stroke({ color: C.white, width: 1.5, alpha: 0.35 })
        );
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
        this.wiggle.v += (Math.random() < 0.5 ? -1 : 1) * 8;
    }

    public deselect(): void {
        this.sel.target = 0;
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
        this.wiggle.step(dt);

        const s = this.sel.x;
        const sc = clamp01(s);
        const e = this.enter.x;
        const hv = this.hover.x;
        const pr = this.press.x;

        // ---- icon: nhấc lên + to ra khi chọn, nhún nhẹ khi đang chọn, hover/nhấn có phản hồi ----
        const lift = 8 * s + 3 * hv * (1 - sc) + Math.sin(time * 3 + this.index) * 1.6 * sc;
        const base = 1 + 0.18 * s + 0.06 * hv;
        const popScale = this.pop.x;

        this.iconHolder.position.set(0, ICON_BASE_Y - lift + (1 - e) * 55);
        this.iconHolder.scale.set(
            base * popScale * (1 + 0.08 * pr),
            base * popScale * (1 - 0.12 * pr)
        );
        this.iconHolder.rotation = this.wiggle.x * 0.2 + Math.sin(time * 2 + this.index) * 0.035 * sc;
        this.iconHolder.alpha = clamp01(e * 1.8);

        // ---- bóng đổ dưới icon: thu nhỏ khi icon nhấc cao ----
        this.shadow
            .clear()
            .ellipse(0, ICON_BASE_Y + 1, 24 * (1 - lift * 0.02) * e, 6.5 * e)
            .fill({ color: 0x000000, alpha: 0.2 * (1 - lift * 0.02) * e });

        // ---- vầng sáng mềm phía sau icon đang chọn (không phải khung viền) ----
        this.glow.clear();
        if (sc > 0.01) {
            const cy = ICON_BASE_Y - ICON_CENTER_OFFSET - lift;
            const pulse = 0.8 + 0.2 * Math.sin(time * 3.5 + this.index);
            for (const [r, a] of [[46, 0.09], [38, 0.12], [30, 0.16]] as const) {
                this.glow.circle(0, cy, r * (0.85 + 0.15 * sc)).fill({ color: C.glow, alpha: a * sc * pulse });
            }
        }

        // ---- sao lấp lánh xoay quanh icon đang chọn ----
        this.twinkles.position.set(0, ICON_BASE_Y - ICON_CENTER_OFFSET - lift);
        this.twinkles.visible = sc > 0.01;
        this.stars.forEach((star, i) => {
            const a = time * 1.1 + (i * Math.PI * 2) / this.stars.length + this.index;
            star.position.set(Math.cos(a) * 40, Math.sin(a) * 26 - 4);
            star.scale.set(0.6 + 0.5 * Math.abs(Math.sin(time * 4 + i * 2)));
            star.rotation = a;
            star.alpha = sc * (0.5 + 0.5 * Math.abs(Math.sin(time * 3 + i)));
        });

        // ---- nhãn + viên thuốc 3D ----
        this.pill.alpha = sc;
        this.pill.scale.set((0.7 + 0.3 * s) * (1 + 0.03 * pr));
        this.labelIdle.alpha = (1 - sc) * clamp01(e * 1.8);
        this.labelOn.alpha = sc * clamp01(e * 1.8);
        const labelScale = 1 + 0.08 * s + 0.04 * hv * (1 - sc);
        this.labelIdle.scale.set(labelScale);
        this.labelOn.scale.set(labelScale);
        const ly = this.labelY + (1 - e) * 30 + pr * 1.2;
        this.labelIdle.position.y = ly;
        this.labelOn.position.y = ly;
        this.pill.position.y = ly;
    }
}

// ==============================================================
// DOCK
// ==============================================================

/** Dock di động kiểu game: PNG + nhãn, không khung viền icon; có hiệu ứng nảy, sáng, hạt bay. */
export class BottomDock extends Container {
    private dockWidth: number;
    private dockHeight: number;
    private selected: DockSceneKey;
    private readonly onSelect: (key: DockSceneKey) => void;

    private readonly tray = new Graphics();
    private readonly platform = new Graphics(); // bệ sáng trượt dưới icon đang chọn
    private readonly itemLayer = new Container();
    private readonly fxLayer = new Container();

    private readonly selX = new Spring(0, 250, 19);
    private readonly views = new Map<DockSceneKey, DockItemView>();

    private particles: Particle[] = [];
    private ripples: Ripple[] = [];
    private time = 0;

    constructor(options: BottomDockOptions) {
        super();
        this.dockWidth = options.width ?? 540;
        this.dockHeight = options.height ?? 116;
        this.selected = options.selected ?? "greenhouse";
        this.onSelect = options.onSelect;

        this.addChild(this.tray, this.platform, this.itemLayer, this.fxLayer);

        DOCK_ITEMS.forEach((info, index) => {
            const view = new DockItemView(
                info.key,
                info.label,
                info.asset,
                info.key === this.selected,
                index,
                (key) => this.onSelect(key),
                (v) => this.tapFeedback(v)
            );
            this.views.set(info.key, view);
            this.itemLayer.addChild(view);
        });

        this.layout();

        const intro = options.intro ?? true;
        DOCK_ITEMS.forEach(({ key }, i) => {
            const v = this.views.get(key);
            if (!v) return;
            if (intro) v.startEnter(i * 0.07);
            else v.skipEnter();
        });
        this.views.forEach((v) => v.update(0, 0));

        Ticker.shared.add(this.tick, this);
    }

    // ==========================================
    // PUBLIC
    // ==========================================

    public setSelected(key: DockSceneKey): void {
        if (key === this.selected) return;

        this.views.get(this.selected)?.deselect();
        this.selected = key;

        const view = this.views.get(key);
        if (view) {
            view.select();
            this.selX.target = view.x;
            this.burst(view);
        }
    }

    public resize(width: number, height = this.dockHeight): void {
        this.dockWidth = width;
        this.dockHeight = height;
        this.layout();
    }

    /** Gọi sau khi đổi BOTTOM_DOCK_CONFIG lúc đang chạy */
    public refreshStyle(): void {
        this.layout();
    }

    public override destroy(options?: Parameters<Container["destroy"]>[0]): void {
        Ticker.shared.remove(this.tick, this);
        super.destroy(options ?? { children: true });
    }

    // ==========================================
    // NỘI BỘ
    // ==========================================

    private layout(): void {
        const columnWidth = this.dockWidth / DOCK_ITEMS.length;

        DOCK_ITEMS.forEach(({ key }, index) => {
            const view = this.views.get(key);
            if (!view) return;
            view.position.set(columnWidth * (index + 0.5), 0);
            view.build(columnWidth, this.dockHeight);
        });

        const cur = this.views.get(this.selected);
        if (cur) this.selX.snap(cur.x);

        this.drawTray();
    }

    private drawTray(): void {
        const a = clamp01(BOTTOM_DOCK_CONFIG.trayAlpha);
        const w = this.dockWidth;
        const h = this.dockHeight;

        this.tray.clear();
        if (a <= 0) return;

        this.tray
            // viền dạng vòng để không chồng lên nền khi trong suốt
            .roundRect(0, 0, w, h, 18)
            .fill({ color: C.trayOutline, alpha: a })
            .roundRect(3, 3, w - 6, h - 6, 15)
            .cut()
            .roundRect(3, 3, w - 6, h - 6, 15)
            .fill({ color: C.tray, alpha: a })
            .roundRect(3, 3, w - 6, 16, 15)
            .fill({ color: C.trayShade, alpha: 0.8 * a })
            .moveTo(16, h - 4.5)
            .lineTo(w - 16, h - 4.5)
            .stroke({ color: C.white, width: 1.2, alpha: 0.5 * a });
    }

    /** Hiệu ứng khi bấm vào một mục: sóng lan trên mặt đất */
    private tapFeedback(view: DockItemView): void {
        this.addRipple(view.x, ICON_BASE_Y + 1, 44, view.key === this.selected ? 0xfff2a8 : C.pillFace);
    }

    private addRipple(x: number, y: number, radius: number, color: number): void {
        const g = new Graphics();
        this.fxLayer.addChild(g);
        this.ripples.push({ g, x, y, radius, color, age: 0 });
    }

    /** Khi chuyển tab: lá + sao bay lên từ icon mới */
    private burst(view: DockItemView): void {
        const cx = view.x;
        const cy = ICON_BASE_Y - ICON_CENTER_OFFSET - 8;

        const spawn = (star: boolean) => {
            const g = star ? createStar() : createLeaf(Math.random() < 0.5 ? C.leaf : C.leafLight);
            g.position.set(cx + (Math.random() - 0.5) * 36, cy);
            g.rotation = Math.random() * Math.PI * 2;
            this.fxLayer.addChild(g);

            const angle = -Math.PI / 2 + (Math.random() - 0.5) * 2.2;
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

        for (let i = 0; i < 6; i++) spawn(false);
        for (let i = 0; i < 6; i++) spawn(true);
    }

    private tick(ticker: Ticker): void {
        const dt = Math.min(ticker.deltaMS / 1000, 1 / 30);
        this.time += dt;

        this.views.forEach((v) => v.update(dt, this.time));
        this.drawPlatform(dt);
        this.updateFx(dt);
    }

    /** Bệ sáng dưới chân icon, trượt (có overshoot) sang tab được chọn */
    private drawPlatform(dt: number): void {
        this.selX.step(dt);

        const view = this.views.get(this.selected);
        const e = view ? clamp01(view.enter.x) : 0;
        const pulse = 0.8 + 0.2 * Math.sin(this.time * 3.5);

        this.platform.clear();
        for (const [rx, ry, a] of [[44, 11, 0.12], [34, 8.5, 0.18], [24, 6, 0.26]] as const) {
            this.platform
                .ellipse(this.selX.x, ICON_BASE_Y + 1, rx, ry)
                .fill({ color: C.glow, alpha: a * pulse * e });
        }
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
                .ellipse(r.x, r.y, rad, rad * 0.3)
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