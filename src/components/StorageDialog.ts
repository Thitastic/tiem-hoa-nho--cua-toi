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
} from 'pixi.js';
import { GameDialog } from './GameDialog';
import { GameTabBar } from './GameTabBar';
import { SeedPack } from './SeedPack';
import { gameStore } from '../services/GameSession';
import { getFlowerVariantById } from '../data/flowerVariants';
import { getFlowerSeedById } from '../data/flowerSeeds';
import { getPotById } from '../data/pots';
import type { InventoryItem } from '../models/Inventory';

type StorageTab = 'flower' | 'seed' | 'item';
const CONTENT_WIDTH = 408;
const VIEWPORT_HEIGHT = 228;
const CELL_W = 126;
const CELL_H = 116;
const GAP = 10;
const COLS = 3;

/** Lề trên / dưới của lưới: chừa chỗ cho viền, cạnh dày và độ nhô lên khi hover không bị mask cắt. */
const GRID_PAD_TOP = 6;
const GRID_PAD_BOTTOM = 8;
const GRID_X = (CONTENT_WIDTH - (COLS * CELL_W + (COLS - 1) * GAP)) / 2;

// ==============================================================
// MÀU SẮC / TIỆN ÍCH (đồng bộ với các UI game khác)
// ==============================================================

const C = {
    outline: 0x24170a,
    white: 0xffffff,
    gold: 0xffd24a,

    card: 0xfff4d9,
    cardHi: 0xfffbee,
    cardSide: 0xb48d4c,
    cardShade: 0xb08a4a,

    title: 0x315f45,
    muted: 0x6a7566,
    cream: 0xfffbee,

    stage: 0xe8f5d6,
    stageFloor: 0xc9dfb0,

    chipFace: 0x7fd13b,
    chipHi: 0xc6f57e,
    chipSide: 0x3d8a21,
    chipStroke: 0x2a6511,

    gain: 0x3fae2a,
    spend: 0xe0503f,
    scroll: 0x749c59,
};

type FontWeight = '500' | '700' | '800';

const font = (
    size: number,
    color: number,
    weight: FontWeight = '700',
    stroke?: { color: number; width: number },
) => new TextStyle({
    fontFamily: 'Baloo 2, Oswald, Arial, sans-serif',
    fontSize: size,
    fontWeight: weight,
    fill: color,
    ...(stroke ? { stroke: { color: stroke.color, width: stroke.width, join: 'round' as const } } : {}),
});

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

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
}

// ==============================================================
// Ô VẬT PHẨM TRONG KHO
// ==============================================================

interface ItemCellOptions {
    key: string;
    name: string;
    quantity: number;
    /** Ảnh PNG của vật phẩm (hoa / chậu). */
    asset?: string;
    /** Tạo nhãn hạt giống (SeedPack) thay cho ảnh. */
    packFactory?: () => Container;
    /** Đang kéo cuộn danh sách? (để không tính là "bấm" vào ô) */
    isDragging: () => boolean;
}

const SIDE = 7; // độ dày 3D của ô
const FACE_H = CELL_H - SIDE;
const ICON_BASE_Y = 90; // đáy icon (tâm scale + bóng sàn), tính trong hệ toạ độ mặt thẻ
const ICON_UP = 31; // tâm icon cách đáy bao nhiêu px

/**
 * Ô vật phẩm: thẻ 3D, nhãn tên rõ ràng, icon trên bệ, huy hiệu số lượng nổi bật.
 * Có animation xuất hiện, hover / nhấn / click, đổi số lượng (đếm + nảy + "+N"), biến mất.
 */
class StorageItemCell extends Container {
    public readonly key: string;
    public targetX = 0;
    public targetY = 0;

    private readonly body = new Container();
    private readonly art = new Graphics();
    private readonly content = new Container();
    private readonly stage = new Graphics();
    private readonly iconHolder = new Container();
    private readonly chip = new Container();
    private readonly chipArt = new Graphics();
    private readonly qtyText: Text;
    private readonly fxLayer = new Container();

    private readonly enter = new Spring(1, 180, 11);
    private readonly hover = new Spring(0, 260, 22);
    private readonly press = new Spring(0, 330, 20);
    private readonly pop = new Spring(1, 300, 12);
    private readonly chipPop = new Spring(0, 300, 9);
    private readonly jump = new Spring(0, 250, 9);
    private readonly wiggle = new Spring(0, 220, 8);

