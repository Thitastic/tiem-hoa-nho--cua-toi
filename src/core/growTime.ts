import { StatResolver, type Modifier } from './Modifier';
import { STAT_LIMITS } from '../data/config';
import { potById } from '../data/pots';
import { familyById, variantById } from '../data/catalogRegistry';

export const calculateGrowTimeSecAtPlant = (variantId: string, potId: string, globalModifiers: Modifier[]): number => {
  const variant = variantById(variantId);
  const family = familyById(variant.familyId);
  return new StatResolver(() => [...globalModifiers, ...potById(potId).modifiers], STAT_LIMITS).get('growTime', {
    base: family.growTimeSec,
    family: family.id,
    variantId: variant.id,
    rarity: variant.rarity,
    tags: variant.tags,
  });
};
