
import {
    Container,
    Graphics,
    Text,
    TextStyle,
    Rectangle,
} from "pixi.js";

// Components
import { AvatarFrame } from "../components/AvatarFrame";
import { CurrencyFrame } from "../components/CurrencyFrame";
import { ImageButton } from "../components/ImageButton";

// Scenes
import { BaseScene } from "../scenes/BaseScene";
import { GreenhouseScene } from "../scenes/GreenhouseScene";
import { ToolShopScene } from "../scenes/ToolShopScene";
import { FlowerShopScene } from "../scenes/FlowerShopScene";
import { CreateBouquetScene } from "../scenes/CreateBouquetScene";

// =====================================================
// TYPES
// =====================================================

type SceneKey =
    | "greenhouse"
    | "tools"
    | "market"
    | "bouquet";

// =====================================================
// LAYOUT CONFIG
// =====================================================

const WIDTH = 540;

const HEADER_HEIGHT = 140;
const NAV_HEIGHT = 116;

const COLORS = {
    background: 0xfff8ed,
    header: 0xe8f0db,
    nav: 0xf0e7d4,

    green: 0x3e7052,
    white: 0xffffff,

    panel: 0xfffdf7,
    border: 0xdacfb9,

    text: 0x514b40,
    selected: 0xcfe6c5,
};

// =====================================================
// MAIN SCREEN
// =====================================================

export class MainScreen extends Container {
    private screenHeight = 960;

    // ===================================
    // MAIN CONTAINERS
    // ===================================

    private header = new Container();
    private content = new Container();
    private navigation = new Container();
    private floating = new Container();

    // ===================================
    // BACKGROUNDS
    // ===================================

    private backgroundGraphics = new Graphics();
    private contentBackground = new Graphics();
    private navigationBackground = new Graphics();

    // ===================================
    // HEADER COMPONENTS
    // ===================================

    private avatarFrame!: AvatarFrame;
    private coinFrame!: CurrencyFrame;
    private diamondFrame!: CurrencyFrame;

    // ===================================
    // SCENES
    // ===================================

    private activeScene: BaseScene | null = null;
    private activeKey: SceneKey = "greenhouse";

    private readonly scenes: Record<
        SceneKey,
        BaseScene
    > = {
        greenhouse: new GreenhouseScene(),
        tools: new ToolShopScene(),
        market: new FlowerShopScene(),
        bouquet: new CreateBouquetScene(),
    };

    // Navigation buttons
    private tabButtons = new Map<
        SceneKey,
        {
            background: Graphics;
            text: Text;
        }
    >();

    // =====================================================
    // CONSTRUCTOR
    // =====================================================

    constructor() {
        super();

        this.drawBackground();

        this.createContent();
        this.createHeader();
        this.createNavigation();
        this.createFloatingButtons();

        this.switchScene("greenhouse");

        this.resizeLayout(this.screenHeight);
    }

    // =====================================================
    // TEXT HELPER
    // =====================================================

    private createText(
        value: string,
        size = 18,
        color = COLORS.text,
        bold = false
    ): Text {
        return new Text({
            text: value,

            style: new TextStyle({
                fontFamily: "Arial, sans-serif",
                fontSize: size,
                fill: color,
                fontWeight: bold
                    ? "bold"
                    : "normal",
                align: "center",
            }),
        });
    }

    // =====================================================
    // PANEL HELPER
    // =====================================================

    private createPanel(
        width: number,
        height: number,
        color = COLORS.panel,
        radius = 14
    ): Graphics {
        return new Graphics()
            .roundRect(
                0,
                0,
                width,
                height,
                radius
            )
            .fill(color)

            .roundRect(
                0,
                0,
                width,
                height,
                radius
            )
            .stroke({
                color: COLORS.border,
                width: 1.5,
            });
    }

    // =====================================================
    // BASIC BUTTON HELPER
    //
    // Dùng tạm cho Navigation.
    // Các nút PNG sử dụng ImageButton.
    // =====================================================

    private createButton(
        text: string,
        width: number,
        height: number,
        onClick: () => void,
        color = COLORS.panel
    ): Container {
        const button = new Container();

        const background = this.createPanel(
            width,
            height,
            color
        );

        button.addChild(background);

        const title = this.createText(
            text,
            17,
            COLORS.green,
            true
        );

        title.anchor.set(0.5);

        title.position.set(
            width / 2,
            height / 2
        );

        button.addChild(title);

        button.eventMode = "static";
        button.cursor = "pointer";

        button.hitArea = new Rectangle(
            0,
            0,
            width,
            height
        );

        button.on("pointertap", onClick);

        return button;
    }

    // =====================================================
    // BACKGROUND
    // =====================================================

    private drawBackground(): void {
        this.addChild(this.backgroundGraphics);
    }

