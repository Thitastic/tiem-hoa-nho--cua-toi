
import {
    Assets,
    Container,
    Graphics,
    Sprite,
    Text,
    TextStyle,
    Texture,
} from "pixi.js";

export type AvatarTheme =
    | "gold"
    | "silver"
    | "ruby"
    | "emerald";

export interface AvatarOptions {
    level?: number;
    exp?: number;
    theme?: AvatarTheme;
    avatarUrl?: string;
    avatarTexture?: Texture;
}

const THEMES = {
    gold: {
        light: 0xfff3b0,
        main: 0xe0a526,
        dark: 0x8a5a00,
    },
    silver: {
        light: 0xffffff,
        main: 0xb9c2d6,
        dark: 0x5d6680,
    },
    ruby: {
        light: 0xffd0d6,
        main: 0xe0344f,
        dark: 0x7a0f23,
    },
    emerald: {
        light: 0xd4ffe6,
        main: 0x2fc27d,
        dark: 0x0b5a38,
    },
} as const;

// =============================================
// THÔNG SỐ GIAO DIỆN - CHỈNH TẠI ĐÂY
// =============================================

const UI_CONFIG = {
    frameWidth: 200,
    frameHeight: 60,

    // Avatar
    avatarX: 30,
    avatarY: 30,
    avatarDiameter: 43,
    avatarRadius: 21.5,

    // Level
    levelFontFamily: "Arial, sans-serif",
    levelFontSize: 20,
    levelFontWeight: "900" as const,
    levelItalic: true,
    levelX: 62,
    levelY: 8,

    // EXP
    expFontFamily: "Arial, sans-serif",
    expFontSize: 12,
    expFontWeight: "600" as const,
    expRightX: 185,
    expY: 16,

    // Thanh EXP
    barX: 65,
    barY: 42,
    barWidth: 117,
    barHeight: 8,
    barInset: 2,
};

export class AvatarFrame extends Container {
    private level: number;
    private exp: number;
    private theme: AvatarTheme;

    private avatarTexture?: Texture;
    private avatarLoadVersion = 0;

    private expFill = new Graphics();
    private levelText!: Text;
    private expText!: Text;

    constructor(options: AvatarOptions = {}) {
        super();

        this.level = Math.max(
            1,
            Math.floor(options.level ?? 12)
        );

        this.exp = Math.max(
            0,
            Math.floor(options.exp ?? 1840)
        );

        this.theme = options.theme ?? "gold";
        this.avatarTexture = options.avatarTexture;

        this.normalizeExp();
        this.renderFrame();

        if (options.avatarUrl) {
            void this.setAvatarUrl(
                options.avatarUrl
            ).catch(console.error);
        }
    }

    private expRequired(): number {
        return 500 + (this.level - 1) * 250;
    }

    private normalizeExp(): void {
        while (this.exp >= this.expRequired()) {
            this.exp -= this.expRequired();
            this.level++;
        }
    }

