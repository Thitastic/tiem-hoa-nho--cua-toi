import { FlowerSeed } from '../models/FlowerSeed';
import { FlowerRarityId as R } from '../models/FlowerRarity';

/** Asset gói hạt giống được dùng chung giữa các loài theo độ hiếm. */
export const FLOWER_SEEDS: readonly FlowerSeed[] = [
  new FlowerSeed({ id: 1, flowerId: 1, name: 'Hạt cúc mẫu đơn thường', targetType: 'flower', price: 25, seedRarity: R.Common, asset: '/assets/seed-pack/common.png', mutationChance: 25 }),
  new FlowerSeed({ id: 2, flowerId: 1, name: 'Hạt cúc mẫu đơn hiếm', targetType: 'flower', price: 35, seedRarity: R.Rare, asset: '/assets/seed-pack/rare.png', mutationChance: 50 }),
  new FlowerSeed({ id: 3, flowerId: 1, name: 'Hạt cúc mẫu đơn epic (đột biến)', targetType: 'flower', price: 50, seedRarity: R.Epic, asset: '/assets/seed-pack/epic.png', mutationChance: 100 }),
  new FlowerSeed({ id: 4, flowerId: 1, name: 'Hạt cúc mẫu đơn epic (chắc chắn Epic)', targetType: 'flower', price: 50, seedRarity: R.Epic, asset: '/assets/seed-pack/epic.png', mutationChance: 100, guaranteedRarity: R.Epic }),
  new FlowerSeed({ id: 5, flowerId: 1, name: 'Hạt cúc mẫu đơn huyền thoại', targetType: 'flower', price: -1, seedRarity: R.Legend, asset: '/assets/seed-pack/legend.png', mutationChance: 100, guaranteedRarity: R.Legend }),
];

export const getFlowerSeedById = (id: number): FlowerSeed | undefined => FLOWER_SEEDS.find((seed) => seed.id === id);
