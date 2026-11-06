import { Player, type PlayerData } from '../models/Player';
import { Greenhouse, type GreenhouseData } from '../models/Greenhouse';
import { Inventory, type InventoryItem } from '../models/Inventory';

const SAVE_KEY = 'flower-shop:save:v1';
const LEGACY_LEVEL_KEY = 'flower-shop:player-level:v1';
const STARTER_COIN_KEY = 'flower-shop:starter-coins:v1';
const STARTER_COINS = 100;
const ROWS = 4;
const COLS = 4;
const GREENHOUSE_COUNT = 5;

export interface GameSaveData {
  version: 1;
  player: PlayerData;
  greenhouses: GreenhouseData[];
  inventory?: InventoryItem[];
  purchasedCounts?: Record<string, number>;
}

export class GameState {
  constructor(
      readonly player: Player,
      readonly greenhouses: Greenhouse[],
      readonly inventory: Inventory = new Inventory(),
      readonly purchasedCounts: Record<string, number> = {},
  ) {}

  toJSON(): GameSaveData {
    return {
      version: 1,
      player: this.player.toJSON(),
      greenhouses: this.greenhouses.map((greenhouse) => greenhouse.toJSON()),
      inventory: this.inventory.toJSON(),
      purchasedCounts: { ...this.purchasedCounts },
    };
  }

  getGreenhouse(id: number): Greenhouse | undefined {
    return this.greenhouses.find((greenhouse) => greenhouse.id === id);
  }
}

/** Khởi đầu: nhà kính 1 có 16 vị trí đặt chậu, trong đó 3 vị trí đã có Chậu thường. */
export function createInitialGameState(uid: string = crypto.randomUUID()): GameState {
  const player = new Player({ uid, coin: STARTER_COINS, diamond: 0, level: 1, exp: 0, totalEarnedExp: 0 });
  const greenhouses: Greenhouse[] = [];

  for (let id = 1; id <= GREENHOUSE_COUNT; id++) {
    const unlock = id === 1;
    const unlockedPositions = Array.from({ length: ROWS }, () =>
        Array.from({ length: COLS }, () => unlock),
    );
    const greenhouse = new Greenhouse({ id, name: `Nhà kính ${id}`, unlock, unlockedPositions });
    if (unlock) {
      for (let col = 0; col < 3; col++) {
        const plot = greenhouse.getPlot(0, col);
        if (plot) plot.potId = 1;
      }
    }
    greenhouses.push(greenhouse);
  }

  return new GameState(player, greenhouses);
}

export class GameStorage {
  static load(): GameState {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (raw) {
        const data = JSON.parse(raw) as GameSaveData;
        if (data.version !== 1 || !data.player || !Array.isArray(data.greenhouses) ||
            data.greenhouses.length !== GREENHOUSE_COUNT) {
          throw new Error('Save không đúng phiên bản hoặc thiếu nhà kính');
        }
        // Chuyển save cũ: ô chưa có chậu không còn bị coi là ô khóa.
        // Giữ nguyên chậu/cây và toàn bộ thông tin người chơi hiện có.
        const greenhouses = data.greenhouses.map((greenhouseData) => {
          if (!greenhouseData.unlock) return new Greenhouse(greenhouseData);
          return new Greenhouse({
            ...greenhouseData,
            unlockedPositions: greenhouseData.unlockedPositions.map((row) => row.map(() => true)),
            plots: greenhouseData.plots?.map((plot) => ({ ...plot, unlock: true })),
          });
        });
        const inventory = new Inventory(Array.isArray(data.inventory) ? data.inventory : []);
        const purchasedCounts = data.purchasedCounts && typeof data.purchasedCounts === 'object'
          ? { ...data.purchasedCounts }
          : {};
        const state = new GameState(new Player(data.player), greenhouses, inventory, purchasedCounts);
        // Tặng một lần cho save được tạo trước khi có 100 xu khởi đầu.
        // Không xóa tiến trình, chậu, cây hoặc số xu đã kiếm được.
        if (localStorage.getItem(STARTER_COIN_KEY) !== '1') {
          state.player.addCoin(STARTER_COINS);
          if (GameStorage.save(state)) localStorage.setItem(STARTER_COIN_KEY, '1');
        }
        return state;
      }
    } catch (error) {
      console.warn('Không đọc được save hiện tại:', error);
    }

    // Chỉ lấy level/exp từ hệ thống lưu cũ, không thay đổi mặc định nhà kính.
    const initial = createInitialGameState();
    try {
      const oldRaw = localStorage.getItem(LEGACY_LEVEL_KEY);
      if (oldRaw) {
        const old = JSON.parse(oldRaw) as Partial<PlayerData>;
        const migrated = new GameState(
            new Player({
              ...initial.player.toJSON(),
              level: old.level ?? 1,
              exp: old.exp ?? 0,
              totalEarnedExp: old.totalEarnedExp ?? 0,
            }),
            initial.greenhouses,
        );
        if (GameStorage.save(migrated)) localStorage.setItem(STARTER_COIN_KEY, '1');
        return migrated;
      }
    } catch (error) {
      console.warn('Không thể chuyển level cũ:', error);
    }
    if (GameStorage.save(initial)) localStorage.setItem(STARTER_COIN_KEY, '1');
    return initial;
  }

  static save(state: GameState): boolean {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(state.toJSON()));
      return true;
    } catch (error) {
      console.warn('Không lưu được game:', error);
      return false;
    }
  }
}
