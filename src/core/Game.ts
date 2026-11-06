
import { Application } from "pixi.js";
import { MainScreen } from "../ui/MainScene";
import { loadGameFont } from "../services/GameFont";

export class Game {
    private readonly app = new Application();

    // Chiều rộng thiết kế game
    private readonly designWidth = 540;

    private mainScreen!: MainScreen;

    private resizeHandler = () => this.resize();

    async start(): Promise<void> {
        await Promise.all([
            loadGameFont(),
            this.app.init({
                width: this.designWidth,
                height: 960,

                background: "#fff8ed",
                antialias: true,
                autoDensity: true,

                resolution: Math.min(window.devicePixelRatio || 1, 2),
            }),
        ]);

        document.body.appendChild(this.app.canvas);

        this.mainScreen = new MainScreen();
        this.app.stage.addChild(this.mainScreen);

        window.addEventListener(
            "resize",
            this.resizeHandler
        );

        window.visualViewport?.addEventListener(
            "resize",
            this.resizeHandler
        );

        this.resize();
    }


    private resize(): void {
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;

        const isDesktop = window.matchMedia(
            "(min-width: 768px) and (pointer: fine)"
        ).matches;

        if (isDesktop) {
            // ======================================
            // DESKTOP: FIT HEIGHT + CĂN GIỮA
            // ======================================

            const designWidth = 540;
            const designHeight = 960;

            // Giữ kích thước logic 540 x 960
            this.app.renderer.resize(
                designWidth,
                designHeight
            );

            // Scale theo chiều cao màn hình
            const scale = viewportHeight / designHeight;

            const canvasWidth = designWidth * scale;
            const canvasHeight = viewportHeight;

            this.app.canvas.style.width =
                `${canvasWidth}px`;

            this.app.canvas.style.height =
                `${canvasHeight}px`;

            // MainScreen giữ tỷ lệ 9:16
            this.mainScreen.resizeLayout(
                designHeight
            );

        } else {
            // ======================================
            // MOBILE: FIT WIDTH + ADAPTIVE HEIGHT
            // ======================================

            const designWidth = 540;

            // Scale theo chiều rộng điện thoại
            const scale = viewportWidth / designWidth;

            // Chiều cao logic thích ứng
            const designHeight = viewportHeight / scale;

            this.app.renderer.resize(
                designWidth,
                designHeight
            );

            this.app.canvas.style.width =
                `${viewportWidth}px`;

            this.app.canvas.style.height =
                `${viewportHeight}px`;

            this.mainScreen.resizeLayout(
                designHeight
            );
        }
    }

}