    private readonly phase = Math.random() * Math.PI * 2;
    private quantity: number;
    private display: number;
    private shownText = '';
    private enterDelay = 0;
    private age = 0;
    private time = 0;
    private leaving = false;
    private burstOnEnter = false;

    private particles: Particle[] = [];
    private floats: FloatText[] = [];
    private ripples: { g: Graphics; age: number }[] = [];

    constructor(options: ItemCellOptions) {
        super();

        this.key = options.key;
        this.quantity = options.quantity;
        this.display = options.quantity;

        // ---- tên vật phẩm: dải sáng + chữ có viền, tự thu nhỏ nếu quá dài ----
        const nameBand = new Graphics()
            .roundRect(5, 5, CELL_W - 10, 22, 8)
            .fill({ color: C.cardHi, alpha: 0.85 });
        const name = new Text({
            text: options.name,
            style: font(13, C.title, '800', { color: C.cream, width: 3 }),
        });
        name.anchor.set(0.5);
        name.position.set(CELL_W / 2, 16);
        const maxNameW = CELL_W - 18;
        if (name.width > maxNameW) name.scale.set(maxNameW / name.width);

        // ---- icon ----
        this.iconHolder.position.set(CELL_W / 2, ICON_BASE_Y);
        this.buildIcon(options);

        // ---- huy hiệu số lượng ----
        this.qtyText = new Text({
            text: '',
            style: font(15, C.white, '800', { color: C.chipStroke, width: 4 }),
        });
        this.qtyText.anchor.set(0.5);
        this.qtyText.position.y = -1;
        this.chip.addChild(this.chipArt, this.qtyText);

        this.content.addChild(this.stage, nameBand, name, this.iconHolder, this.chip);
        this.body.pivot.set(CELL_W / 2, CELL_H);
        this.body.position.set(CELL_W / 2, CELL_H);
        this.body.addChild(this.art, this.content);
        this.addChild(this.body, this.fxLayer);

        // ---- tương tác ----
        this.eventMode = 'static';
        this.cursor = 'pointer';
        this.hitArea = new Rectangle(0, 0, CELL_W, CELL_H);
        this.on('pointerenter', () => {
            this.hover.target = 1;
            this.wiggle.v += 4;
        });
        this.on('pointerleave', () => {
            this.hover.target = 0;
            this.press.target = 0;
        });
        this.on('pointerdown', () => (this.press.target = 1));
        this.on('pointerup', () => (this.press.target = 0));
        this.on('pointerupoutside', () => (this.press.target = 0));
        this.on('pointertap', () => {
            if (options.isDragging()) return;
            this.pop.v += 3.5;
            this.jump.v += 8;
            this.wiggle.v += (Math.random() < 0.5 ? -1 : 1) * 6;
            this.addRipple();
            this.burst(3);
        });

        this.updateChip(true);
        this.update(0, 0);
    }

    // ---------- API ----------

    /** Xuất hiện sau `delay` giây; `burst` = bắn sao khi vừa hiện (dùng cho vật phẩm mới nhận). */
    playEnter(delay: number, burst: boolean): void {
        this.enter.snap(0);
        this.enter.target = 1;
        this.enterDelay = delay;
        this.age = 0;
        this.burstOnEnter = burst;
        this.visible = false;
    }

    /** Số lượng đổi: đếm dần, huy hiệu nảy, chữ +N / -N bay lên. */
    setQuantity(next: number): void {
        if (next === this.quantity) return;
        const delta = next - this.quantity;
        this.quantity = next;
        this.chipPop.v += delta > 0 ? 9 : -5;
        this.pop.v += delta > 0 ? 2 : 0;
        this.spawnFloat(delta);
        if (delta > 0) this.burst(3);
    }

    cancelPress(): void {
        this.press.target = 0;
    }

    leave(): void {
        this.leaving = true;
        this.enter.target = 0;
        this.eventMode = 'none';
    }

    get isGone(): boolean {
        return this.leaving && this.enter.x < 0.02;
    }

    override destroy(options?: Parameters<Container['destroy']>[0]): void {
        super.destroy(options ?? { children: true });
    }

    // ---------- icon ----------

