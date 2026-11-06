import {
    Container,
    Graphics,
    Assets,
    Sprite,
    Texture,
} from "pixi.js";

import { BaseScene } from "./BaseScene";
import { GameTabBar } from "../components/GameTabBar.ts";
import { gameStore } from "../services/GameSession";
import { PotGridView } from "../components/PotGridView";

// =====================================================
// TYPES
// =====================================================

// =====================================================
// CONFIG
// =====================================================

const CONFIG = {
    greenhouseCount: 5,

    // Số ô đất
    gridColumns: 4,
    gridRows: 4,

    // Khoảng cách
    padding: 18,
    gridGap: 12,

    // Chiều cao các hàng cố định
    tabsHeight: 84,
    toolsHeight: 116,

};

const COLORS = {
    background: 0xe9f0df,

};

// =====================================================
// GREENHOUSE SCENE
// =====================================================

export class GreenhouseScene extends BaseScene {
    readonly sceneName = "Nhà kính";

    // Nhà kính đang được chọn: 0–4
    private activeGreenhouse = 0;

    // Các Container chính
    private tabsContainer?: GameTabBar;
    private tabGreenhouseIds: number[] = [];
    private gridContainer = new Container();

    private background = new Graphics();

    private backgroundSprite?: Sprite;
    private backgroundMask = new Graphics();

    constructor() {
        super();

        this.addChild(this.background);
        this.addChild(this.backgroundMask);

        this.addChild(this.gridContainer);

        this.renderLayout();
        void this.loadBackground();
    }

    // =====================================================
    // CLEAR CONTAINER
    // =====================================================

    private clearContainer(container: Container): void {
        const children = container.removeChildren();

        for (const child of children) {
            child.destroy({ children: true });
        }
    }

    // =====================================================
    // RENDER LAYOUT
    // =====================================================

    private renderLayout(): void {
        // Màu nền dự phòng nếu chưa tải được ảnh
        this.background.clear();

        this.background
            .rect(
                0,
                0,
                this.sceneWidth,
                this.sceneHeight
            )
            .fill(COLORS.background);

        // Cập nhật ảnh nền
        this.updateBackground();

        // Chỉ tạo tab khi đã mở khóa từ 2 nhà kính trở lên.
        this.updateGreenhouseTabs();

        this.renderGrid();
    }

    // =====================================================
    // ROW 1 - GREENHOUSE TABS
    // =====================================================

    private updateGreenhouseTabs(): void {
        const unlocked = gameStore.greenhouses.filter((greenhouse) => greenhouse.unlock);
        const ids = unlocked.map((greenhouse) => greenhouse.id);

        if (!unlocked.some((greenhouse) => gameStore.greenhouses[this.activeGreenhouse]?.id === greenhouse.id)) {
            this.activeGreenhouse = gameStore.greenhouses.findIndex((greenhouse) => greenhouse.unlock);
        }

        if (ids.length < 2) {
            this.tabsContainer?.destroy({ children: true });
            this.tabsContainer = undefined;
            this.tabGreenhouseIds = [];
            return;
        }

        if (ids.join(",") !== this.tabGreenhouseIds.join(",") || !this.tabsContainer) {
            this.tabsContainer?.destroy({ children: true });
            this.tabGreenhouseIds = ids;
            this.tabsContainer = new GameTabBar({
                width: this.sceneWidth - 36,
                selectedIndex: Math.max(0, ids.indexOf(gameStore.greenhouses[this.activeGreenhouse].id)),
                tabs: unlocked.map((greenhouse) => ({
                    id: `greenhouse-${greenhouse.id}`,
                    label: `NK ${greenhouse.id}`,
                })),
                onChange: (tabIndex) => this.selectGreenhouse(tabIndex),
            });
            this.tabsContainer.position.set(18, 0);
            this.addChild(this.tabsContainer);
        } else {
            this.tabsContainer.resize(this.sceneWidth - 36);
        }
    }


    // =====================================================
    // SELECT GREENHOUSE
    // =====================================================

    private selectGreenhouse(tabIndex: number): void {
        const greenhouseId = this.tabGreenhouseIds[tabIndex];
        const greenhouseIndex = gameStore.greenhouses.findIndex(
            (greenhouse) => greenhouse.id === greenhouseId && greenhouse.unlock
        );
        if (greenhouseIndex < 0) return;

        this.activeGreenhouse = greenhouseIndex;
        this.tabsContainer?.setSelected(tabIndex);

        // Chỉ cần render lại Grid
        this.renderGrid();
    }

    // =====================================================
    // ROW 2 - GRID OF PLOTS
    // =====================================================

