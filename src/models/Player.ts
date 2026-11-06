import { PlayerLevel, type LevelUpEvent, type PlayerLevelData } from './PlayerLevel';

export interface PlayerData {
  uid: string;
  coin: number;
  diamond: number;
  level: number;
  exp: number;
  totalEarnedExp?: number;
}

export class Player {
  readonly uid: string;
  coin: number;
  diamond: number;
  readonly levelSystem: PlayerLevel;

  constructor(data: PlayerData) {
    if (!data.uid.trim()) throw new Error('UID không được rỗng');
    if (!Number.isSafeInteger(data.coin) || data.coin < 0 ||
        !Number.isSafeInteger(data.diamond) || data.diamond < 0) {
      throw new Error('Số dư không hợp lệ');
    }
    this.uid = data.uid;
    this.coin = data.coin;
    this.diamond = data.diamond;
    this.levelSystem = new PlayerLevel(data);
  }

  get level(): number { return this.levelSystem.level; }
  get exp(): number { return this.levelSystem.exp; }
  get expRequired(): number { return this.levelSystem.expRequired; }

  addExp(amount: number): LevelUpEvent | null { return this.levelSystem.addExp(amount); }

  addCoin(amount: number): void {
    this.coin = Player.adjustBalance(this.coin, amount);
  }

  addDiamond(amount: number): void {
    this.diamond = Player.adjustBalance(this.diamond, amount);
  }

  private static adjustBalance(current: number, amount: number): number {
    if (!Number.isSafeInteger(amount) || !Number.isSafeInteger(current + amount) || current + amount < 0) {
      throw new Error('Thay đổi số dư không hợp lệ');
    }
    return current + amount;
  }

  toJSON(): PlayerData {
    const progress: PlayerLevelData = this.levelSystem.snapshot;
    return {
      uid: this.uid,
      coin: this.coin,
      diamond: this.diamond,
      ...progress,
    };
  }
}
