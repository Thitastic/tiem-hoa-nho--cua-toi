import {
    Container,
    FederatedPointerEvent,
    Graphics,
    Rectangle,
    Text,
    TextStyle,
    Ticker,
} from 'pixi.js';

export interface GameDialogAction {
    label: string;
    onClick: () => void;
    kind?: 'primary' | 'secondary' | 'danger';
    /** Mặc định true; có thể giữ dialog mở khi xử lý hành động. */
    closeOnClick?: boolean;
}

export interface GameDialogOptions {
    title: string;
    width?: number;
    height?: number;
    /** Nội dung được đặt trong vùng giữa tiêu đề và hàng nút. */
    content?: Container;
    actions?: GameDialogAction[];
    closeOnBackdrop?: boolean;
    onClose?: () => void;
}

const COLORS = {
    outline: 0x24170a,
    face: 0xfff4d9,
    top: 0xfffbee,
    side: 0xb48d4c,
    green: 0x7fd13b,
    greenDark: 0x3d8a21,
    greenLight: 0xc6f57e,
    cream: 0xf4e4b8,
    creamDark: 0xb08a4a,
    danger: 0xdc6955,
    text: 0x315f45,
    white: 0xffffff,
    gold: 0xffd24a,
    leaf: 0x5fa332,
    leafLight: 0x9bd35a,
    leafDark: 0x3f7a1f,
};

type ActionKind = NonNullable<GameDialogAction['kind']>;

interface ButtonPalette {
    face: number;
    highlight: number;
    shade: number;
    side: number;
    text: number;
    stroke: number;
}

const PALETTES: Record<ActionKind | 'disabled', ButtonPalette> = {
    primary: {
        face: COLORS.green,
        highlight: COLORS.greenLight,
        shade: 0x2f7d14,
        side: COLORS.greenDark,
        text: 0xffffff,
        stroke: 0x2a6511,
    },
    secondary: {
        face: COLORS.cream,
        highlight: 0xfffaf0,
        shade: COLORS.creamDark,
        side: COLORS.creamDark,
        text: 0x6b4a1f,
        stroke: 0xfff3cf,
    },
    danger: {
        face: COLORS.danger,
        highlight: 0xff9f92,
        shade: 0x9a1f14,
        side: 0x9f3c2f,
        text: 0xffffff,
        stroke: 0x7a1710,
    },
    disabled: {
        face: 0xbdb8ac,
        highlight: 0xdcd8ce,
        shade: 0x6e695e,
        side: 0x8d887b,
        text: 0xf3f0e8,
        stroke: 0x6e695e,
    },
};

const style = (size: number, fill: number, bold = true, stroke?: { color: number; width: number }) => new TextStyle({
    fontFamily: 'Baloo 2, Oswald, Arial, sans-serif',
    fontSize: size,
    fontWeight: bold ? '800' : '500',
    fill,
    ...(stroke ? { stroke: { color: stroke.color, width: stroke.width, join: 'round' as const } } : {}),
});

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

/** Lò xo: nảy / đàn hồi tự nhiên, có thể "đá" thêm vận tốc khi click. */
class Spring {
    public x: number;
    public v = 0;
    public target: number;

    constructor(
        value: number,
        private k = 200,
        private d = 14,
    ) {
        this.x = value;
        this.target = value;
    }

    public snap(value: number): void {
        this.x = value;
        this.target = value;
        this.v = 0;
    }

