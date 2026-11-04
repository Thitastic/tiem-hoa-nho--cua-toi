
import {
    Container,
    Graphics,
    Rectangle,
    Text,
    TextStyle,
} from "pixi.js";

export interface WoodTabItem {
    id: string;
    label: string;
}

export interface WoodTabBarOptions {
    width: number;
    tabs: WoodTabItem[];
    selectedIndex?: number;
    onChange?: (index: number, tab: WoodTabItem) => void;
}

const COLORS = {
    woodLight: 0xd9a066,
    wood: 0xb97a3e,
    woodDark: 0x7a4a22,
    woodDeep: 0x4a2a12,

    paper: 0xf7e9c8,
    textLight: 0xf6e2bd,

    leaf: 0x5fa332,
    leafLight: 0x9bd35a,
    leafDark: 0x3f7a1f,

    nail: 0xc7b58f,
};

export class WoodTabBar extends Container {
    private tabs: WoodTabItem[];
    private selectedIndex: number;
    private onChange?: (
        index: number,
        tab: WoodTabItem
    ) => void;

    private barWidth: number;

    private readonly heightValue = 82;

    constructor(options: WoodTabBarOptions) {
        super();

        this.tabs = options.tabs;

        this.barWidth = options.width;

        this.selectedIndex = Math.max(
            0,
            Math.min(
                options.selectedIndex ?? 0,
                this.tabs.length - 1
            )
        );

        this.onChange = options.onChange;

        this.renderTabs();
    }

    // ==========================================
    // PUBLIC GETTERS
    // ==========================================

    public getHeight(): number {
        return this.heightValue;
    }

    public getSelectedIndex(): number {
        return this.selectedIndex;
    }

    // ==========================================
    // VẼ NỀN THANH GỖ
    // ==========================================

    private drawBackground(): void {
        const background = new Graphics()
            .roundRect(
                0,
                12,
                this.barWidth,
                70,
                14
            )
            .fill(COLORS.woodDeep)

            .roundRect(
                3,
                15,
                this.barWidth - 6,
                64,
                11
            )
            .fill(COLORS.woodDark);

        // Vân gỗ nền
        for (let x = 45; x < this.barWidth; x += 48) {
            background
                .moveTo(x, 17)
                .lineTo(x, 79)
                .stroke({
                    color: COLORS.woodDeep,
                    width: 2,
                    alpha: 0.35,
                });
        }

        this.addChild(background);

        // Hai đinh kim loại
        for (const x of [9, this.barWidth - 9]) {
            this.addChild(
                new Graphics()
                    .circle(x, 23, 5)
                    .fill(COLORS.woodDeep)

                    .circle(x, 22, 3.5)
                    .fill(COLORS.nail)
            );
        }
    }

    // ==========================================
    // VẼ MẦM CÂY
    // ==========================================

    private drawSprout(
        parent: Container,
        centerX: number
    ): void {
        const sprout = new Graphics();

        // Thân
        sprout
            .moveTo(centerX, 21)
            .lineTo(centerX, 7)
            .stroke({
                color: COLORS.leafDark,
                width: 2.5,
                cap: "round",
            });

        // Lá trái
        sprout
            .moveTo(centerX, 13)
            .quadraticCurveTo(
                centerX - 14, 12,
                centerX - 13, 2
            )
            .quadraticCurveTo(
                centerX - 3, 3,
                centerX, 13
            )
            .fill(COLORS.leaf);

        // Lá phải
        sprout
            .moveTo(centerX, 12)
            .quadraticCurveTo(
                centerX + 4, 1,
                centerX + 14, 2
            )
            .quadraticCurveTo(
                centerX + 13, 12,
                centerX, 12
            )
            .fill(COLORS.leafLight);

        parent.addChild(sprout);
    }

    // ==========================================
    // TẠO TAB
    // ==========================================

    private createTab(
        item: WoodTabItem,
        index: number,
        width: number
    ): Container {
        const selected =
            index === this.selectedIndex;

        const tab = new Container();

        const tabHeight = selected ? 62 : 57;

        // Tấm ván gỗ
        const background = new Graphics()
            .roundRect(
                0,
                0,
                width,
                tabHeight,
                10
            )
            .fill(COLORS.woodDeep)

            .roundRect(
                3,
                3,
                width - 6,
                tabHeight - 3,
                8
            )
            .fill(
                selected
                    ? COLORS.woodLight
                    : COLORS.wood
            );

        // Vân gỗ trên tab
        for (let y = 12; y < tabHeight - 5; y += 8) {
            background
                .moveTo(8, y)
                .lineTo(width - 8, y - 2)
                .stroke({
                    color: COLORS.woodDark,
                    width: 1,
                    alpha: 0.23,
                });
        }

        tab.addChild(background);

        // Icon nhà kính tạm
        const icon = new Text({
            text: "⌂",
            style: new TextStyle({
                fontFamily: "Arial",
                fontSize: 27,
                fontWeight: "bold",
                fill: selected
                    ? COLORS.woodDeep
                    : COLORS.textLight,
            }),
        });

        icon.anchor.set(0.5);
        icon.position.set(width / 2, 24);

        tab.addChild(icon);

        // Tên tab
        const label = new Text({
            text: item.label,
            style: new TextStyle({
                fontFamily:
                    "Baloo 2, Arial, sans-serif",
                fontSize: 14,
                fontWeight: "bold",
                fill: selected
                    ? COLORS.woodDeep
                    : COLORS.textLight,
                align: "center",
            }),
        });

        label.anchor.set(0.5);
        label.position.set(
            width / 2,
            45
        );

        tab.addChild(label);

        // Mầm cây ở tab đang chọn
        if (selected) {
            this.drawSprout(
                tab,
                width / 2
            );

            // Tab sáng nối liền với bảng nội dung
            tab.addChild(
                new Graphics()
                    .rect(
                        0,
                        tabHeight - 5,
                        width,
                        5
                    )
                    .fill(COLORS.paper)
            );
        }

        tab.eventMode = "static";
        tab.cursor = "pointer";

        tab.hitArea = new Rectangle(
            0,
            0,
            width,
            62
        );

        tab.on("pointertap", () => {
            this.setSelected(index);
        });

        return tab;
    }

    // ==========================================
    // RENDER TOÀN BỘ
    // ==========================================

    private renderTabs(): void {
        this.removeChildren().forEach(child => {
            child.destroy({ children: true });
        });

        this.drawBackground();

        if (this.tabs.length === 0) return;

        const padding = 10;
        const gap = 6;

        const tabWidth =
            (
                this.barWidth -
                padding * 2 -
                gap * (this.tabs.length - 1)
            ) / this.tabs.length;

        this.tabs.forEach((item, index) => {
            const tab = this.createTab(
                item,
                index,
                tabWidth
            );

            tab.position.set(
                padding + index * (tabWidth + gap),
                index === this.selectedIndex
                    ? 20
                    : 25
            );

            this.addChild(tab);
        });
    }

    // ==========================================
    // CHỌN TAB
    // ==========================================

    public setSelected(index: number): void {
        if (
            index < 0 ||
            index >= this.tabs.length
        ) {
            return;
        }

        if (index === this.selectedIndex) {
            return;
        }

        this.selectedIndex = index;

        this.renderTabs();

        this.onChange?.(
            index,
            this.tabs[index]
        );
    }

    // ==========================================
    // RESPONSIVE
    // ==========================================

    public resize(width: number): void {
        this.barWidth = width;
        this.renderTabs();
    }
}
