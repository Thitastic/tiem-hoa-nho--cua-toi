import { EventBus } from './core/EventBus';
import { UtcClock } from './core/UtcClock';
import { Rng } from './core/Rng';
import { SaveManager, type StorageLike } from './core/SaveManager';
import { GAME_CONFIG } from './data/config';
import { createDefaultSave, migrateSave, type SaveData } from './model/SaveData';
import { InventoryService } from './systems/InventoryService';
import { WalletService } from './systems/WalletService';
import { UpgradeService } from './systems/UpgradeService';
import { ProgressService } from './systems/ProgressService';
import { PlantService } from './systems/PlantService';
import { BouquetService } from './systems/BouquetService';
import { SellService } from './systems/SellService';
import { ShopService } from './systems/ShopService';
import { FavorService } from './systems/FavorService';
import { OrderService } from './systems/OrderService';
import { LevelService } from './systems/LevelService';
import { allPlantFamilies } from './data/catalogRegistry';
import type { Modifier } from './core/Modifier';

export interface OfflineSummary { awayMs:number;readyPlants:number;dryPlants:number;expiredOrders:number }
export interface GameOptions { clock?:UtcClock;origin?:string;production?:boolean }

export class Game {
  readonly events = new EventBus();
  readonly clock:UtcClock;
  readonly rng:Rng;
  readonly saveManager:SaveManager<SaveData>;
  readonly inventory:InventoryService;
  readonly wallet:WalletService;
  readonly upgrades:UpgradeService;
  readonly progress:ProgressService;
  readonly level:LevelService;
  readonly plants:PlantService;
  readonly bouquets:BouquetService;
  readonly sell:SellService;
  readonly shop:ShopService;
  readonly favor:FavorService;
  readonly orders:OrderService;
  readonly originMismatch:boolean;
  readonly offlineSummary:OfflineSummary|null;
  save:SaveData;
  private lastSave = 0;
  private readonly origin:string;

  constructor(storage:StorageLike = localStorage, options:GameOptions = {}) {
    this.origin = options.origin ?? (typeof location === 'undefined' ? '' : location.origin);
    this.clock = options.clock ?? new UtcClock(undefined, { storage, debugStorageKey:GAME_CONFIG.debugTimeStorageKey, production:options.production ?? import.meta.env.PROD });
    this.rng = new Rng(this.clock.now());
    this.saveManager = new SaveManager(
      storage, GAME_CONFIG.saveKey, GAME_CONFIG.saveVersion,
      () => createDefaultSave(this.clock.now(), this.origin),
      (raw, version) => migrateSave(raw, version, this.clock.now(), this.origin),
      () => this.save.savedAt,
    );
    this.save = this.saveManager.load();
    this.originMismatch = Boolean(this.save.originAtSave && this.origin && this.save.originAtSave !== this.origin);
    const previousSavedAt = this.save.savedAt;
    this.clock.restoreLastSeen(this.save.lastSeenUtc);
    const now = this.clock.now();

    this.inventory = new InventoryService(this.save.inventory);
    this.wallet = new WalletService(this.save.wallet);
    this.upgrades = new UpgradeService(this.save, this.wallet, this.events, this.clock);
    this.level = new LevelService(this.save, this.events, () => this.globalModifiers(), () => allPlantFamilies());
    this.progress = new ProgressService(this.save, this.events, this.inventory, this.rng, (itemId) => this.level.isRewardItemUnlocked(itemId));
    const modifiers = () => this.globalModifiers();
    this.plants = new PlantService(this.save, this.inventory, this.clock, this.rng, this.events, modifiers);
    this.bouquets = new BouquetService(this.inventory, modifiers, this.events, this.clock);
    this.sell = new SellService(this.inventory, this.wallet, this.progress, this.bouquets, modifiers, this.events, this.clock);
    this.shop = new ShopService(this.save, this.inventory, this.wallet, this.upgrades, this.events, this.clock, this.rng, (familyId) => this.level.isFamilyUnlocked(familyId));
    this.favor = new FavorService(this.save);
    this.orders = new OrderService(this.save, this.inventory, this.wallet, this.favor, this.progress, this.sell, this.bouquets, this.clock, this.rng, this.events, (itemId) => this.level.isRewardItemUnlocked(itemId));

    const expiredOrders = this.orders.expireAll(now);
    const statuses = this.save.plants.map((plant) => this.plants.statusAt(plant, now));
    const awayMs = Math.max(0, now - previousSavedAt);
    this.offlineSummary = GAME_CONFIG.offlineSummary.enabled && awayMs >= GAME_CONFIG.offlineSummary.minAwayMs
      ? { awayMs, readyPlants:statuses.filter((status) => status.ready).length, dryPlants:statuses.filter((status) => status.needsWater).length, expiredOrders }
      : null;
    while (this.orders.open().length < GAME_CONFIG.maxOpenOrders && this.orders.generate()) { /* Giữ giới hạn đơn hiện có. */ }
    this.events.on('*', () => this.saveNow());
    this.saveNow(now);
  }

  globalModifiers():Modifier[] { return [...this.upgrades.activeModifiers(), ...this.progress.activeModifiers()]; }

  reconcile():number { return this.orders.expireAll(this.clock.now()); }

  tick():void {
    const now = this.clock.now();
    this.orders.expireAll(now);
    if (now - this.lastSave >= GAME_CONFIG.autosaveMs) this.saveNow(now);
  }

  saveNow(now = this.clock.now()):void {
    this.save.savedAt = Math.floor(now);
    this.save.lastSeenUtc = this.clock.lastSeen();
    this.save.originAtSave = this.origin;
    this.saveManager.save(this.save);
    this.lastSave = now;
  }

  deleteSave():void { this.saveManager.delete(); }
}
