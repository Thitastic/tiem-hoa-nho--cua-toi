/** Các hiệu ứng mà vật phẩm có thể áp dụng lên cây trồng. */
export enum BuffType {
  MAX_GROW_TIME_PERCENT = 'max_grow_time_percent',
  CURRENT_GROW_TIME_PERCENT = 'current_grow_time_percent',
  CURRENT_GROW_TIME_MINUTES = 'current_grow_time_minutes',
  EXTRA_YIELD = 'extra_yield',
  MUTATION_CHANCE_PERCENT = 'mutation_chance_percent',
}

export interface BuffData {
  type: BuffType;
  /** % hoặc phút hoặc số lượng, tùy BuffType. Luôn dùng số dương. */
  value: number;
}

export class Buff implements Readonly<BuffData> {
  readonly type: BuffType;
  readonly value: number;

  constructor(data: BuffData) {
    if (!Object.values(BuffType).includes(data.type)) {
      throw new Error(`Loại buff không hợp lệ: ${data.type}`);
    }
    if (!Number.isFinite(data.value) || data.value < 0) {
      throw new Error('Giá trị buff phải là số không âm hữu hạn.');
    }
    if (
      (data.type === BuffType.MAX_GROW_TIME_PERCENT ||
        data.type === BuffType.CURRENT_GROW_TIME_PERCENT ||
        data.type === BuffType.MUTATION_CHANCE_PERCENT) &&
      data.value > 100
    ) {
      throw new Error('Buff phần trăm riêng lẻ không được vượt quá 100%.');
    }
    if (data.type === BuffType.EXTRA_YIELD && !Number.isInteger(data.value)) {
      throw new Error('Sản lượng cộng thêm phải là số nguyên.');
    }
    this.type = data.type;
    this.value = data.value;
  }

  get description(): string {
    switch (this.type) {
      case BuffType.MAX_GROW_TIME_PERCENT:
        return `Giảm thời gian trồng tối đa ${this.value}%`;
      case BuffType.CURRENT_GROW_TIME_PERCENT:
        return `Giảm thời gian còn lại ${this.value}%`;
      case BuffType.CURRENT_GROW_TIME_MINUTES:
        return `Giảm thời gian còn lại ${this.value} phút`;
      case BuffType.EXTRA_YIELD:
        return `Sản lượng +${this.value}`;
      case BuffType.MUTATION_CHANCE_PERCENT:
        return `Tỉ lệ đột biến +${this.value}%`;
    }
  }

  toJSON(): BuffData {
    return { type: this.type, value: this.value };
  }
}