    // =====================================================
    // HEADER
    //
    // Avatar | Coin/Diamond | Mission | Catalog
    // =====================================================

    private createHeader(): void {
        this.addChild(this.header);

        // Background
        this.header.addChild(
            new Graphics()
                .rect(
                    0,
                    0,
                    WIDTH,
                    HEADER_HEIGHT
                )
                .fill(COLORS.header)
        );

        // ===================================
        // AVATAR FRAME
        // ===================================

        this.avatarFrame = new AvatarFrame({
            level: 12,
            exp: 1840,
            theme: "gold",
            avatarUrl:
                "/assets/avatar/player.png",
        });

        this.avatarFrame.position.set(
            12,
            45
        );

        this.header.addChild(
            this.avatarFrame
        );

        // ===================================
        // COIN FRAME
        // ===================================

        this.coinFrame = new CurrencyFrame({
            type: "coin",
            value: 12450,

            onPlus: () => {
                this.notify("Cửa hàng xu");
            },
        });

        this.coinFrame.position.set(
            232,
            43
        );

        this.header.addChild(
            this.coinFrame
        );

        // ===================================
        // DIAMOND FRAME
        // ===================================

        this.diamondFrame = new CurrencyFrame({
            type: "diamond",
            value: 386,

            onPlus: () => {
                this.notify(
                    "Cửa hàng kim cương"
                );
            },
        });

        this.diamondFrame.position.set(
            232,
            78
        );

        this.header.addChild(
            this.diamondFrame
        );

        // ===================================
        // MISSION BUTTON
        // ===================================

        const missionButton = new ImageButton({
            image: "/assets/ui/mission.png",
            label: "Nhiệm vụ",

            imageWidth: 54,
            imageHeight: 54,

            gap: 3,

            labelWidth: 70,
            labelHeight: 20,

            fontSize: 12,
            fontColor: 0xffffff,

            labelBackground: 0x315f45,
            labelRadius: 6,

            onClick: () => {
                this.notify("Nhiệm vụ");
            },
        });

        missionButton.position.set(
            370,
            41
        );

        this.header.addChild(missionButton);

        // ===================================
        // CATALOG BUTTON
        // ===================================

        const catalogButton = new ImageButton({
            image: "/assets/ui/catalog.png",
            label: "Bách khoa",

            imageWidth: 54,
            imageHeight: 54,

            gap: 3,

            labelWidth: 70,
            labelHeight: 20,

            fontSize: 12,
            fontColor: 0xffffff,

            labelBackground: 0x315f45,
            labelRadius: 6,

            onClick: () => {
                this.notify(
                    "Bách khoa hoa toàn thư"
                );
            },
        });

        catalogButton.position.set(
            455,
            41
        );

        this.header.addChild(catalogButton);
    }

    // =====================================================
    // GAME CONTENT
    // =====================================================

    private createContent(): void {
        this.content.position.set(
            0,
            HEADER_HEIGHT
        );

        this.addChild(this.content);

        this.content.addChild(
            this.contentBackground
        );
    }

    // =====================================================
    // NAVIGATION
    // =====================================================

    private createNavigation(): void {
        this.navigation.position.set(
            0,
            this.screenHeight - NAV_HEIGHT
        );

        this.addChild(this.navigation);

        this.navigation.addChild(
            this.navigationBackground
        );

        const tabs: {
            key: SceneKey;
            icon: string;
            name: string;
        }[] = [
            {
                key: "greenhouse",
                icon: "✿",
                name: "Nhà kính",
            },
            {
                key: "tools",
                icon: "⚒",
                name: "Nông cụ",
            },
            {
                key: "market",
                icon: "❀",
                name: "Bán hoa",
            },
            {
                key: "bouquet",
                icon: "✾",
                name: "Gói hoa",
            },
        ];

        tabs.forEach((tab, index) => {
            const tabWidth = 120;
            const tabHeight = 88;

            const x = 10 + index * 133;

            const button = this.createButton(
                `${tab.icon}\n${tab.name}`,
                tabWidth,
                tabHeight,

                () => {
                    this.switchScene(tab.key);
                }
            );

            button.position.set(x, 12);

            this.navigation.addChild(button);

            this.tabButtons.set(tab.key, {
                background:
                    button.children[0] as Graphics,

                text:
                    button.children[1] as Text,
            });
        });

        this.updateNavigation();
    }

    // =====================================================
    // FLOATING BUTTONS
    // =====================================================

    private createFloatingButtons(): void {
        this.floating.position.set(
            WIDTH - 68,
            HEADER_HEIGHT + 60
        );

        this.addChild(this.floating);

        const actions = [
            {
                icon: "✉",
                name: "Hộp thư",
            },
            {
                icon: "⚙",
                name: "Cài đặt",
            },
            {
                icon: "★",
                name: "Sự kiện",
            },
        ];

        actions.forEach((action, index) => {
            const button = this.createButton(
                action.icon,
                54,
                54,

                () => {
                    this.notify(action.name);
                }
            );

            button.position.set(
                0,
                index * 70
            );

            this.floating.addChild(button);
        });
    }

