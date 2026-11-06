import { Assets, Container, Sprite, Texture } from 'pixi.js';
import type { FlowerSeed } from '../models/FlowerSeed';
import { FLOWER_VARIANTS } from '../data/flowerVariants';

export interface SeedPackOptions {
    /** Kích thước tối đa của gói trên màn hình (px). */
    size?: number;
    /** Nhãn hoa chiếm bao nhiêu kích thước gói: 0.5 = 50%. */
    labelScale?: number;
    /** Độ lệch nhãn so với tâm gói (px). */
    labelOffsetY?: number;
}

/** Gói hạt giống tái sử dụng được ở Shop, kho đồ và màn gieo hạt. */
export class SeedPack extends Container {
    constructor(seed: FlowerSeed, options: SeedPackOptions = {}) {
        super();
        const size = options.size ?? 88;
        const labelScale = options.labelScale ?? 0.5;
        const labelOffsetY = options.labelOffsetY ?? 6;
        this.eventMode = 'none';

        void Assets.load<Texture>(seed.asset).then((texture) => {
            if (this.destroyed) return;
            const pack = new Sprite(texture);
            pack.anchor.set(0.5);
            pack.scale.set(size / Math.max(texture.width, texture.height));
            pack.eventMode = 'none';
            this.addChildAt(pack, 0);
        }).catch((error: unknown) => console.warn(`Không tải được gói hạt ${seed.asset}`, error));

        const originalVariant = FLOWER_VARIANTS.find(
            (variant) => variant.flowerId === seed.flowerId && variant.isOriginal,
        );
        const labelAsset = seed.flowerId === 1
            ? '/assets/seed-pack/chrysanthemum.png'
            : originalVariant?.product;
        if (!labelAsset) return;

        void Assets.load<Texture>(labelAsset).then((texture) => {
            if (this.destroyed) return;
            const label = new Sprite(texture);
            label.anchor.set(0.5);
            label.position.set(5, labelOffsetY - 5);
            label.scale.set(size * labelScale / Math.max(texture.width, texture.height));
            label.eventMode = 'none';
            this.addChild(label);
        }).catch((error: unknown) => console.warn(`Không tải được nhãn hoa ${labelAsset}`, error));
    }
}