    private buildIcon(options: ItemCellOptions): void {
        const centerY = -ICON_UP;

        if (options.packFactory) {
            const pack = options.packFactory();
            pack.eventMode = 'none';
            pack.position.set(0, centerY);
            this.iconHolder.addChild(pack);
            return;
        }

        const placeholder = (): void => {
            const fallback = new Text({ text: '🎁', style: new TextStyle({ fontSize: 36 }) });
            fallback.anchor.set(0.5);
            fallback.position.set(0, centerY);
            this.iconHolder.addChild(fallback);
        };

        if (!options.asset) {
            placeholder();
            return;
        }

        const asset = options.asset;
        void Assets.load<Texture>(asset)
            .then((texture) => {
                if (this.destroyed) return;
                const sprite = new Sprite(texture);
                sprite.anchor.set(0.5);
                sprite.position.set(0, centerY);
                sprite.scale.set(62 / Math.max(texture.width, texture.height));
                sprite.eventMode = 'none';
                this.iconHolder.addChild(sprite);
            })
            .catch((error: unknown) => {
                console.warn(`Không tải được ảnh ${asset}`, error);
                if (!this.destroyed) placeholder();
            });
    }

    // ---------- hiệu ứng ----------

    private spawnFloat(delta: number): void {
        const t = new Text({
            text: `${delta > 0 ? '+' : '−'}${Math.abs(delta).toLocaleString('vi-VN')}`,
            style: font(16, delta > 0 ? C.gain : C.spend, '800', { color: C.cream, width: 4 }),
        });
        t.anchor.set(0.5, 1);
        t.position.set(this.chip.x, this.chip.y - 14);
        this.fxLayer.addChild(t);
        this.floats.push({ t, age: 0 });
    }

    private addRipple(): void {
        const g = new Graphics();
        this.fxLayer.addChild(g);
        this.ripples.push({ g, age: 0 });
    }

    private burst(count: number): void {
        for (let i = 0; i < count; i++) {
            const g = createStar();
            g.position.set(CELL_W / 2 + (Math.random() - 0.5) * 30, ICON_BASE_Y - ICON_UP);
            g.rotation = Math.random() * Math.PI * 2;
            this.fxLayer.addChild(g);

            const angle = -Math.PI / 2 + (Math.random() - 0.5) * 2.2;
            const speed = 80 + Math.random() * 90;
            this.particles.push({
                g,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                vr: (Math.random() - 0.5) * 5,
                age: 0,
                life: 0.55 + Math.random() * 0.3,
            });
        }
    }

    // ---------- vẽ ----------

    /** Vẽ lại huy hiệu số lượng khi số hiển thị đổi (độ rộng huy hiệu theo độ dài chữ). */
    private updateChip(force = false): void {
        const text = `×${Math.round(this.display).toLocaleString('vi-VN')}`;
        if (!force && text === this.shownText) return;
        this.shownText = text;
        this.qtyText.text = text;

        const w = Math.max(38, this.qtyText.width + 16);
        const h = 24;
        this.chipArt
            .clear()
            .roundRect(-w / 2 - 2, -h / 2 - 2, w + 4, h + 8, 11)
            .fill(C.outline)
            .roundRect(-w / 2, -h / 2 + 3, w, h, 9)
            .fill(C.chipSide)
            .roundRect(-w / 2, -h / 2, w, h, 9)
            .fill(C.chipFace)
            .roundRect(-w / 2 + 2, -h / 2 + 2, w - 4, h * 0.42, 6)
            .fill({ color: C.chipHi, alpha: 0.6 });
        this.chip.position.set(CELL_W - 10 - w / 2, FACE_H - 12 - h / 2);
    }

    private drawCard(top: number): void {
        const w = CELL_W;
        this.art
            .clear()
            .roundRect(-2, top - 2, w + 4, SIDE + FACE_H - top + 4, 14)
            .fill(C.outline)
            .roundRect(0, top + 10, w, SIDE + FACE_H - top - 10, 12)
            .fill(C.cardSide)
            .roundRect(0, top, w, FACE_H, 12)
            .fill(C.card)
            .roundRect(3, top + FACE_H * 0.68, w - 6, FACE_H * 0.28, 9)
            .fill({ color: C.cardShade, alpha: 0.12 })
            .roundRect(2, top + 2, w - 4, FACE_H - 4, 10)
            .stroke({ color: C.white, width: 2, alpha: 0.55 });
    }