    // =====================================================
    // SWITCH SCENE
    // =====================================================

    public switchScene(key: SceneKey): void {
        // Thoát Scene cũ
        if (this.activeScene) {
            this.activeScene.onExit();

            this.content.removeChild(
                this.activeScene
            );
        }

        // Chọn Scene mới
        const scene = this.scenes[key];

        this.activeScene = scene;
        this.activeKey = key;

        scene.position.set(0, 0);

        this.content.addChild(scene);

        const contentHeight = Math.max(
            0,
            this.screenHeight -
            HEADER_HEIGHT -
            NAV_HEIGHT
        );

        scene.resize(
            WIDTH,
            contentHeight
        );

        // ===================================
        // PLACEHOLDER CHO SCENE TRỐNG
        // ===================================

        const placeholderName =
            "scene-placeholder";

        const existing =
            scene.getChildByName(
                placeholderName
            );

        if (!existing) {
            const placeholder = this.createText(
                scene.sceneName,
                30,
                COLORS.green,
                true
            );

            placeholder.name = placeholderName;
            placeholder.anchor.set(0.5);

            scene.addChild(placeholder);
        }

        this.updateSceneLayout(contentHeight);

        // Vào Scene mới
        scene.onEnter();

        this.updateNavigation();
    }

    // =====================================================
    // UPDATE NAVIGATION STATE
    // =====================================================

    private updateNavigation(): void {
        for (const [key, elements] of this.tabButtons) {
            const selected =
                key === this.activeKey;

            elements.background.tint =
                selected
                    ? COLORS.selected
                    : COLORS.white;

            elements.text.style.fill =
                COLORS.green;
        }
    }

    // =====================================================
    // RESPONSIVE LAYOUT
    //
    // Game.ts gọi phương thức này khi resize.
    // =====================================================

    public resizeLayout(height: number): void {
        this.screenHeight = height;

        const contentHeight = Math.max(
            0,
            height - HEADER_HEIGHT - NAV_HEIGHT
        );

        // ===================================
        // MAIN BACKGROUND
        // ===================================

        this.backgroundGraphics.clear();

        this.backgroundGraphics
            .rect(
                0,
                0,
                WIDTH,
                height
            )
            .fill(COLORS.background);

        // ===================================
        // CONTENT BACKGROUND
        // ===================================

        this.contentBackground.clear();

        this.contentBackground
            .rect(
                0,
                0,
                WIDTH,
                contentHeight
            )
            .fill(COLORS.background);

        // ===================================
        // NAVIGATION BOTTOM
        // ===================================

        this.navigation.position.set(
            0,
            height - NAV_HEIGHT
        );

        this.navigationBackground.clear();

        this.navigationBackground
            .rect(
                0,
                0,
                WIDTH,
                NAV_HEIGHT
            )
            .fill(COLORS.nav);

        // ===================================
        // FLOATING BUTTONS
        // ===================================

        this.floating.position.set(
            WIDTH - 68,
            HEADER_HEIGHT + 60
        );

        this.floating.visible =
            contentHeight >= 280;

        // ===================================
        // RESIZE ACTIVE SCENE
        // ===================================

        this.updateSceneLayout(contentHeight);
    }

    // =====================================================
    // UPDATE SCENE LAYOUT
    // =====================================================

    private updateSceneLayout(
        contentHeight: number
    ): void {
        if (!this.activeScene) return;

        this.activeScene.resize(
            WIDTH,
            contentHeight
        );

        const placeholder =
            this.activeScene.getChildByName(
                "scene-placeholder"
            );

        if (placeholder instanceof Text) {
            placeholder.position.set(
                WIDTH / 2,
                contentHeight / 2
            );
        }
    }

    // =====================================================
    // NOTIFICATION
    // =====================================================

    private notify(message: string): void {
        console.log(
            `[Flower Shop] ${message}`
        );
    }

    // =====================================================
    // PLAYER EXP
    // =====================================================

    public addPlayerExp(amount: number): void {
        this.avatarFrame.addExp(amount);
    }

    // =====================================================
    // COIN MANAGEMENT
    // =====================================================

    public addCoins(amount: number): void {
        this.coinFrame.addValue(amount);
    }

    public getCoins(): number {
        return this.coinFrame.getValue();
    }

    // =====================================================
    // DIAMOND MANAGEMENT
    // =====================================================

    public addDiamonds(amount: number): void {
        this.diamondFrame.addValue(amount);
    }

    public getDiamonds(): number {
        return this.diamondFrame.getValue();
    }
}
