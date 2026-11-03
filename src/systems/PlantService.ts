import { StatResolver, type Modifier } from '../core/Modifier';
import type { EventBus } from '../core/EventBus';
import type { UtcClock } from '../core/UtcClock';
import type { Rng } from '../core/Rng';
import { computePlantStage } from '../core/plantStage';
import { calculateGrowTimeSecAtPlant } from '../core/growTime';
import type { SaveData } from '../model/SaveData';
import type { PlantInstance } from '../model/PlantInstance';
import type { PotInstance } from '../model/PotInstance';
import { familyById, variantById } from '../data/catalogRegistry';
import { seedById } from '../data/seeds';
import { potById } from '../data/pots';
import { rarityById } from '../data/rarities';
import { STAT_LIMITS } from '../data/config';
import type { InventoryService } from './InventoryService';

export interface PlantStatus { progressSec:number;growTimeSec:number;ratio:number;needsWater:boolean;ready:boolean;stage:number;remainingSec:number }

export interface PlantStatusInput {
  plant: Pick<PlantInstance, 'progressSec'|'lastWateredAt'|'growTimeSecAtPlant'>;
  nowUtc: number;
  wateringIntervalSec: number;
  growthPausesWhenDry: boolean;
  stageThresholds: number[];
}

export const computePlantStatusAt = ({ plant, nowUtc, wateringIntervalSec, growthPausesWhenDry, stageThresholds }: PlantStatusInput): PlantStatus => {
  const elapsedSec = Math.max(0, (nowUtc - plant.lastWateredAt) / 1000);
  const growingElapsedSec = growthPausesWhenDry ? Math.min(elapsedSec, wateringIntervalSec) : elapsedSec;
  const growTimeSec = plant.growTimeSecAtPlant;
  const progressSec = Math.min(growTimeSec, plant.progressSec + growingElapsedSec);
  const ready = progressSec >= growTimeSec;
  const needsWater = !ready && elapsedSec >= wateringIntervalSec;
  const ratio = Math.min(1, progressSec / growTimeSec);
  return {
    progressSec, growTimeSec, ratio, needsWater, ready,
    stage: computePlantStage(ratio, stageThresholds),
    remainingSec: Math.max(0, growTimeSec - progressSec),
  };
};

export class PlantService {
  forcedVariantId:string|null = null;
  forcedStage:number|null = null;
  debugSelectedPlantUid:string|null = null;

  constructor(
    private save:SaveData,
    private inventory:InventoryService,
    private clock:UtcClock,
    private rng:Rng,
    private events:EventBus,
    private globalModifiers:()=>Modifier[],
  ) {}

  plant(pot:PotInstance, seedId:string):PlantInstance|null {
    if (pot.plantUid || this.inventory.count('seeds', seedId) <= 0) return null;
    const seed = seedById(seedId); const family = familyById(seed.familyId);
    const modifiers = [...this.globalModifiers(), ...potById(pot.potId).modifiers, ...(seed.mutationBonus ? [{ stat:'mutationChance', op:'add' as const, value:seed.mutationBonus, scope:{ family:seed.familyId }, source:`seed.${seed.id}` }] : [])];
    const resolver = new StatResolver(() => modifiers, STAT_LIMITS); let variantId = this.forcedVariantId;
    if (!variantId) {
      const minimum = seed.minRarity ? rarityById(seed.minRarity).order : 0;
      const candidates = family.variants.filter((variant) => variant.id !== family.baseVariantId && rarityById(variant.rarity).order >= minimum);
      const mutates = seed.forceMutation || this.rng.next() < resolver.get('mutationChance', { base:family.mutationChance, family:family.id });
      variantId = mutates && candidates.length ? this.rng.weighted(candidates, (variant) => variant.mutationWeight).id : family.baseVariantId;
    }
    this.inventory.remove('seeds', seedId, 1);
    const now = this.clock.now();
    const plant:PlantInstance = {
      uid: this.rng.id('plant'), variantId, seedId, potUid: pot.uid,
      plantedAt: now, progressSec: 0, lastWateredAt: now,
      growTimeSecAtPlant: calculateGrowTimeSecAtPlant(variantId, pot.potId, this.globalModifiers()),
    };
    this.save.plants.push(plant); pot.plantUid = plant.uid;
    this.events.emit({ type:'Planted', at:now, payload:{ familyId:family.id, variantId } });
    return plant;
  }

  status(plant:PlantInstance):PlantStatus { return this.statusAt(plant, this.clock.now()); }

  statusAt(plant:PlantInstance, nowUtc:number):PlantStatus {
    const variant = variantById(plant.variantId); const family = familyById(variant.familyId);
    const status = computePlantStatusAt({ plant, nowUtc, wateringIntervalSec:family.wateringIntervalSec[0], growthPausesWhenDry:family.growthPausesWhenDry, stageThresholds:family.stageThresholds });
    if (this.forcedStage !== null && this.debugSelectedPlantUid === plant.uid) status.stage = this.forcedStage;
    return status;
  }

  water(plant:PlantInstance):boolean {
    const now = this.clock.now(); const status = this.statusAt(plant, now); if (status.ready) return false;
    plant.progressSec = status.progressSec;
    const reduction = new StatResolver(this.globalModifiers, STAT_LIMITS).get('waterReduction', { base:0 });
    plant.progressSec += (status.growTimeSec - plant.progressSec) * reduction;
    plant.lastWateredAt = now;
    this.events.emit({ type:'Watered', at:now, payload:{ variantId:plant.variantId } });
    return true;
  }

  harvest(plant:PlantInstance):number {
    const now = this.clock.now(); const status = this.statusAt(plant, now); if (!status.ready) return 0;
    const variant = variantById(plant.variantId); const pot = this.findPot(plant.potUid);
    const amount = Math.floor(new StatResolver(() => [...this.globalModifiers(), ...potById(pot.potId).modifiers], STAT_LIMITS).get('yield', { base:variant.yield, family:variant.familyId, variantId:variant.id, rarity:variant.rarity, tags:variant.tags }));
    this.inventory.add('flowers', variant.id, amount); pot.plantUid = null; this.save.plants = this.save.plants.filter((item) => item.uid !== plant.uid);
    this.events.emit({ type:'Harvested', at:now, payload:{ variantId:variant.id, familyId:variant.familyId, rarity:variant.rarity, count:amount } });
    return amount;
  }

  findPlant(uid:string|null):PlantInstance|undefined { return uid ? this.save.plants.find((plant) => plant.uid === uid) : undefined; }
  private findPot(uid:string):PotInstance { return this.save.greenhouses.flatMap((greenhouse) => greenhouse.pots).find((pot) => pot.uid === uid)!; }
}