    public setParams(k: number, d: number): void {
        this.k = k;
        this.d = d;
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

/** Node và mọi cha của nó đều đang hiển thị? Dùng để bỏ qua animation khi dialog đang ẩn. */
function isShown(node: Container | null): boolean {
    for (let n = node; n; n = n.parent) {
        if (!n.visible) return false;
    }
    return true;
}

function createStar(): Graphics {
    return new Graphics()
        .poly([0, -7, 1.8, -1.8, 7, 0, 1.8, 1.8, 0, 7, -1.8, 1.8, -7, 0, -1.8, -1.8])
        .fill(COLORS.gold)
        .poly([0, -3.5, 0.9, -0.9, 3.5, 0, 0.9, 0.9, 0, 3.5, -0.9, 0.9, -3.5, 0, -0.9, -0.9])
        .fill(COLORS.white);
}

function createLeaf(color: number): Graphics {
    const leaf = new Graphics()
        .moveTo(0, 0)
        .quadraticCurveTo(6, -6, 14, 0)
        .quadraticCurveTo(6, 6, 0, 0)
        .fill(color)
        .moveTo(1, 0)
        .lineTo(11, 0)
        .stroke({ color: COLORS.leafDark, width: 1, alpha: 0.7 });
    leaf.pivot.set(7, 0);
    return leaf;
}

function createShard(color: number): Graphics {
    return new Graphics()
        .poly([0, -5, 4, 3, -3, 4])
        .fill(color)
        .poly([0, -5, 4, 3, -3, 4])
        .stroke({ color: COLORS.outline, width: 1, alpha: 0.6 });
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

// ==============================================================
// NÚT NỔI KIỂU GAME
// ==============================================================

const BTN_SIDE = 6;

/**
 * Nút nổi kiểu game, tách riêng để dùng trong các dialog khác.
 * Tự cập nhật animation bằng Ticker (nhớ destroy khi bỏ).
 */
export class GameDialogButton extends Container {
    private readonly inner = new Container(); // scale / rung quanh đáy nút
    private readonly art = new Graphics();
    private readonly fxClip = new Container();
    private readonly fxMask = new Graphics();
    private readonly shine = new Graphics();
    private readonly caption: Text;

    private readonly hover = new Spring(0, 260, 22);
    private readonly press = new Spring(0, 340, 22);
    private readonly pop = new Spring(1, 320, 13);
    private readonly ready = new Spring(1, 300, 30);
    private readonly enter = new Spring(1, 190, 11);

    private readonly widthValue: number;
    private readonly heightValue: number;
    private readonly kind: ActionKind;
    private enabled = true;
    private enterDelay = 0;
    private age = 0;
    private time = 0;
    private shineT = -1;
    private shineTimer = Math.random() * 2;
    private shakeLeft = 0;
    private ripples: { g: Graphics; x: number; y: number; age: number }[] = [];

    constructor(label: string, width: number, height: number, kind: ActionKind, onClick: () => void) {
        super();
        this.widthValue = width;
        this.heightValue = height;
        this.kind = kind;

        this.caption = new Text({ text: label, style: this.makeStyle(PALETTES[kind]) });
        this.caption.anchor.set(0.5);
        this.caption.position.x = width / 2;

        this.fxClip.addChild(this.shine);
        this.fxClip.mask = this.fxMask;

        this.inner.pivot.set(width / 2, BTN_SIDE + height);
        this.inner.position.set(width / 2, BTN_SIDE + height);
        this.inner.addChild(this.art, this.fxClip, this.fxMask, this.caption);
        this.addChild(this.inner);

        this.eventMode = 'static';
        this.cursor = 'pointer';
        this.hitArea = new Rectangle(0, 0, width, height + 6);

        this.on('pointerover', () => {
            if (!this.enabled) return;
            this.hover.target = 1;
            this.shineT = 0;
        });
        this.on('pointerout', () => {
            this.hover.target = 0;
            this.press.target = 0;
        });
        this.on('pointerdown', () => {
            if (this.enabled) this.press.target = 1;
        });
        this.on('pointerup', () => (this.press.target = 0));
        this.on('pointerupoutside', () => (this.press.target = 0));
        this.on('pointertap', (event: FederatedPointerEvent) => {
            event.stopPropagation();
            this.press.target = 0;

            const p = event.getLocalPosition(this.inner);
            const g = new Graphics();
            this.fxClip.addChild(g);
            this.ripples.push({ g, x: p.x, y: p.y, age: 0 });

            if (this.enabled) {
                this.pop.v += 4.5;
                this.shineT = 0;
                onClick();
            } else {
                this.shakeLeft = 1; // nút đang khoá: rung báo, không chạy hành động
            }
        });

        this.draw(BTN_SIDE - 5, 1);
        Ticker.shared.add(this.tick, this);
    }

    get isEnabled(): boolean {
        return this.enabled;
    }

    setEnabled(value: boolean): void {
        if (value === this.enabled) return;
        this.enabled = value;
        this.ready.target = value ? 1 : 0;
        if (!value) {
            this.hover.target = 0;
            this.press.target = 0;
        }
        this.caption.style = this.makeStyle(value ? PALETTES[this.kind] : PALETTES.disabled);
        this.cursor = value ? 'pointer' : 'default';
    }

    /** Nút nảy vào từ dưới lên sau `delay` giây (dùng khi dialog mở). */
    playEnter(delay = 0): void {
        this.enter.snap(0);
        this.enter.target = 1;
        this.enterDelay = delay;
        this.age = 0;
        this.inner.visible = false; // ẩn ngay để không nháy nút đầy đủ một frame trước khi animation chạy
    }

    /** Rung ngang để báo hiệu thao tác không hợp lệ. */
    shake(): void {
        this.shakeLeft = 1;
    }

    override destroy(options?: Parameters<Container['destroy']>[0]): void {
        Ticker.shared.remove(this.tick, this);
        super.destroy(options ?? { children: true });
    }

    private makeStyle(p: ButtonPalette): TextStyle {
        return style(18, p.text, true, { color: p.stroke, width: 4 });
    }

    private draw(top: number, t: number): void {
        const w = this.widthValue;
        const h = this.heightValue;
        const base = PALETTES[this.kind];
        const off = PALETTES.disabled;
        const face = lerpColor(off.face, base.face, t);
        const hi = lerpColor(off.highlight, base.highlight, t);
        const lo = lerpColor(off.shade, base.shade, t);
        const side = lerpColor(off.side, base.side, t);

        this.art
            .clear()
            // viền ngoài đậm
            .roundRect(-2, top - 2, w + 4, BTN_SIDE + h - top + 4, 14)
            .fill(COLORS.outline)
            // cạnh dày 3D
            .roundRect(0, top + 8, w, BTN_SIDE + h - top - 8, 11)
            .fill(side)
            // mặt nút
            .roundRect(0, top, w, h, 11)
            .fill(face)
            // gloss phía trên
            .roundRect(4, top + 3, w - 8, h * 0.44, 8)
            .fill({ color: hi, alpha: 0.6 })
            // bóng tối nhẹ phía dưới
            .roundRect(4, top + h * 0.66, w - 8, h * 0.3, 8)
            .fill({ color: lo, alpha: 0.14 })
            // viền sáng bên trong
            .roundRect(1.5, top + 1.5, w - 3, h - 3, 10)
            .stroke({ color: COLORS.white, width: 1.5, alpha: 0.35 });

        this.fxMask.clear().roundRect(0, top, w, h, 11).fill(COLORS.white);
    }

    private tick(ticker: Ticker): void {
        if (!isShown(this)) return;
        const dt = Math.min(ticker.deltaMS / 1000, 1 / 30);
        this.time += dt;
        this.age += dt;

        if (this.age < this.enterDelay) {
            this.inner.visible = false;
            return;
        }
        this.inner.visible = true;

        this.enter.step(dt);
        this.hover.step(dt);
        this.press.step(dt);
        this.pop.step(dt);
        this.ready.step(dt);

        const t = clamp01(this.ready.x);
        const lift = Math.max(
            0.8,
            2 + t * (3 + 1.8 * this.hover.x - 4.2 * this.press.x + Math.sin(this.time * 2.6) * 0.25),
        );
        const top = BTN_SIDE - lift;

        this.draw(top, t);
        this.caption.position.y = top + this.heightValue / 2 + this.press.x * 1.5;

        // vệt sáng quét: khi hover / bấm, và thỉnh thoảng với nút chính
        if (this.shineT < 0 && this.enabled && this.kind === 'primary') {
            this.shineTimer += dt;
            if (this.shineTimer > 3.2) {
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
                const x = -40 + (this.widthValue + 70) * e;
                this.shine
                    .poly([x + 14, top, x + 32, top, x + 18, top + this.heightValue, x, top + this.heightValue])
                    .fill({ color: COLORS.white, alpha: 0.5 })
                    .poly([x + 36, top, x + 42, top, x + 28, top + this.heightValue, x + 22, top + this.heightValue])
                    .fill({ color: COLORS.white, alpha: 0.32 });
            }
        }

        // sóng lan khi bấm
        for (let i = this.ripples.length - 1; i >= 0; i--) {
            const r = this.ripples[i];
            r.age += dt;
            const k = r.age / 0.5;
            if (k >= 1) {
                r.g.destroy();
                this.ripples.splice(i, 1);
                continue;
            }
            const eased = 1 - Math.pow(1 - k, 3);
            r.g.clear()
                .circle(r.x, r.y, eased * this.widthValue * 0.5)
                .fill({ color: COLORS.white, alpha: 0.25 * (1 - k) })
                .stroke({ color: COLORS.white, width: 2.5 * (1 - k) + 0.5, alpha: 0.8 * (1 - k) });
        }

        // rung ngang + scale (nảy khi click, bóp khi nhấn) + trượt vào
        let shakeX = 0;
        if (this.shakeLeft > 0) {
            this.shakeLeft = Math.max(0, this.shakeLeft - dt / 0.42);
            shakeX = Math.sin((1 - this.shakeLeft) * 46) * 5 * this.shakeLeft;
        }
        const e = Math.max(0, this.enter.x);
        this.inner.position.set(
            this.widthValue / 2 + shakeX,
            BTN_SIDE + this.heightValue + (1 - e) * 20,
        );
        this.inner.scale.set(
            this.pop.x * (1 + 0.04 * this.press.x) * (0.8 + 0.2 * e),
            this.pop.x * (1 - 0.04 * this.press.x) * (0.8 + 0.2 * e),
        );
        this.inner.alpha = clamp01(e * 1.8);
    }
}

// ==============================================================
// DIALOG
// ==============================================================

/** Popup dùng chung cho PixiJS: bảng 3D, animation bật ra, nội dung và nút tùy biến. */
export class GameDialog extends Container {
    private readonly shade = new Graphics();
    private readonly board = new Container();
    private readonly fxLayer = new Container(); // hạt bay nằm ngoài bảng để không bị mờ / thu nhỏ theo
    private readonly banner = new Container();
    private readonly bannerShine = new Graphics();
    private readonly heading: Text;
    private readonly contentArea = new Container();
    private readonly actionsArea = new Container();
    private readonly widthValue: number;
    private readonly heightValue: number;
    private readonly closeOnBackdrop: boolean;
    private readonly onClose?: () => void;

    // lò xo hoạt ảnh
    private readonly openSpring = new Spring(0, 210, 13);
    private readonly bannerPop = new Spring(0, 200, 10);
    private readonly headingPop = new Spring(0, 260, 9);
    private readonly contentIn = new Spring(0, 190, 11);

    private introTime = 0;
    private time = 0;
    private shakeLeft = 0;
    private bannerShineT = -1;
    private bannerShineTimer = 0;
    private pendingOpenBurst = false;
    private headingBase = 1;
    private fit = 1;
    private centerX = 0;
    private centerY = 0;
    private particles: Particle[] = [];
    private readonly ticker = (ticker: Ticker) => this.update(ticker);

    constructor(options: GameDialogOptions) {
        super();
        this.widthValue = options.width ?? 340;
        this.heightValue = options.height ?? 340;
        this.closeOnBackdrop = options.closeOnBackdrop ?? true;
        this.onClose = options.onClose;
        this.visible = false;
        this.eventMode = 'static';
        this.shade.eventMode = 'static';
        this.shade.on('pointertap', () => {
            if (this.closeOnBackdrop) this.close();
            else this.shake(); // không cho đóng bằng nền: bảng rung nhẹ để báo
        });
        this.addChild(this.shade, this.board, this.fxLayer);
        this.board.pivot.set(this.widthValue / 2, this.heightValue / 2);
        this.board.eventMode = 'static';
        this.board.hitArea = new Rectangle(0, 0, this.widthValue, this.heightValue);

        this.board.addChild(new Graphics()
            .roundRect(-3, -3, this.widthValue + 6, this.heightValue + 6, 25).fill(COLORS.outline)
            .roundRect(0, 8, this.widthValue, this.heightValue - 8, 22).fill(COLORS.side)
            .roundRect(0, 0, this.widthValue, this.heightValue - 8, 22).fill(COLORS.face)
            .roundRect(8, 8, this.widthValue - 16, 55, 15).fill({ color: COLORS.top, alpha: 0.65 })
            .roundRect(4, 4, this.widthValue - 8, this.heightValue - 16, 20)
            .stroke({ color: 0xffffff, width: 2, alpha: 0.6 }));

        // ---- băng rôn tiêu đề (có vệt sáng quét bị cắt trong băng rôn) ----
        const bannerWidth = this.widthValue - 50;
        this.banner.position.set(this.widthValue / 2, 33);
        const bannerMask = new Graphics().roundRect(-bannerWidth / 2, -21, bannerWidth, 43, 12).fill(COLORS.white);
        const bannerClip = new Container();
        bannerClip.addChild(this.bannerShine);
        bannerClip.mask = bannerMask;

        this.banner.addChild(new Graphics()
            .roundRect(-bannerWidth / 2 - 2, -21, bannerWidth + 4, 50, 14).fill(COLORS.outline)
            .roundRect(-bannerWidth / 2, -17, bannerWidth, 43, 12).fill(COLORS.greenDark)
            .roundRect(-bannerWidth / 2, -21, bannerWidth, 43, 12).fill(COLORS.green)
            .roundRect(-bannerWidth / 2 + 4, -17, bannerWidth - 8, 17, 8)
            .fill({ color: COLORS.greenLight, alpha: 0.55 }));
        this.banner.addChild(bannerClip, bannerMask);

        this.heading = new Text({
            text: options.title,
            style: style(22, 0xffffff, true, { color: 0x2a6511, width: 5 }),
        });
        this.heading.anchor.set(0.5);
        this.heading.position.y = -1;
        this.banner.addChild(this.heading);
        this.board.addChild(this.banner);
        this.setTitle(options.title);

        this.contentArea.position.set(16, 72);
        if (options.content) this.contentArea.addChild(options.content);
        this.board.addChild(this.contentArea);

        this.actionsArea.position.set(12, this.heightValue - 62);
        this.board.addChild(this.actionsArea);
        this.setActions(options.actions ?? [{ label: 'Đóng', onClick: () => undefined, kind: 'primary' }]);
        Ticker.shared.add(this.ticker);
    }

    /** Vùng nội dung rộng width-32, cao height-148 (đơn vị tọa độ Pixi). */
    get content(): Container { return this.contentArea; }

    setTitle(title: string): void {
        const changed = this.heading.text !== title;
        this.heading.text = title;
        this.headingBase = 1;
        const maxWidth = this.widthValue - 75;
        if (this.heading.width > maxWidth) this.headingBase = maxWidth / this.heading.width;
        this.heading.scale.set(this.headingBase);
        if (changed && this.visible) this.headingPop.v += 6; // tiêu đề đổi: nảy một nhịp
    }

    setContent(content: Container): void {
        this.contentArea.removeChildren();
        // Không destroy nội dung do caller sở hữu; có thể tái dùng ở dialog khác.
        this.contentArea.addChild(content);
    }

    setActions(actions: GameDialogAction[]): void {
        this.actionsArea.removeChildren().forEach((child) => child.destroy());
        if (!actions.length) return;
        const gap = 9;
        const eachWidth = (this.widthValue - 24 - gap * (actions.length - 1)) / actions.length;
        actions.forEach((action, index) => {
            const kind = action.kind ?? 'secondary';
            const node = new GameDialogButton(action.label, eachWidth, 43, kind, () => {
                // hiệu ứng phản hồi tuỳ loại nút, rồi mới chạy hành động
                this.burstForAction(kind, node.x + eachWidth / 2, node.y + 6);
                if (action.closeOnClick !== false) this.close();
                action.onClick();
            });
            node.position.x = index * (eachWidth + gap);
            this.actionsArea.addChild(node);
            // thêm nút khi dialog đang mở: nảy vào ngay
            if (this.visible && this.openSpring.target === 1) node.playEnter(0.04 + index * 0.06);
        });
    }

    /** Điều khiển trạng thái nút theo thứ tự khai báo trong actions. */
    setActionEnabled(index: number, enabled: boolean): void {
        const button = this.actionsArea.children[index];
        if (button instanceof GameDialogButton) button.setEnabled(enabled);
    }

    /** Rung bảng ngang để báo thao tác không hợp lệ. */
    shake(): void {
        this.shakeLeft = 1;
    }

    open(): void {
        const wasClosed = !this.visible || this.openSpring.target === 0;
        this.visible = true;
        this.board.visible = true;
        this.interactiveChildren = true;
        this.openSpring.setParams(210, 13);
        if (!this.visibleBoardActive()) this.openSpring.snap(0);
        this.openSpring.target = 1;

        if (wasClosed) {
            // chạy lại chuỗi xuất hiện: băng rôn bật ra, nội dung trượt lên, nút nảy vào lần lượt
            this.introTime = 0;
            this.bannerPop.snap(0);
            this.contentIn.snap(0);
            this.headingPop.snap(0);
            this.bannerShineT = 0;
            this.shakeLeft = 0;
            this.pendingOpenBurst = true;
            this.actionsArea.children.forEach((child, index) => {
                if (child instanceof GameDialogButton) child.playEnter(0.26 + index * 0.07);
            });
        }
    }

    close(): void {
        if (this.openSpring.target === 0) return;
        this.openSpring.target = 0;
        this.openSpring.setParams(320, 34); // đóng nhanh, không nảy
        this.interactiveChildren = false;
        this.onClose?.();
    }

    resize(width: number, height: number): void {
        this.shade.clear().rect(0, 0, width, height).fill({ color: 0x1b251a, alpha: 0.68 });
        this.shade.hitArea = new Rectangle(0, 0, width, height);
        this.fit = Math.max(0.1, Math.min(1, (width - 20) / this.widthValue, (height - 20) / this.heightValue));
        this.centerX = width / 2;
        this.centerY = height / 2;
        this.applyTransform();
    }

    override destroy(options?: Parameters<Container['destroy']>[0]): void {
        Ticker.shared.remove(this.ticker);
        super.destroy(options ?? { children: true });
    }

    // ==========================================
    // HẠT BAY
    // ==========================================

    /** Bảng đang hiển thị dở (đang mở hoặc đang đóng) thì giữ nguyên tiến độ thay vì reset. */
    private visibleBoardActive(): boolean {
        return this.board.visible && this.openSpring.x > 0.015;
    }

    /** Toạ độ trong bảng -> toạ độ của dialog. */
    private boardToDialog(px: number, py: number): { x: number; y: number } {
        return {
            x: this.board.x + (px - this.widthValue / 2) * this.board.scale.x,
            y: this.board.y + (py - this.heightValue / 2) * this.board.scale.y,
        };
    }

    private burstAt(px: number, py: number, leaves: number, stars: number, shards: number): void {
        const { x, y } = this.boardToDialog(px, py);
        const s = this.fit;

        const spawn = (g: Graphics, speed: number, gravity: number, life: number, twinkle: boolean) => {
            g.scale.set(s);
            g.position.set(x + (Math.random() - 0.5) * 60 * s, y);
            g.rotation = Math.random() * Math.PI * 2;
            this.fxLayer.addChild(g);

            const angle = -Math.PI / 2 + (Math.random() - 0.5) * 2.4;
            this.particles.push({
                g,
                vx: Math.cos(angle) * speed * s,
                vy: Math.sin(angle) * speed * s,
                vr: (Math.random() - 0.5) * (twinkle ? 4 : 9),
                gravity: gravity * s,
                age: 0,
                life,
                twinkle,
            });
        };

        for (let i = 0; i < leaves; i++) {
            spawn(createLeaf(Math.random() < 0.5 ? COLORS.leaf : COLORS.leafLight), 120 + Math.random() * 140, 520, 0.8 + Math.random() * 0.4, false);
        }
        for (let i = 0; i < stars; i++) {
            spawn(createStar(), 100 + Math.random() * 120, 140, 0.6 + Math.random() * 0.3, true);
        }
        for (let i = 0; i < shards; i++) {
            spawn(createShard(Math.random() < 0.5 ? COLORS.danger : 0xffb4aa), 100 + Math.random() * 140, 560, 0.55 + Math.random() * 0.3, false);
        }
    }

    private burstForAction(kind: ActionKind, bx: number, by: number): void {
        // toạ độ nút trong actionsArea -> trong bảng
        const px = this.actionsArea.x + bx;
        const py = this.actionsArea.y + by;
        if (kind === 'primary') this.burstAt(px, py, 6, 7, 0);
        else if (kind === 'danger') this.burstAt(px, py, 0, 0, 8);
        else this.burstAt(px, py, 0, 2, 0);
    }

    // ==========================================
    // CẬP NHẬT MỖI FRAME
    // ==========================================

    private update(ticker: Ticker): void {
        if (!this.visible) return;

        const dt = Math.min(ticker.deltaMS / 1000, 1 / 30);
        this.time += dt;
        this.openSpring.step(dt);

        const opening = this.openSpring.target === 1;

        // đóng xong: ẩn bảng; chờ hạt bay hết rồi mới ẩn hẳn dialog
        if (!opening && this.openSpring.x < 0.015) {
            this.board.visible = false;
            this.shade.alpha = 0;
            this.updateParticles(dt);
            if (this.particles.length === 0) this.visible = false;
            return;
        }

        // ---- băng rôn: bật ra, đung đưa nhẹ, vệt sáng quét ----
        this.introTime += dt;
        if (opening && this.introTime >= 0.05) this.bannerPop.target = 1;
        if (opening && this.introTime >= 0.14) this.contentIn.target = 1;
        this.bannerPop.step(dt);
        this.headingPop.step(dt);
        this.contentIn.step(dt);

        const bp = Math.max(0, this.bannerPop.x);
        this.banner.scale.set(0.5 + 0.5 * bp);
        this.banner.alpha = clamp01(bp * 2);
        this.banner.rotation = Math.sin(this.time * 1.6) * 0.012 * bp;
        this.heading.scale.set(this.headingBase * (1 + 0.18 * this.headingPop.x));

        if (this.bannerShineT < 0 && opening) {
            this.bannerShineTimer += dt;
            if (this.bannerShineTimer > 3.8) {
                this.bannerShineTimer = 0;
                this.bannerShineT = 0;
            }
        }
        this.bannerShine.clear();
        if (this.bannerShineT >= 0) {
            this.bannerShineT += dt / 0.8;
            if (this.bannerShineT >= 1) {
                this.bannerShineT = -1;
            } else {
                const t = 1 - Math.pow(1 - this.bannerShineT, 2);
                const span = this.widthValue - 50;
                const x = -span / 2 - 50 + (span + 100) * t;
                this.bannerShine
                    .poly([x + 16, -22, x + 40, -22, x + 24, 24, x, 24])
                    .fill({ color: COLORS.white, alpha: 0.45 })
                    .poly([x + 48, -22, x + 56, -22, x + 40, 24, x + 32, 24])
                    .fill({ color: COLORS.white, alpha: 0.28 });
            }
        }

        // ---- nội dung trượt lên + hiện dần ----
        const ci = Math.max(0, this.contentIn.x);
        this.contentArea.position.set(16, 72 + (1 - ci) * 20);
        this.contentArea.alpha = clamp01(ci * 1.8);

        if (this.shakeLeft > 0) this.shakeLeft = Math.max(0, this.shakeLeft - dt / 0.45);
        this.applyTransform();

        // sao bay hai bên băng rôn khi bảng vừa bật ra
        if (this.pendingOpenBurst && this.openSpring.x > 0.55) {
            this.pendingOpenBurst = false;
            this.burstAt(this.widthValue * 0.1, 26, 0, 3, 0);
            this.burstAt(this.widthValue * 0.9, 26, 0, 3, 0);
        }

        this.updateParticles(dt);
    }

    /** Đặt vị trí / scale / alpha của bảng và nền tối theo tiến độ mở. */
    private applyTransform(): void {
        const e = Math.max(0, this.openSpring.x);

        const shakeX = this.shakeLeft > 0
            ? Math.sin((1 - this.shakeLeft) * 44) * 7 * this.shakeLeft
            : 0;

        // lò xo cho độ nảy tự nhiên (overshoot) khi mở; đóng thì không nảy
        const bob = Math.sin(this.time * 1.8) * 1.2 * e; // nhún rất nhẹ khi đang mở
        this.board.scale.set(this.fit * (0.72 + 0.28 * e));
        this.board.position.set(
            this.centerX + shakeX * this.fit,
            this.centerY + ((1 - e) * 36 + bob) * this.fit,
        );
        this.board.alpha = clamp01(e * 1.8);
        this.shade.alpha = clamp01(e);
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
            p.vy += p.gravity * dt;
            p.vx *= 1 - 1.2 * dt;
            p.g.x += p.vx * dt;
            p.g.y += p.vy * dt;
            p.g.rotation += p.vr * dt;

            const t = p.age / p.life;
            p.g.alpha = 1 - t * t;
            p.g.scale.set(this.fit * (p.twinkle ? 1 + Math.sin(t * Math.PI) * 0.5 : 1 - t * 0.35));
        }
    }
}