    private renderFrame(): void {
        this.removeChildren().forEach(child => {
            child.destroy({ children: true });
        });

        this.expFill = new Graphics();

        const palette = THEMES[this.theme];
        const cfg = UI_CONFIG;

        // Khung chính
        this.addChild(
            new Graphics()
                .roundRect(
                    0, 0,
                    cfg.frameWidth,
                    cfg.frameHeight,
                    25
                )
                .fill(palette.dark)

                .roundRect(
                    2, 2,
                    cfg.frameWidth - 4,
                    cfg.frameHeight - 4,
                    23
                )
                .fill(palette.main)

                .roundRect(
                    4, 4,
                    cfg.frameWidth - 8,
                    cfg.frameHeight - 8,
                    21
                )
                .fill(0x171c3c)
        );

        // Ánh sáng phía trên khung
        this.addChild(
            new Graphics()
                .roundRect(
                    6, 5,
                    cfg.frameWidth - 12,
                    19,
                    10
                )
                .fill({
                    color: 0x394269,
                    alpha: 0.55,
                })
        );

        // Viền avatar
        this.addChild(
            new Graphics()
                .circle(
                    cfg.avatarX,
                    cfg.avatarY,
                    23
                )
                .fill(palette.dark)

                .circle(
                    cfg.avatarX,
                    cfg.avatarY,
                    21
                )
                .fill(palette.main)

                .circle(
                    cfg.avatarX,
                    cfg.avatarY,
                    cfg.avatarRadius
                )
                .fill(0x263b67)
        );

        // Ảnh avatar được cắt tròn
        if (this.avatarTexture) {
            const sprite = new Sprite(
                this.avatarTexture
            );

            sprite.anchor.set(0.5);
            sprite.position.set(
                cfg.avatarX,
                cfg.avatarY
            );

            const sourceW =
                this.avatarTexture.width || 1;

            const sourceH =
                this.avatarTexture.height || 1;

            // Object-fit: cover
            const scale =
                cfg.avatarDiameter /
                Math.min(sourceW, sourceH);

            sprite.width = sourceW * scale;
            sprite.height = sourceH * scale;

            const mask = new Graphics()
                .circle(
                    cfg.avatarX,
                    cfg.avatarY,
                    cfg.avatarRadius
                )
                .fill(0xffffff);

            this.addChild(mask, sprite);
            sprite.mask = mask;
        }

        // Level
        this.levelText = new Text({
            text: "",
            style: new TextStyle({
                fontFamily: cfg.levelFontFamily,
                fontSize: cfg.levelFontSize,
                fontWeight: cfg.levelFontWeight,
                fontStyle: cfg.levelItalic
                    ? "italic"
                    : "normal",
                fill: palette.light,
            }),
        });

        this.levelText.position.set(
            cfg.levelX,
            cfg.levelY
        );

        this.addChild(this.levelText);

        // Số EXP
        this.expText = new Text({
            text: "",
            style: new TextStyle({
                fontFamily: cfg.expFontFamily,
                fontSize: cfg.expFontSize,
                fontWeight: cfg.expFontWeight,
                fill: 0xf3f4ff,
            }),
        });

        this.expText.anchor.set(1, 0);
        this.expText.position.set(
            cfg.expRightX,
            cfg.expY
        );

        this.addChild(this.expText);

        // Nền thanh EXP
        this.addChild(
            new Graphics()
                .roundRect(
                    cfg.barX,
                    cfg.barY,
                    cfg.barWidth,
                    cfg.barHeight,
                    cfg.barHeight / 2
                )
                .fill(0x080b20)

                .roundRect(
                    cfg.barX,
                    cfg.barY,
                    cfg.barWidth,
                    cfg.barHeight,
                    cfg.barHeight / 2
                )
                .stroke({
                    color: 0x41465c,
                    width: 1,
                })
        );

        this.addChild(this.expFill);

        this.updateDisplay();
    }

    private updateDisplay(): void {
        const required = this.expRequired();

        const progress = Math.min(
            this.exp / required,
            1
        );

        this.levelText.text =
            `Lv. ${this.level}`;

        this.expText.text =
            `${this.exp}/${required}`;

        const cfg = UI_CONFIG;

        const innerWidth = Math.max(
            0,
            cfg.barWidth - cfg.barInset * 2
        );

        const innerHeight = Math.max(
            0,
            cfg.barHeight - cfg.barInset * 2
        );

        const fillWidth =
            innerWidth * progress;

        this.expFill.clear();

        if (fillWidth > 0 && innerHeight > 0) {
            this.expFill
                .roundRect(
                    cfg.barX + cfg.barInset,
                    cfg.barY + cfg.barInset,
                    fillWidth,
                    innerHeight,
                    Math.min(
                        innerHeight / 2,
                        fillWidth / 2
                    )
                )
                .fill(
                    THEMES[this.theme].main
                );
        }
    }

    public addExp(amount: number): void {
        if (
            !Number.isFinite(amount) ||
            amount <= 0
        ) return;

        this.exp += Math.floor(amount);
        this.normalizeExp();
        this.updateDisplay();
    }

    /** Đồng bộ trực tiếp level/EXP từ Player, không cộng EXP thêm lần nữa. */
    public setProgress(level: number, exp: number): void {
        this.level = Math.max(1, Math.floor(level));
        this.exp = Math.max(0, Math.floor(exp));
        this.normalizeExp();
        this.updateDisplay();
    }

    public setTheme(theme: AvatarTheme): void {
        this.theme = theme;
        this.renderFrame();
    }

    public setAvatar(texture: Texture): void {
        this.avatarLoadVersion++;
        this.avatarTexture = texture;
        this.renderFrame();
    }

    public async setAvatarUrl(
        url: string
    ): Promise<void> {
        const version =
            ++this.avatarLoadVersion;

        const texture =
            await Assets.load<Texture>(url);

        if (
            version !== this.avatarLoadVersion ||
            this.destroyed
        ) return;

        this.avatarTexture = texture;
        this.renderFrame();
    }

    public getLevel(): number {
        return this.level;
    }

    public getExp(): number {
        return this.exp;
    }
}
