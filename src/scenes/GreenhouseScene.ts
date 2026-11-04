
import {
    Container,
    Graphics,
    Text,
    TextStyle,
    Rectangle,
} from "pixi.js";

import { BaseScene } from "./BaseScene";
import { WoodTabBar } from "../components/WoodTabBar";

// =====================================================
// TYPES
// =====================================================

type ToolType = "water" | "fertilizer" | "shovel";

interface PlantPlot {
    id: number;
    hasPot: boolean;
    planted: boolean;
}

// =====================================================
// CONFIG
// =====================================================

const WIDTH = 540;

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

    // Kích thước dụng cụ
    toolSlotSize: 78,
};

const COLORS = {
    background: 0xe9f0df,

    green: 0x477f58,
    greenDark: 0x315f45,

    tabInactive: 0xcfddc1,
    tabActive: 0x477f58,

    soil: 0xc9a67a,
    soilDark: 0x9a734b,

    plot: 0xf1e4c8,
    border: 0xad9777,

    pot: 0xb8794d,
    potDark: 0x895335,

    white: 0xffffff,
    text: 0x4e493e,

    toolSlot: 0xfff5df,
    selected: 0xb7dbb4,
};

// =====================================================
// GREENHOUSE SCENE
// =====================================================

export class GreenhouseScene extends BaseScene {
    readonly sceneName = "Nhà kính";

    // Nhà kính đang được chọn: 0–4
    private activeGreenhouse = 0;

    // Dụng cụ đang chọn
    private selectedTool: ToolType | null = null;

    // Dữ liệu 5 nhà kính
    private greenhouses: PlantPlot[][] = [];

    // Các Container chính
    private tabsContainer = new Container();
    private gridContainer = new Container();
    private toolsContainer = new Container();

    private background = new Graphics();

    constructor() {
        super();

        this.initializeGreenhouses();

        this.addChild(this.background);

        this.addChild(this.tabsContainer);
        this.addChild(this.gridContainer);
        this.addChild(this.toolsContainer);

        this.renderLayout();
    }

    // =====================================================
    // INITIAL DATA
    // =====================================================

    private initializeGreenhouses(): void {
        const plotCount =
            CONFIG.gridColumns * CONFIG.gridRows;

        for (
            let greenhouse = 0;
            greenhouse < CONFIG.greenhouseCount;
            greenhouse++
        ) {
            const plots: PlantPlot[] = [];

            for (let i = 0; i < plotCount; i++) {
                plots.push({
                    id: i,
                    hasPot: false,
                    planted: false,
                });
            }

            this.greenhouses.push(plots);
        }

        // Dữ liệu mẫu cho nhà kính đầu tiên
        const demoPlots = [0, 3, 5, 8, 13];

        for (const id of demoPlots) {
            this.greenhouses[0][id].hasPot = true;
            this.greenhouses[0][id].planted = true;
        }
    }

    // =====================================================
    // TEXT HELPER
    // =====================================================

    private createText(
        value: string,
        fontSize = 16,
        color = COLORS.text,
        bold = false
    ): Text {
        return new Text({
            text: value,

            style: new TextStyle({
                fontFamily: "Arial, sans-serif",
                fontSize,
                fontWeight: bold
                    ? "bold"
                    : "normal",
                fill: color,
                align: "center",
            }),
        });
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
        this.background.clear();

        this.background
            .rect(
                0,
                0,
                this.sceneWidth,
                this.sceneHeight
            )
            .fill(COLORS.background);

        this.renderTabs();
        this.renderGrid();
        this.renderTools();
    }

    // =====================================================
    // ROW 1 - GREENHOUSE TABS
    // =====================================================

    private renderTabs(): void {
        this.clearContainer(this.tabsContainer);

        const padding = CONFIG.padding;
        const gap = 7;

        const availableWidth =
            this.sceneWidth - padding * 2;

        const tabWidth =
            (
                availableWidth -
                gap * (CONFIG.greenhouseCount - 1)
            ) / CONFIG.greenhouseCount;

        const tabHeight = 60;

        for (
            let i = 0;
            i < CONFIG.greenhouseCount;
            i++
        ) {
            const selected =
                i === this.activeGreenhouse;

            const tab = new Container();

            const background = new Graphics()
                .roundRect(
                    0,
                    0,
                    tabWidth,
                    tabHeight,
                    12
                )
                .fill(
                    selected
                        ? COLORS.tabActive
                        : COLORS.tabInactive
                );

            tab.addChild(background);

            // Biểu tượng nhà kính tạm thời
            const icon = this.createText(
                "⌂",
                29,
                selected
                    ? COLORS.white
                    : COLORS.greenDark,
                true
            );

            icon.anchor.set(0.5);
            icon.position.set(
                tabWidth / 2,
                20
            );

            tab.addChild(icon);

            const title = this.createText(
                `NK ${i + 1}`,
                14,
                selected
                    ? COLORS.white
                    : COLORS.greenDark,
                true
            );

            title.anchor.set(0.5);
            title.position.set(
                tabWidth / 2,
                46
            );

            tab.addChild(title);

            tab.position.set(
                padding + i * (tabWidth + gap),
                12
            );

            tab.eventMode = "static";
            tab.cursor = "pointer";

            tab.hitArea = new Rectangle(
                0, 0,
                tabWidth,
                tabHeight
            );

            tab.on("pointertap", () => {
                this.selectGreenhouse(i);
            });

            this.tabsContainer.addChild(tab);
        }
    }