    // ---------- cập nhật mỗi frame ----------

    public update(dt: number, time: number): void {
        this.age += dt;
        this.time = time;

        if (this.age < this.enterDelay) {
            this.visible = false;
            return;
        }
        if (!this.visible) {
            this.visible = true;
            if (this.burstOnEnter) {
                this.burstOnEnter = false;
                this.burst(5);
            }
        }

        this.enter.step(dt);
        this.hover.step(dt);
        this.press.step(dt);
        this.pop.step(dt);
        this.chipPop.step(dt);
        this.jump.step(dt);
        this.wiggle.step(dt);

        // trượt mượt tới vị trí trong lưới khi danh sách đổi
        const slide = 1 - Math.exp(-dt * 12);
        this.x += (this.targetX - this.x) * (dt === 0 ? 1 : slide);
        this.y += (this.targetY - this.y) * (dt === 0 ? 1 : slide);

        // số lượng đếm dần tới giá trị mới
        if (this.display !== this.quantity) {
            const diff = this.quantity - this.display;
            if (Math.abs(diff) < 0.5) this.display = this.quantity;
            else this.display += diff * (1 - Math.exp(-dt * 10));
            this.updateChip();
        }

        const e = Math.max(0, this.enter.x);
        const hv = this.hover.x;
        const pr = this.press.x;

        // ---- thẻ 3D: nhô lên khi hover, lún khi nhấn ----
        const top = SIDE - Math.max(1, 5 + 2.5 * hv - 3.5 * pr);
        this.drawCard(top);
        this.content.y = top;

        this.body.position.set(CELL_W / 2, CELL_H + (1 - e) * 26);
        this.body.scale.set(
            e * this.pop.x * (1 + 0.015 * hv + 0.01 * pr),
            e * this.pop.x * (1 + 0.015 * hv - 0.02 * pr),
        );
        this.body.alpha = clamp01(e * 1.8);

        // ---- bệ đặt icon: vầng sáng nhịp thở + bóng sàn ----
        const pulse = 0.5 + 0.5 * Math.sin(time * 2 + this.phase);
        this.stage
            .clear()
            .circle(CELL_W / 2, ICON_BASE_Y - ICON_UP, 32 + 1.5 * pulse + 3 * hv)
            .fill({ color: C.stage, alpha: 0.55 + 0.2 * hv })
            .ellipse(CELL_W / 2, ICON_BASE_Y + 1, 30 + 3 * hv, 6.5)
            .fill({ color: C.stageFloor, alpha: 0.75 });

        // ---- icon: nhún nhẹ, to ra + lắc khi hover, nhảy khi bấm ----
        const bob = Math.sin(time * 2 + this.phase) * 1.8;
        const s = 1 + 0.1 * hv + 0.12 * this.jump.x;
        this.iconHolder.position.set(
            CELL_W / 2,
            ICON_BASE_Y - bob - 2 * hv - Math.max(0, this.jump.x) * 9,
        );
        this.iconHolder.scale.set(s * (1 + 0.04 * pr), s * (1 - 0.05 * pr));
        this.iconHolder.rotation = this.wiggle.x * 0.15 + Math.sin(time * 1.4 + this.phase) * 0.02;

        // ---- huy hiệu số lượng: nảy khi đổi ----
        this.chip.scale.set(1 + 0.25 * this.chipPop.x);

        this.updateFx(dt);
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
            const rad = 44 * eased;
            r.g.clear()
                .ellipse(CELL_W / 2, this.content.y + ICON_BASE_Y, rad, rad * 0.3)
                .fill({ color: C.chipFace, alpha: 0.18 * (1 - t) })
                .stroke({ color: C.chipFace, width: 2.5 * (1 - t) + 0.5, alpha: 0.85 * (1 - t) });
        }

        for (let i = this.floats.length - 1; i >= 0; i--) {
            const f = this.floats[i];
            f.age += dt;
            const t = f.age / 0.9;
            if (t >= 1) {
                f.t.destroy();
                this.floats.splice(i, 1);
                continue;
            }
            const rise = 1 - Math.pow(1 - t, 3);
            f.t.y = this.chip.y + this.content.y - 14 - rise * 24;
            f.t.alpha = t < 0.65 ? 1 : 1 - (t - 0.65) / 0.35;
            f.t.scale.set(t < 0.15 ? 0.6 + (t / 0.15) * 0.55 : 1.15);
        }

        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.age += dt;
            if (p.age >= p.life) {
                p.g.destroy();
                this.particles.splice(i, 1);
                continue;
            }
            p.vy += 140 * dt;
            p.vx *= 1 - 1.2 * dt;
            p.g.x += p.vx * dt;
            p.g.y += p.vy * dt + 0;
            p.g.rotation += p.vr * dt;

