
import {
    Container,
    Graphics,
    Text,
} from "pixi.js";

// Components
import { AvatarFrame } from "../components/AvatarFrame";
import { CurrencyFrame } from "../components/CurrencyFrame";
import { ImageButton } from "../components/ImageButton";
import { BottomDock, type DockSceneKey } from "../components/BottomDock";
import { gameStore } from "../services/GameSession";
import { FloatingEvents } from "../components/FloatingEvents";
import { StorageDialog } from "../components/StorageDialog";
import type { Event } from "../models/Event";
import { EventScene } from "../scenes/EventScene";

// Scenes
import { BaseScene } from "../scenes/BaseScene";
import { GreenhouseScene } from "../scenes/GreenhouseScene";
import { ToolShopScene } from "../scenes/ToolShopScene";
import { FlowerShopScene } from "../scenes/FlowerShopScene";
import { CreateBouquetScene } from "../scenes/CreateBouquetScene";

// =====================================================
// TYPES
// =====================================================

type SceneKey = DockSceneKey;

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
    private readonly eventScene = new EventScene(() => this.closeEvent());
    private floatingEvents?: FloatingEvents;
    private readonly storageDialog = new StorageDialog();

    // ===================================
    // BACKGROUNDS
    // ===================================

    private backgroundGraphics = new Graphics();
    private contentBackground = new Graphics();
    private navigationBackground = new Graphics();
    private bottomDock!: BottomDock;

    // ===================================
    // HEADER COMPONENTS
    // ===================================

    private avatarFrame!: AvatarFrame;
    private coinFrame!: CurrencyFrame;
    private diamondFrame!: CurrencyFrame;
    private unsubscribePlayer?: () => void;

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
        // Popup phải nằm trên HUD, scene và dock.
        this.addChild(this.storageDialog);

        // Cập nhật HUD ngay khi mở game và sau mọi lần GameStore.save().
        this.unsubscribePlayer = gameStore.subscribe(() => this.refreshPlayerHud());

        this.switchScene("greenhouse");

        this.resizeLayout(this.screenHeight);
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
            level: gameStore.player.level,
            exp: gameStore.player.exp,
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
            value: gameStore.player.coin,

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
            value: gameStore.player.diamond,

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
        // STORAGE BUTTON
        // ===================================

        const storageButton = new ImageButton({
            image: "/assets/ui/storage.png",
            label: "Kho chứa",

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
                this.storageDialog.open();
            },
        });

        storageButton.position.set(
            455,
            41
        );

        this.header.addChild(storageButton);
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
        this.navigation.position.set(0, this.screenHeight - NAV_HEIGHT);
        this.addChild(this.navigation);
        this.navigation.addChild(this.navigationBackground);

        this.bottomDock = new BottomDock({
            width: WIDTH,
            height: NAV_HEIGHT,
            selected: this.activeKey,
            onSelect: (key) => this.switchScene(key),
        });
        this.navigation.addChild(this.bottomDock);
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

        this.floatingEvents = new FloatingEvents({
            visibleEventCount: 3,
            onOpenMail: () => this.notify("Hộp thư"),
            onOpenEvent: (event) => this.openEvent(event),
        });
        this.floating.addChild(this.floatingEvents);
    }

    private openEvent(event: Event): void {
        if (this.eventScene.parent) this.content.removeChild(this.eventScene);
        this.activeScene?.onExit();
        if (this.activeScene) this.activeScene.visible = false;
        this.content.addChild(this.eventScene);
        this.eventScene.showEvent(event);
        this.eventScene.resize(WIDTH, Math.max(0, this.screenHeight - HEADER_HEIGHT - NAV_HEIGHT));
        this.eventScene.onEnter();
    }

    private closeEvent(): void {
        if (!this.eventScene.parent) return;
        this.eventScene.onExit();
        this.content.removeChild(this.eventScene);
        if (this.activeScene) {
            this.activeScene.visible = true;
            this.activeScene.onEnter();
        }
    }

    // =====================================================
    // SWITCH SCENE
    // =====================================================

    public switchScene(key: SceneKey): void {
        if (this.eventScene.parent) this.closeEvent();
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

        }

        this.updateSceneLayout(contentHeight);
        this.storageDialog.resize(WIDTH, this.screenHeight);

        // Vào Scene mới
        scene.onEnter();

        this.updateNavigation();
    }

    // =====================================================
    // UPDATE NAVIGATION STATE
    // =====================================================

    private updateNavigation(): void {
        this.bottomDock.setSelected(this.activeKey);
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

        this.bottomDock.resize(WIDTH, NAV_HEIGHT);

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
        if (this.eventScene.parent) this.eventScene.resize(WIDTH, contentHeight);
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

    private refreshPlayerHud(): void {
        const player = gameStore.player;
        this.avatarFrame.setProgress(player.level, player.exp);
        this.coinFrame.setValue(player.coin);
        this.diamondFrame.setValue(player.diamond);
    }

    public addPlayerExp(amount: number): void {
        gameStore.addExp(amount);
    }

    // =====================================================
    // COIN MANAGEMENT
    // =====================================================

    public addCoins(amount: number): void {
        gameStore.addCoin(amount);
    }

    public getCoins(): number {
        return gameStore.player.coin;
    }

    // =====================================================
    // DIAMOND MANAGEMENT
    // =====================================================

    public addDiamonds(amount: number): void {
        gameStore.addDiamond(amount);
    }

    public getDiamonds(): number {
        return gameStore.player.diamond;
    }

    public override destroy(options?: boolean | { children?: boolean }): void {
        this.unsubscribePlayer?.();
        this.unsubscribePlayer = undefined;
        super.destroy(options);
    }
}
