import { FlowerVariant } from '../models/FlowerVariant';
import { FlowerRarityId as R } from '../models/FlowerRarity';

const prefix = '/assets/flowers/';
const shared = [`${prefix}chrysanthemum-0.png`, `${prefix}chrysanthemum-1.png`] as const;

/** mutationChance là trọng số trong nhóm đột biến, 20 = 20 phần trọng số. */
export const FLOWER_VARIANTS: readonly FlowerVariant[] = [
  new FlowerVariant({ id: 101, flowerId: 1, name: 'Cúc mẫu đơn vàng', asset: [...shared, `${prefix}chrysanthemum-0-2.png`, `${prefix}chrysanthemum-0-3.png`], product: `${prefix}chrysanthemum-0-4.png`, baseYield: 3, rarityId: R.Common, mutationChance: -1, price: 10 }),
  new FlowerVariant({ id: 102, flowerId: 1, name: 'Cúc mẫu đơn trắng', asset: [...shared, `${prefix}chrysanthemum-1-2.png`, `${prefix}chrysanthemum-1-3.png`], product: `${prefix}chrysanthemum-1-4.png`, baseYield: 3, rarityId: R.Rare, mutationChance: 20, price: 10 }),
  new FlowerVariant({ id: 103, flowerId: 1, name: 'Cúc mẫu đơn tím', asset: [...shared, `${prefix}chrysanthemum-2-2.png`, `${prefix}chrysanthemum-2-3.png`], product: `${prefix}chrysanthemum-2-4.png`, baseYield: 3, rarityId: R.Rare, mutationChance: 20, price: 15 }),
  new FlowerVariant({ id: 104, flowerId: 1, name: 'Cúc mẫu đơn hồng', asset: [...shared, `${prefix}chrysanthemum-3-2.png`, `${prefix}chrysanthemum-3-3.png`], product: `${prefix}chrysanthemum-3-4.png`, baseYield: 3, rarityId: R.Rare, mutationChance: 20, price: 15 }),
  new FlowerVariant({ id: 105, flowerId: 1, name: 'Cúc mẫu đơn đỏ', asset: [...shared, `${prefix}chrysanthemum-4-2.png`, `${prefix}chrysanthemum-4-3.png`], product: `${prefix}chrysanthemum-4-4.png`, baseYield: 3, rarityId: R.Epic, mutationChance: 12.5, price: 25 }),
  new FlowerVariant({ id: 106, flowerId: 1, name: 'Cúc mẫu đơn cốm', asset: [...shared, `${prefix}chrysanthemum-5-2.png`, `${prefix}chrysanthemum-5-3.png`], product: `${prefix}chrysanthemum-5-4.png`, baseYield: 3, rarityId: R.Epic, mutationChance: 12.5, price: 25 }),
  new FlowerVariant({ id: 107, flowerId: 1, name: 'Cúc mẫu đơn hoàng gia', asset: [...shared, `${prefix}chrysanthemum-6-2.png`, `${prefix}chrysanthemum-6-3.png`], product: `${prefix}chrysanthemum-6-4.png`, baseYield: 2, rarityId: R.Legend, mutationChance: 5, price: 50 }),
];

if (new Set(FLOWER_VARIANTS.map((v) => v.id)).size !== FLOWER_VARIANTS.length) {
  throw new Error('Trùng ID biến thể hoa');
}

export const getFlowerVariantById = (id: number): FlowerVariant | undefined => FLOWER_VARIANTS.find((variant) => variant.id === id);