            const t = p.age / p.life;
            p.g.alpha = 1 - t * t;
            p.g.scale.set(1 + Math.sin(t * Math.PI) * 0.5);
        }
    }
}

// ==============================================================
// KHO CHỨA
// ==============================================================

const keyOf = (item: InventoryItem) => `${item.itemType}:${item.itemId}`;

/** Kho chứa dùng chung Inventory của GameStore, cập nhật khi mua / thu hoạch. */
export class StorageDialog extends Container {
    private readonly dialog: GameDialog;
    private readonly body = new Container();
    private readonly tabs: GameTabBar;
    private readonly viewport = new Container();
    private readonly grid = new Container();
    private readonly clip = new Graphics();
    private readonly thumb = new Graphics();
    private readonly emptyIcon = new Text({ text: '🌱', style: new TextStyle({ fontSize: 44 }) });
    private readonly emptyText = new Text({
        text: 'Chưa có vật phẩm trong kho',
        style: font(19, C.muted, '700', { color: C.cream, width: 3 }),
    });
    private readonly emptyPop = new Spring(0, 200, 11);

    private readonly cells = new Map<string, StorageItemCell>();
    private leavingCells: StorageItemCell[] = [];

    private activeTab: StorageTab = 'flower';
    private scrollY = 0; // vị trí đang hiển thị (đã làm mượt)
    private scrollTarget = 0;
    private maxScrollY = 0;
    private thumbTimer = 0;
    private dragStartY: number | null = null;
    private dragScrollStart = 0;
    private moved = false;
    private time = 0;
    private unsubscribe?: () => void;
    private readonly ticker = (ticker: Ticker) => this.tick(ticker);

    constructor() {
        super();
        this.dialog = new GameDialog({
            title: 'KHO CHỨA',
            width: 440,
            height: 600,
            content: this.body,
            actions: [{ label: 'Đóng', kind: 'primary', onClick: () => undefined }],
            onClose: () => this.stopWatching(),
        });
        this.addChild(this.dialog);

        this.tabs = new GameTabBar({
            width: CONTENT_WIDTH,
            intro: false,
            tabs: [
                { id: 'flower', label: 'Hoa' },
                { id: 'seed', label: 'Hạt giống' },
                { id: 'item', label: 'Vật phẩm' },
            ],
            onChange: (_index, tab) => {
                this.activeTab = tab.id as StorageTab;
                this.scrollTarget = 0;
                this.scrollY = 0;
                this.renderItems(0.05); // đổi tab: dựng lại và cho các ô nảy lên lần lượt
            },
        });
        this.body.addChild(this.tabs);

        this.viewport.position.set(0, 90);
        this.viewport.eventMode = 'static';
        this.viewport.hitArea = new Rectangle(0, 0, CONTENT_WIDTH, VIEWPORT_HEIGHT);
        this.clip.rect(0, 0, CONTENT_WIDTH, VIEWPORT_HEIGHT).fill(0xffffff);
        this.grid.position.x = GRID_X;
        this.viewport.addChild(this.grid, this.clip, this.thumb);
        this.grid.mask = this.clip;
        this.body.addChild(this.viewport);

        this.emptyIcon.anchor.set(0.5);
        this.emptyIcon.position.set(CONTENT_WIDTH / 2, VIEWPORT_HEIGHT / 2 - 30);
        this.emptyText.anchor.set(0.5);
        this.emptyText.position.set(CONTENT_WIDTH / 2, VIEWPORT_HEIGHT / 2 + 14);
        this.viewport.addChild(this.emptyIcon, this.emptyText);
        this.emptyIcon.visible = false;
        this.emptyText.visible = false;

        // Cuộn bằng chuột hoặc vuốt trên màn hình cảm ứng.
        this.viewport.on('wheel', (event) => {
            this.scrollBy(event.deltaY);
            event.preventDefault();
        });
        this.viewport.on('pointerdown', (event) => {
            this.dragStartY = event.getLocalPosition(this.viewport).y;
            this.dragScrollStart = this.scrollTarget;
            this.moved = false;
        });
        this.viewport.on('globalpointermove', (event) => {
            if (this.dragStartY === null) return;
            const dy = event.getLocalPosition(this.viewport).y - this.dragStartY;
            if (Math.abs(dy) > 7 && !this.moved) {
                this.moved = true;
                // đang kéo cuộn: các ô không còn ở trạng thái "đang nhấn"
                for (const cell of this.cells.values()) cell.cancelPress();
            }
            if (this.moved) this.setScrollTarget(this.dragScrollStart - dy);
        });
        const endDrag = (): void => {
            this.dragStartY = null;
            // giữ moved = true thêm một nhịp để cú thả tay không bị tính là bấm vào ô
            setTimeout(() => { this.moved = false; }, 0);
        };
        this.viewport.on('pointerup', endDrag);
        this.viewport.on('pointerupoutside', endDrag);

        Ticker.shared.add(this.ticker);
    }

