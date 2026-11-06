import type { FlowerSeed } from '../models/FlowerSeed';
import type { FlowerVariant } from '../models/FlowerVariant';
import { FLOWER_VARIANTS } from '../data/flowerVariants';

/**
 * Chọn biến thể khi gieo. Chỉ gọi một lần khi trồng và lưu kết quả vào PotGrid.
 * Tỉ lệ đột biến hạt là % (25 = 25%), trọng số biến thể được chuẩn hóa
 * trong tập đủ điều kiện vì tổng trọng số các biến thể có thể khác 100.
 */
export function rollFlowerVariant(
  seed: FlowerSeed,
  mutationBuffPercent = 0,
  random: () => number = Math.random,
  variants: readonly FlowerVariant[] = FLOWER_VARIANTS,
): FlowerVariant {
  const family = variants.filter((variant) => variant.flowerId === seed.flowerId);
  if (seed.targetType === 'variant') {
    const fixed = family.find((variant) => variant.id === seed.flowerVariantId);
    if (!fixed) throw new Error(`Không tìm thấy biến thể cố định của hạt ${seed.id}`);
    return fixed;
  }

  const base = family.find((variant) => variant.isOriginal);
  const mutated = family.filter((variant) => !variant.isOriginal && variant.mutationChance > 0);
  const mutationChance = Math.max(0, Math.min(100, seed.mutationChance + mutationBuffPercent));
  if (random() * 100 >= mutationChance && !seed.guaranteedRarity) {
    if (!base) throw new Error(`Chưa khai báo biến thể gốc cho loài hoa ${seed.flowerId}`);
    return base;
  }

  const candidates = seed.guaranteedRarity
    ? mutated.filter((variant) => variant.rarityId === seed.guaranteedRarity)
    : mutated;
  const totalWeight = candidates.reduce((sum, variant) => sum + variant.mutationChance, 0);
  if (!totalWeight) throw new Error(`Không có biến thể phù hợp hạt ${seed.id}`);
  let roll = random() * totalWeight;
  for (const variant of candidates) {
    roll -= variant.mutationChance;
    if (roll < 0) return variant;
  }
  return candidates[candidates.length - 1];
}
