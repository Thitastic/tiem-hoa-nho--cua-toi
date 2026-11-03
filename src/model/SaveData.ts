import type { InventoryData, WalletData } from '../core/types';
import type { Modifier } from '../core/Modifier';
import type { GreenhouseInstance } from './GreenhouseInstance';
import type { PlantInstance } from './PlantInstance';
import type { CustomerState } from './CustomerState';
import type { OrderInstance } from './OrderInstance';
import { GAME_CONFIG } from '../data/config';
import { CUSTOMERS } from '../data/customers';
import { UPGRADES } from '../data/upgrades';
import { ROSE_TRACK } from '../data/tracks/roseTrack';
import { calculateGrowTimeSecAtPlant } from '../core/growTime';
import { allPlantFamilies } from '../data/catalogRegistry';

export interface QuestState { progress:number;completed:boolean;claimed:boolean }
export interface SaveData {
  saveVersion:number;
  savedAt:number;
  lastSeenUtc:number;
  originAtSave:string;
  player:{activeGreenhouseId:string;createdAt:number;totalExp:number;unlockedFamilyIds:string[]};
  wallet:WalletData;
  inventory:InventoryData;
  greenhouses:GreenhouseInstance[];
  plants:PlantInstance[];
  customers:CustomerState[];
  orders:OrderInstance[];
  progress:Record<string,number>;
  quests:Record<string,QuestState>;
  upgrades:Record<string,number>;
  claimedRanks:Record<string,number>;
  knownRecipes:string[];
}

export const createDefaultSave = (nowUtc: number, origin = ''): SaveData => ({
  saveVersion: GAME_CONFIG.saveVersion,
  savedAt: Math.floor(nowUtc),
  lastSeenUtc: Math.floor(nowUtc),
  originAtSave: origin,
  player: { activeGreenhouseId: 'greenhouse_1', createdAt: Math.floor(nowUtc), totalExp:0, unlockedFamilyIds:allPlantFamilies().filter((family)=>family.unlockLevel<=1).map((family)=>family.id) },
  wallet: { coin: GAME_CONFIG.startCoins },
  inventory: { seeds: { [GAME_CONFIG.startSeedId]: GAME_CONFIG.startSeeds }, flowers: {}, bouquets: {}, pots: {}, items: {} },
  greenhouses: [{
    uid: 'greenhouse_1', defId: 'greenhouse_1',
    pots: Array.from({ length: GAME_CONFIG.startPots }, (_, index) => ({ uid: `pot_start_${index + 1}`, potId: GAME_CONFIG.startPotId, slotIndex: index, plantUid: null })),
  }],
  plants: [],
  customers: CUSTOMERS.map((customer) => ({ customerId: customer.id, favor: 0, lastOrderAt: 0, cooldownUntil: 0, rejectStreak: 0, completedCount: 0 })),
  orders: [], progress: { rose: 0 }, quests: {}, upgrades: { [GAME_CONFIG.startWateringCan]: 1 }, claimedRanks: { rose: 0 }, knownRecipes: [],
});

const timestamp = (value: unknown, fallback: number): number =>
  typeof value === 'number' && Number.isFinite(value) ? Math.floor(value) : Math.floor(fallback);

const modifiersFromSave = (save: Pick<SaveData, 'upgrades'|'progress'>): Modifier[] => {
  const upgradeModifiers = UPGRADES.flatMap((upgrade) => upgrade.levels.slice(0, save.upgrades[upgrade.id] ?? 0)
    .flatMap((level) => level.effects.filter((effect) => effect.type === 'modifier').map((effect) => effect.modifier)));
  const points = save.progress.rose ?? 0;
  const rank = ROSE_TRACK.milestones.filter((milestone) => points >= milestone.points).length;
  const rankModifiers = ROSE_TRACK.milestones.filter((milestone) => milestone.rank <= rank)
    .flatMap((milestone) => milestone.rewards.filter((reward) => reward.type === 'modifier').map((reward) => reward.modifier));
  return [...upgradeModifiers, ...rankModifiers];
};