    open(): void {
        this.stopWatching();
        this.unsubscribe = gameStore.subscribe(() => this.renderItems());
        this.renderItems(0.32); // chờ bảng bật ra rồi các ô mới nảy lên lần lượt
        this.dialog.open();
    }

    close(): void { this.dialog.close(); }
    resize(width: number, height: number): void { this.dialog.resize(width, height); }

    private stopWatching(): void {
        this.unsubscribe?.();
        this.unsubscribe = undefined;
        this.dragStartY = null;
    }

    private scrollBy(amount: number): void {
        this.setScrollTarget(this.scrollTarget + amount);
    }

    private setScrollTarget(y: number): void {
        const next = Math.max(0, Math.min(this.maxScrollY, y));
        if (next !== this.scrollTarget) this.thumbTimer = 1.2; // hiện thanh cuộn một lúc
        this.scrollTarget = next;
    }

    /**
     * Đồng bộ lưới ô với kho.
     * - `introDelay` có giá trị: dựng lại từ đầu, các ô nảy lên lần lượt (mở kho / đổi tab).
     * - `introDelay` bỏ trống (kho thay đổi khi đang mở): giữ nguyên ô cũ, chỉ cập nhật số lượng,
     *   ô mới nảy ra, ô hết hàng thu nhỏ rồi biến mất, các ô còn lại trượt về đúng chỗ.
     */
    private renderItems(introDelay?: number): void {
        const replay = introDelay !== undefined;

        if (replay) {
            for (const cell of this.cells.values()) cell.destroy({ children: true });
            for (const cell of this.leavingCells) cell.destroy({ children: true });
            this.cells.clear();
            this.leavingCells = [];
        }

        const inventory = gameStore.inventory.toJSON().filter((entry) => entry.quantity > 0);
        const items = inventory.filter((entry) => {
            if (this.activeTab === 'flower') return entry.itemType === 'flower';
            if (this.activeTab === 'seed') return entry.itemType === 'seed';
            return entry.itemType !== 'flower' && entry.itemType !== 'seed';
        });

        // ô hết hàng -> thu nhỏ rồi xoá
        const activeKeys = new Set(items.map(keyOf));
        for (const [key, cell] of this.cells) {
            if (activeKeys.has(key)) continue;
            cell.leave();
            this.leavingCells.push(cell);
            this.cells.delete(key);
        }

        items.forEach((item, index) => {
            const key = keyOf(item);
            const tx = (index % COLS) * (CELL_W + GAP);
            const ty = GRID_PAD_TOP + Math.floor(index / COLS) * (CELL_H + GAP);

            let cell = this.cells.get(key);
            if (!cell) {
                cell = this.makeItemCell(item);
                cell.targetX = tx;
                cell.targetY = ty;
                cell.position.set(tx, ty);
                this.grid.addChild(cell);
                this.cells.set(key, cell);
                // dựng lại: nảy lên lần lượt; vật phẩm mới nhận khi đang mở: nảy ra + bắn sao
                if (replay) cell.playEnter((introDelay ?? 0) + Math.min(0.5, index * 0.045), false);
                else cell.playEnter(0, true);
            } else {
                cell.targetX = tx;
                cell.targetY = ty;
                cell.setQuantity(item.quantity);
            }
        });

        const rows = Math.ceil(items.length / COLS);
        const contentHeight = rows
            ? GRID_PAD_TOP + rows * CELL_H + (rows - 1) * GAP + GRID_PAD_BOTTOM
            : 0;
        this.maxScrollY = Math.max(0, contentHeight - VIEWPORT_HEIGHT);
        this.setScrollTarget(this.scrollTarget);

        const empty = items.length === 0;
        this.emptyIcon.visible = empty;
        this.emptyText.visible = empty;
        this.emptyPop.target = empty ? 1 : 0;
        if (!empty) this.emptyPop.snap(0);
    }

