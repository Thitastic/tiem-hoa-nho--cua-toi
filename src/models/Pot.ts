import { Buff, type BuffData } from './Buff';

export interface PotData {
  id: number;
  name: string;
  /** Tên file ảnh trong public/assets/pots/ hoặc một URL asset đầy đủ. */
  asset: string;
  /** -1 = không bán trực tiếp bằng xu (ví dụ chậu sự kiện). */
  price: number;
  buffs?: readonly (Buff | BuffData)[];
}

export class Pot {
  readonly id: number;
  readonly name: string;
  readonly asset: string;
  readonly price: number;
  readonly buffs: readonly Buff[];

  constructor(data: PotData) {
    if (!Number.isInteger(data.id) || data.id <= 0) {
      throw new Error('ID chậu phải là số nguyên dương.');
    }
    if (!data.name.trim() || !data.asset.trim()) {
      throw new Error('Tên và đường dẫn asset của chậu không được rỗng.');
    }
    if (!Number.isInteger(data.price) || data.price < -1) {
      throw new Error('Giá chậu phải là số nguyên >= 0 hoặc -1.');
    }

    this.id = data.id;
    this.name = data.name;
    this.asset = data.asset;
    this.price = data.price;
    this.buffs = Object.freeze(
      (data.buffs ?? []).map((buff) =>
        buff instanceof Buff ? buff : new Buff(buff),
      ),
    );
  }

  get assetUrl(): string {
    return this.asset.startsWith('/') ? this.asset : `/assets/pots/${this.asset}`;
  }

  get isPurchasable(): boolean {
    return this.price >= 0;
  }

  get buffDescriptions(): string[] {
    return this.buffs.map((buff) => buff.description);
  }
}
