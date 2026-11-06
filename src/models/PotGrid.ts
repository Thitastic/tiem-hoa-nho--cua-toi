export type PotGridStatus = 'empty' | 'need_watering' | 'growing' | 'harvest';

export interface GridPosition {
  row: number; // Bắt đầu từ 0
  col: number; // Bắt đầu từ 0
}

export interface PotGridData {
  id: number;
  position: GridPosition;
  unlock: boolean;
  potId: number | null; // Tham chiếu Pot.id.
  flowerVariantId: number | null; // Tham chiếu FlowerVariant.id.
  seedId: number | null; // Hạt đã gieo (cần cho hệ thống mutation).
  remainingTime: number; // Phút còn lại để thu hoạch.
  wateringRemainingTime: number; // Phút còn lại đến lúc cần tưới.
  status: PotGridStatus;
  plantedAt: number | null; // Unix timestamp ms; null nếu chưa trồng.
  updatedAt: number | null; // Mốc tính thời gian offline.
}

export class PotGrid implements PotGridData {
  id: number;
  position: GridPosition;
  unlock: boolean;
  potId: number | null;
  flowerVariantId: number | null;
  seedId: number | null;
  remainingTime: number;
  wateringRemainingTime: number;
  status: PotGridStatus;
  plantedAt: number | null;
  updatedAt: number | null;

  constructor(data: Partial<PotGridData> & Pick<PotGridData, 'id' | 'position'>) {
    this.id = data.id;
    this.position = { ...data.position };
    this.unlock = data.unlock ?? false;
    this.potId = data.potId ?? null;
    this.flowerVariantId = data.flowerVariantId ?? null;
    this.seedId = data.seedId ?? null;
    this.remainingTime = Math.max(0, data.remainingTime ?? 0);
    this.wateringRemainingTime = Math.max(0, data.wateringRemainingTime ?? 0);
    this.status = data.status ?? 'empty';
    this.plantedAt = data.plantedAt ?? null;
    this.updatedAt = data.updatedAt ?? null;
  }

  /** Trạng thái mới là dữ liệu của người chơi, không sửa dữ liệu loại chậu/hoa. */
  setStatus(status: PotGridStatus): void { this.status = status; }
}
