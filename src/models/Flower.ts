export interface FlowerData {
  id: number;
  name: string;
  growMinutes?: number;
  wateringMinutes?: number;
}

export class Flower implements Readonly<FlowerData> {
  readonly id: number;
  readonly name: string;
  readonly growMinutes: number;
  readonly wateringMinutes: number;

  constructor(data: FlowerData) {
    if (!Number.isInteger(data.id) || data.id <= 0) throw new Error('Flower.id không hợp lệ');
    if (!data.name.trim()) throw new Error('Flower.name không được rỗng');
    if ((data.growMinutes ?? 30) <= 0 || (data.wateringMinutes ?? 10) <= 0) {
      throw new Error('Thời gian trồng/tưới phải lớn hơn 0');
    }
    this.id = data.id;
    this.name = data.name;
    this.growMinutes = data.growMinutes ?? 30;
    this.wateringMinutes = data.wateringMinutes ?? 10;
  }
}
