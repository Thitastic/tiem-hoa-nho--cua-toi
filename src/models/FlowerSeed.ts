import { FlowerRarityId } from './FlowerRarity';

interface FlowerSeedBaseData {
  id: number;
  flowerId: number; // Loài hoa của hạt, kể cả khi hạt nhắm tới một biến thể.
  name: string;
  price: number;
  seedRarity: FlowerRarityId;
  asset: string;
}

/** Hạt theo loài: có thể sinh ra biến thể thông qua hệ thống mutation. */
export interface SpeciesSeedData extends FlowerSeedBaseData {
  targetType: 'flower';
  flowerVariantId?: never;
  /** Tỉ lệ đột biến cơ bản (%) trước khi cộng buff. */
  mutationChance: number;
  /** Nếu có, kết quả đột biến chỉ lấy biến thể đúng độ hiếm này. */
  guaranteedRarity?: FlowerRarityId;
}

/** Hạt biến thể: luôn trồng đúng biến thể chỉ định, tuyệt đối không mutation. */
export interface VariantSeedData extends FlowerSeedBaseData {
  targetType: 'variant';
  flowerVariantId: number;
  mutationChance?: 0;
  guaranteedRarity?: never;
}

export type FlowerSeedData = SpeciesSeedData | VariantSeedData;

export class FlowerSeed {
  readonly id: number;
  readonly flowerId: number;
  readonly name: string;
  readonly price: number;
  readonly seedRarity: FlowerRarityId;
  readonly asset: string;
  readonly targetType: 'flower' | 'variant';
  readonly flowerVariantId: number | null;
  readonly mutationChance: number;
  readonly guaranteedRarity: FlowerRarityId | null;

  constructor(data: FlowerSeedData) {
    if (!Number.isInteger(data.id) || data.id <= 0 || !Number.isInteger(data.flowerId) || data.flowerId <= 0) {
      throw new Error('ID hạt/hoa không hợp lệ');
    }
    if (!data.name.trim() || !data.asset.trim() || (data.price < 0 && data.price !== -1) || !Number.isFinite(data.price)) {
      throw new Error('Thông tin hạt giống không hợp lệ');
    }
    if (data.targetType !== 'flower' && data.targetType !== 'variant') {
      throw new Error('targetType phải là flower hoặc variant');
    }
    if (data.targetType === 'variant' &&
      (!Number.isInteger(data.flowerVariantId) || data.flowerVariantId <= 0)) {
      throw new Error('Hạt biến thể phải có flowerVariantId hợp lệ');
    }
    const mutationChance = data.mutationChance ?? 0;
    if (!Number.isFinite(mutationChance) || mutationChance < 0 || mutationChance > 100) {
      throw new Error('mutationChance phải từ 0 đến 100');
    }
    if (data.targetType === 'variant' && mutationChance !== 0) {
      throw new Error('Hạt chỉ định biến thể không được có tỉ lệ đột biến');
    }
    this.id = data.id;
    this.flowerId = data.flowerId;
    this.name = data.name;
    this.price = data.price;
    this.seedRarity = data.seedRarity;
    this.asset = data.asset;
    this.targetType = data.targetType;
    this.flowerVariantId = data.targetType === 'variant' ? data.flowerVariantId : null;
    this.mutationChance = mutationChance;
    this.guaranteedRarity = data.targetType === 'flower' ? data.guaranteedRarity ?? null : null;
  }

  get allowsMutation(): boolean { return this.targetType === 'flower'; }
}
