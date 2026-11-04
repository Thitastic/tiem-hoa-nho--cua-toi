
import {
    Assets,
    Container,
    Graphics,
    Sprite,
    Text,
    TextStyle,
    Texture,
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

export class CurrencyFrame extends Container {
    private readonly type: CurrencyType;
    private readonly onPlus?: () => void;

    private value: number;
    private valueText!: Text;
    private border!: Graphics;

    constructor(options: CurrencyFrameOptions) {
        super();

        this.type = options.type;
        this.onPlus = options.onPlus;

        this.value = this.clamp(
            options.value ?? 0
        );

        this.renderFrame();

        void this.loadIcon().catch((error: unknown) => {
            console.error(
                `Không tải được icon ${this.type}:`,
                error
            );
        });
    }

    private get theme() {
        return THEMES[this.type];
    }

    private clamp(value: number): number {
        if (!Number.isFinite(value)) return 0;

        return Math.max(
            0,
            Math.min(
                this.theme.max,
                Math.round(value)
            )
        );
    }

    private renderFrame(): void {
        const theme = this.theme;

        // Khung chính
        this.border = new Graphics()
            .roundRect(
                0, 0,
                UI.width,
                UI.height,
                15
            )
            .fill(theme.dark)

            .roundRect(
                2, 2,
                UI.width - 4,
                UI.height - 4,
                13
            )
            .fill(theme.main)

            .roundRect(
                4, 4,
                UI.width - 8,
                UI.height - 8,
                11
            )
            .fill(0x11152c);

        this.addChild(this.border);

        // Ánh sáng bên trong
        this.addChild(
            new Graphics()
                .roundRect(
                    5, 5,
                    UI.width - 10,
                    9,
                    5
                )
                .fill({
                    color: 0x394269,
                    alpha: 0.4,
                })
        );

        // Giá trị tiền
        this.valueText = new Text({
            text: "",
            style: new TextStyle({
                fontFamily: UI.fontFamily,
                fontSize: UI.fontSize,
                fontWeight: UI.fontWeight,
                fill: theme.light,
            }),
        });

        this.valueText.anchor.set(1, 0.5);
        this.valueText.position.set(
            UI.valueRightX,
            UI.valueY
        );

        this.addChild(this.valueText);

        // Nút cộng
        const plus = new Container();

        const plusBackground = new Graphics()
            .circle(
                0,
                0,
                UI.plusRadius
            )
            .fill(0x145a1e)

            .circle(0, 0, 10.5)
            .fill(0x39b54a);

        plus.addChild(plusBackground);

        const plusText = new Text({
            text: "+",
            style: new TextStyle({
                fontFamily: "Arial",
                fontSize: 21,
                fontWeight: "bold",
                fill: 0xffffff,
            }),
        });

        plusText.anchor.set(0.5);
        plusText.position.set(0, -1);

        plus.addChild(plusText);

        plus.position.set(
            UI.plusX,
            UI.plusY
        );

        plus.eventMode = "static";
        plus.cursor = "pointer";

        plus.on("pointertap", () => {
            this.onPlus?.();
        });

        this.addChild(plus);

        this.updateDisplay();
    }

    // =============================================
    // TẢI ẢNH ICON PNG
    // =============================================

    private async loadIcon(): Promise<void> {
        const texture = await Assets.load<Texture>(
            this.theme.asset
        );

        if (this.destroyed) return;

        const sprite = new Sprite(texture);

        sprite.anchor.set(0.5);
        sprite.position.set(
            UI.iconX,
            UI.iconY
        );

        // Giữ tỷ lệ ảnh
        const scale = UI.iconSize /
            Math.max(texture.width, texture.height);

        sprite.width = texture.width * scale;
        sprite.height = texture.height * scale;

        // Icon nằm trên khung
        this.addChild(sprite);
    }

    private updateDisplay(): void {
        this.valueText.text =
            this.value.toLocaleString("vi-VN");

        const isMax =
            this.value >= this.theme.max;

        this.valueText.style.fill = isMax
            ? 0xffffff
            : this.theme.light;
    }

    public setValue(value: number): void {
        this.value = this.clamp(value);
        this.updateDisplay();
    }

    public addValue(amount: number): void {
        this.setValue(this.value + amount);
    }

    public getValue(): number {
        return this.value;
    }

    public getMax(): number {
        return this.theme.max;
    }
}