    // =====================================================
    // SELECT GREENHOUSE
    // =====================================================

    private selectGreenhouse(index: number): void {
        if (
            index < 0 ||
            index >= CONFIG.greenhouseCount
        ) {
            return;
        }

        this.activeGreenhouse = index;

        this.renderTabs();
        this.renderGrid();
    }

    // =====================================================
    // ROW 2 - GRID OF PLOTS
    // =====================================================

    private renderGrid(): void {
        this.clearContainer(this.gridContainer);

        const padding = CONFIG.padding;

        const gridY = CONFIG.tabsHeight + 10;

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
            .fill(0xd6e0c7);

        this.gridContainer.addChild(panel);

        // Tiêu đề nhà kính
        const title = this.createText(
            `Nhà kính số ${this.activeGreenhouse + 1}`,
            21,
            COLORS.greenDark,
            true
        );

        title.position.set(
            padding + 18,
            gridY + 15
        );

        this.gridContainer.addChild(title);

        // Đếm số chậu đã đặt
        const plots =
            this.greenhouses[this.activeGreenhouse];

        const potCount = plots.filter(
            plot => plot.hasPot
        ).length;

        const counter = this.createText(
            `${potCount}/${plots.length} chậu`,
            14,
            COLORS.greenDark,
            true
        );

        counter.anchor.set(1, 0);

        counter.position.set(
            this.sceneWidth - padding - 18,
            gridY + 19
        );

        this.gridContainer.addChild(counter);

        // ===================================
        // GRID
        // ===================================

        const columns = CONFIG.gridColumns;
        const rows = CONFIG.gridRows;
        const gap = CONFIG.gridGap;

        const innerPadding = 17;

        const gridWidth =
            availableWidth - innerPadding * 2;

        // Chừa chiều cao cho tiêu đề
        const gridHeight = Math.max(
            0,
            availableHeight - 82
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

        const startY =
            gridY +
            58 +
            Math.max(
                0,
                (gridHeight - actualHeight) / 2
            );

        plots.forEach((plot, index) => {
            const column = index % columns;
            const row = Math.floor(index / columns);

            const x =
                startX + column * (cellSize + gap);

            const y =
                startY + row * (cellSize + gap);

            const cell = this.createPlot(
                plot,
                cellSize
            );

            cell.position.set(x, y);

            this.gridContainer.addChild(cell);
        });
    }

    // =====================================================
    // SINGLE PLOT
    // =====================================================

    private createPlot(
        plot: PlantPlot,
        size: number
    ): Container {
        const cell = new Container();

        // Ô đất
        const background = new Graphics()
            .roundRect(
                0,
                0,
                size,
                size,
                12
            )
            .fill(COLORS.plot)

            .roundRect(
                0,
                0,
                size,
                size,
                12
            )
            .stroke({
                color: COLORS.border,
                width: 2,
            });

        cell.addChild(background);

        // Đất bên trong
        const soil = new Graphics()
            .ellipse(
                size / 2,
                size * 0.68,
                size * 0.33,
                size * 0.14
            )
            .fill(COLORS.soil);

        cell.addChild(soil);

        if (plot.hasPot) {
            this.drawPot(cell, size, plot.planted);
        } else {
            // Dấu cộng khi chưa đặt chậu
            const plus = this.createText(
                "+",
                Math.max(18, size * 0.35),
                COLORS.border,
                true
            );

            plus.anchor.set(0.5);

            plus.position.set(
                size / 2,
                size / 2
            );

            cell.addChild(plus);
        }

        cell.eventMode = "static";
        cell.cursor = "pointer";

        cell.hitArea = new Rectangle(
            0,
            0,
            size,
            size
        );

        cell.on("pointertap", () => {
            this.onPlotClick(plot.id);
        });

        return cell;
    }

    // =====================================================
    // DRAW POT
    // =====================================================

    private drawPot(
        parent: Container,
        size: number,
        planted: boolean
    ): void {
        const center = size / 2;

        const pot = new Graphics()
            .moveTo(
                center - size * 0.24,
                center
            )
            .lineTo(
                center + size * 0.24,
                center
            )
            .lineTo(
                center + size * 0.17,
                center + size * 0.29
            )
            .lineTo(
                center - size * 0.17,
                center + size * 0.29
            )
            .closePath()
            .fill(COLORS.pot)

            .roundRect(
                center - size * 0.27,
                center - size * 0.04,
                size * 0.54,
                size * 0.09,
                4
            )
            .fill(COLORS.potDark);

        parent.addChild(pot);

        if (planted) {
            const plant = new Graphics()
                .moveTo(
                    center,
                    center
                )
                .lineTo(
                    center,
                    center - size * 0.3
                )
                .stroke({
                    color: 0x428e50,
                    width: Math.max(2, size * 0.04),
                })

                .ellipse(
                    center - size * 0.1,
                    center - size * 0.18,
                    size * 0.13,
                    size * 0.06
                )
                .fill(0x63ad66)

                .ellipse(
                    center + size * 0.1,
                    center - size * 0.24,
                    size * 0.13,
                    size * 0.06
                )
                .fill(0x63ad66);

            parent.addChild(plant);
        }
    }

    // =====================================================
    // CLICK PLOT
    // =====================================================

    private onPlotClick(plotId: number): void {
        const plots =
            this.greenhouses[this.activeGreenhouse];

        const plot = plots[plotId];

        if (!plot) return;

        // Phác thảo:
        // Nếu chưa có chậu, thêm chậu.
        // Nếu đã có chậu, chọn ô đất.

        if (!plot.hasPot) {
            plot.hasPot = true;
            plot.planted = false;
        } else if (!plot.planted) {
            plot.planted = true;
        } else {
            console.log(
                `Đã chọn chậu ${plotId + 1} ` +
                `trong nhà kính ${this.activeGreenhouse + 1}`
            );
        }

        this.renderGrid();
    }

    // =====================================================
    // ROW 3 - TOOL SLOTS
    // =====================================================

    private renderTools(): void {
        this.clearContainer(this.toolsContainer);

        const tools: {
            id: ToolType;
            icon: string;
            name: string;
        }[] = [
            {
                id: "water",
                icon: "◈",
                name: "Bình tưới",
            },
            {
                id: "fertilizer",
                icon: "✿",
                name: "Phân bón",
            },
            {
                id: "shovel",
                icon: "⚒",
                name: "Xẻng",
            },
        ];

        const slotSize = CONFIG.toolSlotSize;
        const gap = 24;

        const totalWidth =
            slotSize * 3 + gap * 2;

        const startX =
            (this.sceneWidth - totalWidth) / 2;

        const y =
            this.sceneHeight -
            CONFIG.toolsHeight +
            12;

        tools.forEach((tool, index) => {
            const selected =
                this.selectedTool === tool.id;

            const slot = new Container();

            const background = new Graphics()
                .roundRect(
                    0,
                    0,
                    slotSize,
                    slotSize,
                    14
                )
                .fill(
                    selected
                        ? COLORS.selected
                        : COLORS.toolSlot
                )

                .roundRect(
                    0,
                    0,
                    slotSize,
                    slotSize,
                    14
                )
                .stroke({
                    color: selected
                        ? COLORS.green
                        : COLORS.border,
                    width: selected ? 3 : 2,
                });

            slot.addChild(background);

            const icon = this.createText(
                tool.icon,
                31,
                COLORS.greenDark,
                true
            );

            icon.anchor.set(0.5);
            icon.position.set(
                slotSize / 2,
                29
            );

            slot.addChild(icon);

            const name = this.createText(
                tool.name,
                13,
                COLORS.greenDark,
                true
            );

            name.anchor.set(0.5);
            name.position.set(
                slotSize / 2,
                61
            );

            slot.addChild(name);

            slot.position.set(
                startX + index * (slotSize + gap),
                y
            );

            slot.eventMode = "static";
            slot.cursor = "pointer";

            slot.hitArea = new Rectangle(
                0,
                0,
                slotSize,
                slotSize
            );

            slot.on("pointertap", () => {
                this.selectedTool =
                    this.selectedTool === tool.id
                        ? null
                        : tool.id;

                this.renderTools();
            });

            this.toolsContainer.addChild(slot);
        });
    }

    // =====================================================
    // LIFECYCLE
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
}