    private makeItemCell(item: InventoryItem): StorageItemCell {
        const name = item.itemType === 'flower' ? getFlowerVariantById(item.itemId)?.name
            : item.itemType === 'seed' ? getFlowerSeedById(item.itemId)?.name
                : item.itemType === 'pot' ? getPotById(item.itemId)?.name
                    : `Vật phẩm #${item.itemId}`;
        const asset = item.itemType === 'flower' ? getFlowerVariantById(item.itemId)?.product
            : item.itemType === 'pot' ? getPotById(item.itemId)?.assetUrl : undefined;
        const seed = item.itemType === 'seed' ? getFlowerSeedById(item.itemId) : undefined;

        return new StorageItemCell({
            key: keyOf(item),
            name: name ?? `#${item.itemId}`,
            quantity: item.quantity,
            asset,
            packFactory: seed ? () => new SeedPack(seed, { size: 63, labelScale: 0.5 }) : undefined,
            isDragging: () => this.moved,
        });
    }

    // ==========================================
    // CẬP NHẬT MỖI FRAME
    // ==========================================

    private tick(ticker: Ticker): void {
        if (!this.dialog.visible) return;
        const dt = Math.min(ticker.deltaMS / 1000, 1 / 30);
        this.time += dt;

        // cuộn mượt tới vị trí đích
        this.scrollY += (this.scrollTarget - this.scrollY) * (1 - Math.exp(-dt * 16));
        if (Math.abs(this.scrollTarget - this.scrollY) < 0.05) this.scrollY = this.scrollTarget;
        this.grid.y = -this.scrollY;

        for (const cell of this.cells.values()) cell.update(dt, this.time);
        for (let i = this.leavingCells.length - 1; i >= 0; i--) {
            const cell = this.leavingCells[i];
            cell.update(dt, this.time);
            if (cell.isGone) {
                cell.destroy({ children: true });
                this.leavingCells.splice(i, 1);
            }
        }

        // thanh cuộn: hiện khi đang cuộn, mờ dần khi đứng yên
        this.thumbTimer = Math.max(0, this.thumbTimer - dt);
        this.thumb.clear();
        if (this.maxScrollY > 0 && this.thumbTimer > 0) {
            const alpha = clamp01(this.thumbTimer / 0.4);
            const h = Math.max(24, VIEWPORT_HEIGHT ** 2 / (VIEWPORT_HEIGHT + this.maxScrollY));
            const y = this.scrollY / this.maxScrollY * (VIEWPORT_HEIGHT - h);
            this.thumb
                .roundRect(CONTENT_WIDTH - 5, y, 4, h, 2)
                .fill({ color: C.scroll, alpha: 0.95 * alpha })
                .roundRect(CONTENT_WIDTH - 5, y, 4, h, 2)
                .stroke({ color: C.outline, width: 1, alpha: 0.7 * alpha });
        }

        // trạng thái trống: biểu tượng nhún + hiện dần
        this.emptyPop.step(dt);
        if (this.emptyText.visible) {
            const k = Math.max(0, this.emptyPop.x);
            this.emptyIcon.position.y = VIEWPORT_HEIGHT / 2 - 30 + Math.sin(this.time * 2.4) * 3 + (1 - k) * 14;
            this.emptyIcon.scale.set(0.6 + 0.4 * k);
            this.emptyIcon.alpha = clamp01(k * 1.8);
            this.emptyText.alpha = clamp01(k * 1.8);
        }
    }

    override destroy(options?: Parameters<Container['destroy']>[0]): void {
        this.stopWatching();
        Ticker.shared.remove(this.ticker);
        super.destroy(options ?? { children: true });
    }
}