export const migrateSave = (raw: unknown, _fromVersion: number, nowUtc = 0, origin = ''): SaveData => {
  const source = raw && typeof raw === 'object' ? raw as Partial<SaveData> : {};
  const sourceSavedAt = timestamp(source.savedAt, nowUtc);
  // Clock ảo v1 có thể đẩy cả timeline vào tương lai; dịch đồng loạt để giữ khoảng cách tương đối.
  const legacyClockShift = _fromVersion < 2 && nowUtc > 0 && sourceSavedAt > nowUtc ? Math.floor(nowUtc - sourceSavedAt) : 0;
  const migrateTimestamp = (value:unknown, fallback:number):number => {
    if (typeof value !== 'number' || !Number.isFinite(value)) return Math.floor(fallback);
    const parsed = Math.floor(value); return parsed > 0 ? parsed + legacyClockShift : parsed;
  };
  const savedAt = sourceSavedAt + legacyClockShift;
  const fallback = createDefaultSave(savedAt || nowUtc, origin);
  const merged: SaveData = {
    ...fallback,
    ...source,
    savedAt,
    lastSeenUtc: migrateTimestamp(source.lastSeenUtc, savedAt),
    originAtSave: typeof source.originAtSave === 'string' ? source.originAtSave : origin,
    // Save cũ không có bộ đếm lifetime đáng tin cậy, nên EXP bắt đầu từ 0 thay vì ước lượng sai.
    player: { ...fallback.player, ...source.player, createdAt: migrateTimestamp(source.player?.createdAt, savedAt), totalExp:Math.max(0,Math.floor(source.player?.totalExp??0)), unlockedFamilyIds:Array.isArray(source.player?.unlockedFamilyIds)?[...new Set(source.player.unlockedFamilyIds)]:fallback.player.unlockedFamilyIds },
    wallet: { ...fallback.wallet, ...source.wallet },
    inventory: { ...fallback.inventory, ...source.inventory },
    greenhouses: Array.isArray(source.greenhouses) ? source.greenhouses : fallback.greenhouses,
    plants: Array.isArray(source.plants) ? source.plants as PlantInstance[] : [],
    customers: Array.isArray(source.customers) ? source.customers as CustomerState[] : fallback.customers,
    orders: Array.isArray(source.orders) ? source.orders as OrderInstance[] : [],
    progress: { ...fallback.progress, ...source.progress },
    quests: { ...fallback.quests, ...source.quests },
    upgrades: { ...fallback.upgrades, ...source.upgrades },
    claimedRanks: { ...fallback.claimedRanks, ...source.claimedRanks },
    knownRecipes: Array.isArray(source.knownRecipes) ? source.knownRecipes : [],
    saveVersion: GAME_CONFIG.saveVersion,
  };

  const globalModifiers = modifiersFromSave(merged);
  const potIds = new Map(merged.greenhouses.flatMap((greenhouse) => greenhouse.pots.map((pot) => [pot.uid, pot.potId] as const)));
  merged.plants = merged.plants.map((plant) => ({
    ...plant,
    // Save v1 đã dùng epoch ms; chỉ chuẩn hóa về số nguyên và giữ nguyên mốc cũ.
    plantedAt: migrateTimestamp(plant.plantedAt, savedAt),
    lastWateredAt: migrateTimestamp(plant.lastWateredAt, migrateTimestamp(plant.plantedAt, savedAt)),
    growTimeSecAtPlant: typeof plant.growTimeSecAtPlant === 'number' && plant.growTimeSecAtPlant > 0
      ? plant.growTimeSecAtPlant
      : calculateGrowTimeSecAtPlant(plant.variantId, potIds.get(plant.potUid) ?? GAME_CONFIG.startPotId, globalModifiers),
  }));
  merged.orders = merged.orders.map((order) => ({ ...order, createdAt: migrateTimestamp(order.createdAt, savedAt), expiresAt: migrateTimestamp(order.expiresAt, savedAt) }));
  merged.customers = merged.customers.map((customer) => ({
    ...customer,
    lastOrderAt: migrateTimestamp(customer.lastOrderAt, 0),
    cooldownUntil: migrateTimestamp(customer.cooldownUntil, 0),
  }));
  return merged;
};
