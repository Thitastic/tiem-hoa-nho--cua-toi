
import {
    Assets,
    Container,
    Graphics,
    Rectangle,
    Sprite,
    Text,
    TextStyle,
    Texture,
} from "pixi.js";

// =====================================================
// TYPES
// =====================================================

export interface ImageButtonOptions {
    image: string;
    label: string;

    // Kích thước ảnh
    imageWidth?: number;
    imageHeight?: number;

    // Khoảng cách giữa ảnh và nhãn
    gap?: number;

    // Nhãn
    labelWidth?: number;
    labelHeight?: number;

    // Font chữ
    fontFamily?: string;
    fontSize?: number;
    fontColor?: number;

    // Nền nhãn
    labelBackground?: number;
    labelRadius?: number;

    // Sự kiện
    onClick?: () => void;
}

// =====================================================
// DEFAULT CONFIG
// =====================================================

const DEFAULTS = {
    imageWidth: 54,
    imageHeight: 54,

    gap: 3,

    labelWidth: 70,
    labelHeight: 20,

    fontFamily: "Arial, sans-serif",
    fontSize: 12,
    fontColor: 0xffffff,

    labelBackground: 0x315f45,
    labelRadius: 6,
};

// =====================================================
// IMAGE BUTTON COMPONENT
// =====================================================

export class ImageButton extends Container {
    private options: Required<
        Omit<ImageButtonOptions, "onClick">
    >;

    private onClick?: () => void;

    private imageContainer = new Container();
    private labelContainer = new Container();

    private imageSprite?: Sprite;

    private labelText!: Text;
    private labelBackground!: Graphics;

    private pressed = false;

    constructor(options: ImageButtonOptions) {
        super();

        this.options = {
            image: options.image,
            label: options.label,

            imageWidth:
                options.imageWidth ??
                DEFAULTS.imageWidth,

            imageHeight:
                options.imageHeight ??
                DEFAULTS.imageHeight,

            gap:
                options.gap ??
                DEFAULTS.gap,

            labelWidth:
                options.labelWidth ??
                DEFAULTS.labelWidth,

            labelHeight:
                options.labelHeight ??
                DEFAULTS.labelHeight,

            fontFamily:
                options.fontFamily ??
                DEFAULTS.fontFamily,

            fontSize:
                options.fontSize ??
                DEFAULTS.fontSize,

            fontColor:
                options.fontColor ??
                DEFAULTS.fontColor,

            labelBackground:
                options.labelBackground ??
                DEFAULTS.labelBackground,

            labelRadius:
                options.labelRadius ??
                DEFAULTS.labelRadius,
        };

        this.onClick = options.onClick;

        this.createLayout();
        this.setupEvents();

        void this.loadImage(
            this.options.image
        ).catch((error: unknown) => {
            console.error(
                "Không tải được ảnh nút:",
                error
            );
        });
    }

    // =====================================================
    // LAYOUT
    // =====================================================

    private createLayout(): void {
        const cfg = this.options;

        const totalWidth = Math.max(
            cfg.imageWidth,
            cfg.labelWidth
        );

        const totalHeight =
            cfg.imageHeight +
            cfg.gap +
            cfg.labelHeight;

        // Đặt vùng tương tác tại góc trên bên trái
        this.hitArea = new Rectangle(
            0,
            0,
            totalWidth,
            totalHeight
        );

        // ===================================
        // IMAGE CONTAINER
        // Không có background và border
        // ===================================

        this.imageContainer.position.set(
            totalWidth / 2,
            cfg.imageHeight / 2
        );

        this.addChild(this.imageContainer);

        // ===================================
        // LABEL CONTAINER
        // ===================================

        this.labelContainer.position.set(
            (totalWidth - cfg.labelWidth) / 2,
            cfg.imageHeight + cfg.gap
        );

        this.addChild(this.labelContainer);

        // Hình chữ nhật nhỏ dưới ảnh
        this.labelBackground = new Graphics()
            .roundRect(
                0,
                0,
                cfg.labelWidth,
                cfg.labelHeight,
                cfg.labelRadius
            )
            .fill(cfg.labelBackground);

        this.labelContainer.addChild(
            this.labelBackground
        );

        // Chữ trên nhãn
        this.labelText = new Text({
            text: cfg.label,
            style: new TextStyle({
                fontFamily: cfg.fontFamily,
                fontSize: cfg.fontSize,
                fontWeight: "bold",
                fill: cfg.fontColor,
                align: "center",
            }),
        });

        this.labelText.anchor.set(0.5);

        this.labelText.position.set(
            cfg.labelWidth / 2,
            cfg.labelHeight / 2
        );

        this.labelContainer.addChild(
            this.labelText
        );
    }

    // =====================================================
    // LOAD PNG
    // =====================================================

    private async loadImage(
        path: string
    ): Promise<void> {
        const texture =
            await Assets.load<Texture>(path);

        if (this.destroyed) return;

        // Xóa ảnh cũ nếu có
        if (this.imageSprite) {
            this.imageContainer.removeChild(
                this.imageSprite
            );

            this.imageSprite.destroy();
        }

        const sprite = new Sprite(texture);

        sprite.anchor.set(0.5);

        sprite.position.set(0, 0);

        // Giữ nguyên tỷ lệ ảnh PNG
        const scale = Math.min(
            this.options.imageWidth /
            texture.width,

            this.options.imageHeight /
            texture.height
        );

        sprite.width = texture.width * scale;
        sprite.height = texture.height * scale;

        this.imageContainer.addChild(sprite);

        this.imageSprite = sprite;
    }

    // =====================================================
    // EVENTS
    // =====================================================

    private setupEvents(): void {
        this.eventMode = "static";
        this.cursor = "pointer";

        this.on("pointerdown", () => {
            this.setPressed(true);
        });

        this.on("pointerup", () => {
            this.setPressed(false);
        });

        this.on("pointerupoutside", () => {
            this.setPressed(false);
        });

        this.on("pointercancel", () => {
            this.setPressed(false);
        });

        this.on("pointertap", () => {
            this.onClick?.();
        });
    }

    private setPressed(value: boolean): void {
        if (this.pressed === value) return;

        this.pressed = value;

        // Chỉ thu nhỏ phần ảnh
        this.imageContainer.scale.set(
            value ? 0.92 : 1
        );
    }

    // =====================================================
    // METHODS
    // =====================================================

    public setLabel(value: string): void {
        this.labelText.text = value;
    }

    public setLabelColor(
        color: number
    ): void {
        this.labelBackground.tint = color;
    }

    public setOnClick(
        callback: () => void
    ): void {
        this.onClick = callback;
    }
}
