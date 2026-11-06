import { BuffType } from '../models/Buff';
import { Pot } from '../models/Pot';

/** Danh mục dữ liệu chậu. Thêm chậu mới bằng cách thêm một phần tử vào mảng. */
export const POTS: readonly Pot[] = Object.freeze([
  new Pot({
    id: 1,
    name: 'Chậu thường',
    asset: 'chau-thuong.png', // Giữ đúng tên file bạn cung cấp; có thể đổi nếu đây là nhầm lẫn.
    price: 50,
    buffs: [],
  }),
  new Pot({
    id: 2,
    name: 'Chậu đất nung',
    asset: 'chau-dat-nung.png',
    price: 100,
    buffs: [{ type: BuffType.MAX_GROW_TIME_PERCENT, value: 5 }],
  }),
  new Pot({
    id: 3,
    name: 'Chậu hoa cương',
    asset: 'chau-hoa-cuong.png',
    price: 250,
    buffs: [{ type: BuffType.MAX_GROW_TIME_PERCENT, value: 7 }],
  }),
  new Pot({
    id: 4,
    name: 'Chậu cẩm thạch',
    asset: 'chau-cam-thach.png',
    price: 700,
    buffs: [{ type: BuffType.MAX_GROW_TIME_PERCENT, value: 10 }],
  }),
  new Pot({
    id: 5,
    name: 'Chậu kim cương',
    asset: 'chau-kim-cuong.png',
    price: -1,
    buffs: [
      { type: BuffType.MAX_GROW_TIME_PERCENT, value: 10 },
      { type: BuffType.MUTATION_CHANCE_PERCENT, value: 5 },
      { type: BuffType.EXTRA_YIELD, value: 1 },
    ],
  }),
  new Pot({
    id: 6,
    name: 'Chậu vàng',
    asset: 'chau-vang.png',
    price: 2000,
    buffs: [
      { type: BuffType.MAX_GROW_TIME_PERCENT, value: 8 },
      { type: BuffType.MUTATION_CHANCE_PERCENT, value: 3 },
    ],
  }),
]);

export const POTS_BY_ID: ReadonlyMap<number, Pot> = new Map(
  POTS.map((pot) => [pot.id, pot]),
);

export function getPotById(id: number): Pot | undefined {
  return POTS_BY_ID.get(id);
}