    private renderGrid(): void {
        this.clearContainer(this.gridContainer);

        const padding = CONFIG.padding;

        // Giữ nguyên khoảng dành cho tab ngay cả khi tab bị ẩn.
        // Nhờ vậy Grid không bị nhảy lên khi chỉ có 1 nhà kính.
        const gridY = this.tabsContainer
            ? this.tabsContainer.y + this.tabsContainer.getHeight() + 10
            : CONFIG.tabsHeight + 10;

        const toolsTop =
            this.sceneHeight - CONFIG.toolsHeight;

        const availableHeight = Math.max(
            0,
            toolsTop - gridY - 18
        );

        const availableWidth =
            this.sceneWidth - padding * 2;

        // Nền khu vực trồng hoa
        const panel = new Graphics()
            .roundRect(
                padding,
                gridY,
                availableWidth,
                availableHeight,
                18
            )
            .fill({
                color: 0xf7e9c8,
                alpha: 0.15,
            });

        this.gridContainer.addChild(panel);

        const plots = gameStore.greenhouses[this.activeGreenhouse].plots;

        // ===================================
        // GRID
        // ===================================

        const columns = CONFIG.gridColumns;
        const rows = CONFIG.gridRows;
        const gap = CONFIG.gridGap;

        const innerPadding = 17;

        const gridWidth =
            availableWidth - innerPadding * 2;

        // Không cần chừa chỗ cho tiêu đề và bộ đếm nữa.
        const gridHeight = Math.max(
            0,
            availableHeight - 36
        );

        // Ô vuông, kích thước thích ứng
        const cellWidth =
            (gridWidth - gap * (columns - 1)) /
            columns;

        const cellHeight =
            (gridHeight - gap * (rows - 1)) /
            rows;

        const cellSize = Math.max(
            0,
            Math.min(cellWidth, cellHeight)
        );

        const actualWidth =
            cellSize * columns +
            gap * (columns - 1);

        const actualHeight =
            cellSize * rows +
            gap * (rows - 1);

        const startX =
            (this.sceneWidth - actualWidth) / 2;

        const startY = gridY + 18 + Math.max(0, (gridHeight - actualHeight) / 2) + 80;

        plots.forEach((plot, index) => {
            const column = index % columns;
            const row = Math.floor(index / columns);

            const x =
                startX + column * (cellSize + gap);

            const y =
                startY + row * (cellSize + gap);

            const cell = new PotGridView({
                plot,
                size: cellSize,
                onClick: (plotId) => this.onPlotClick(plotId),
            });

            cell.position.set(x, y);

            this.gridContainer.addChild(cell);
        });
    }

    // =====================================================
    // CLICK PLOT
    // =====================================================

    private onPlotClick(plotId: number): void {
        const greenhouse = gameStore.greenhouses[this.activeGreenhouse];
        const plot = greenhouse.plots.find((item) => item.id === plotId);

        if (!plot) return;
        if (!greenhouse.unlock || !plot.unlock) {
            console.info("Ô đất chưa mở khóa");
            return;
        }
        // Không tự cấp chậu/cây khi chạm; mua/đặt chậu qua GameStore.
        console.info(`Ô ${plot.id}: potId=${plot.potId ?? "trống"}, trạng thái=${plot.status}`);
    }

    // =====================================================
    // LIFECYCLE (đã bỏ thanh dụng cụ, vẫn giữ khoảng trống để Grid không dịch chuyển)
    // =====================================================

    override onEnter(): void {
        this.renderLayout();
    }

    override onExit(): void {
        // Giữ trạng thái nhà kính khi chuyển tab
    }

    // =====================================================
    // RESPONSIVE
    // =====================================================

    override resize(
        width: number,
        height: number
    ): void {
        super.resize(width, height);

        this.renderLayout();
    }

    private async loadBackground(): Promise<void> {
        try {
            const texture = await Assets.load<Texture>(
                "/assets/bg/green-house.png"
            );

            if (this.destroyed) return;

            this.backgroundSprite = new Sprite(texture);

            // Nằm trên màu nền dự phòng nhưng dưới tab, grid và dụng cụ.
            this.addChildAt(this.backgroundSprite, 1);

            // Mask giúp ảnh không tràn khỏi Scene
            this.backgroundSprite.mask = this.backgroundMask;

            this.updateBackground();
        } catch (error) {
            console.error(
                "Không tải được ảnh nền nhà kính:",
                error
            );
        }
    }

    private updateBackground(): void {
        if (!this.backgroundSprite) return;

        const sprite = this.backgroundSprite;

        const textureWidth = sprite.texture.width;
        const textureHeight = sprite.texture.height;

        const targetWidth = this.sceneWidth;
        const targetHeight = this.sceneHeight;

        // Object-fit: cover
        // Giữ nguyên tỷ lệ, không kéo méo ảnh
        const scale = Math.max(
            targetWidth / textureWidth,
            targetHeight / textureHeight
        );

        sprite.scale.set(scale);

        // Căn giữa ảnh nền
        sprite.anchor.set(0.5);

        sprite.position.set(
            targetWidth / 2,
            targetHeight / 2
        );

        // Giới hạn ảnh trong khu vực Scene
        this.backgroundMask.clear();

        this.backgroundMask
            .rect(
                0,
                0,
                targetWidth,
                targetHeight
            )
            .fill(0xffffff);
    }
}
