import { FlowerRarityId } from './FlowerRarity';

/** Đường dẫn ảnh stage 0, 1, 2, 3 theo đúng thứ tự. */
export type FlowerStageAssets = readonly [string, string, string, string];

export interface FlowerVariantData {
  id: number;
  flowerId: number; // Khóa tham chiếu Flower.id; phù hợp lưu JSON/DB.
  name: string;
  asset: FlowerStageAssets;
  product: string; // Ảnh hoa thành phẩm.
  price: number;
  baseYield?: number;
  /** -1 = biến thể gốc; 0..100 = trọng số/chance % đột biến (phụ thuộc luật game). */
  mutationChance: number;
  rarityId: FlowerRarityId;
}

export class FlowerVariant implements Readonly<FlowerVariantData> {
  readonly id: number;
  readonly flowerId: number;
  readonly name: string;
  readonly asset: FlowerStageAssets;
  readonly product: string;
  readonly price: number;
  readonly baseYield: number;
  readonly mutationChance: number;
  readonly rarityId: FlowerRarityId;

  constructor(data: FlowerVariantData) {
    if (!Number.isInteger(data.id) || data.id <= 0 || !Number.isInteger(data.flowerId) || data.flowerId <= 0) {
      throw new Error('ID hoa/biến thể không hợp lệ');
    }
    if (data.asset.length !== 4 || data.asset.some((path) => !path.trim())) {
      throw new Error('Cần đúng 4 ảnh cho stage 0–3');
    }
    if (!data.name.trim() || !data.product.trim() || data.price < 0) throw new Error('Dữ liệu biến thể không hợp lệ');
    if (!Number.isSafeInteger(data.baseYield ?? 1) || (data.baseYield ?? 1) < 1) throw new Error('Sản lượng không hợp lệ');
    if (data.mutationChance !== -1 && (data.mutationChance < 0 || data.mutationChance > 100)) {
      throw new Error('mutationChance phải là -1 hoặc 0–100');
    }
    this.id = data.id;
    this.flowerId = data.flowerId;
    this.name = data.name;
    this.asset = Object.freeze([...data.asset]) as FlowerStageAssets;
    this.product = data.product;
    this.price = data.price;
    this.baseYield = data.baseYield ?? 1;
    this.mutationChance = data.mutationChance;
    this.rarityId = data.rarityId;
  }

  get isOriginal(): boolean { return this.mutationChance === -1; }
  getStageAsset(stage: 0 | 1 | 2 | 3): string { return this.asset[stage]; }
}
