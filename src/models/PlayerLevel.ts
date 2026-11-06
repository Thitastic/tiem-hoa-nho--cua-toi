/** Tăng EXP theo cấp, đồng bộ với thanh AvatarFrame. */
export const PLAYER_LEVEL_CONFIG = {
  startLevel: 1,
  baseExp: 500,
  expIncreasePerLevel: 250,
} as const;

export interface PlayerLevelData {
  level: number;
  exp: number;
  totalEarnedExp: number;
}

export interface LevelUpEvent {
  previousLevel: number;
  newLevel: number;
  levelsGained: number;
}

export type PlayerLevelListener = (progress: Readonly<PlayerLevelData>, levelUp: LevelUpEvent | null) => void;

export class PlayerLevel {
  private levelValue: number;
  private expValue: number;
  private totalEarnedValue: number;
  private readonly listeners = new Set<PlayerLevelListener>();

  constructor(data: Partial<PlayerLevelData> = {}) {
    const level = data.level ?? PLAYER_LEVEL_CONFIG.startLevel;
    const exp = data.exp ?? 0;
    const totalEarnedExp = data.totalEarnedExp ?? 0;
    if (!Number.isSafeInteger(level) || level < 1 || !Number.isSafeInteger(exp) || exp < 0 ||
        !Number.isSafeInteger(totalEarnedExp) || totalEarnedExp < 0) {
      throw new Error('Dữ liệu cấp độ/EXP không hợp lệ');
    }
    this.levelValue = level;
    this.expValue = exp;
    this.totalEarnedValue = totalEarnedExp;
    this.normalize();
  }

  /** EXP cần để đi từ level hiện tại lên level tiếp theo. */
  static requiredExp(level: number): number {
    if (!Number.isSafeInteger(level) || level < 1) throw new Error('Level phải là số nguyên dương');
    return PLAYER_LEVEL_CONFIG.baseExp + (level - 1) * PLAYER_LEVEL_CONFIG.expIncreasePerLevel;
  }

  get level(): number { return this.levelValue; }
  get exp(): number { return this.expValue; }
  get expRequired(): number { return PlayerLevel.requiredExp(this.levelValue); }
  get totalEarnedExp(): number { return this.totalEarnedValue; }
  get progress(): number { return this.expValue / this.expRequired; }

  get snapshot(): PlayerLevelData {
    return { level: this.levelValue, exp: this.expValue, totalEarnedExp: this.totalEarnedValue };
  }

  /** Cộng EXP, tự lên nhiều level nếu nhận thưởng lớn. */
  addExp(amount: number): LevelUpEvent | null {
    if (!Number.isSafeInteger(amount) || amount < 0) throw new Error('EXP cộng phải là số nguyên không âm');
    if (amount === 0) return null;
    if (!Number.isSafeInteger(this.expValue + amount) || !Number.isSafeInteger(this.totalEarnedValue + amount)) {
      throw new Error('EXP vượt giới hạn số nguyên an toàn');
    }
    const previousLevel = this.levelValue;
    this.expValue += amount;
    this.totalEarnedValue += amount;
    this.normalize();
    const levelUp = this.levelValue > previousLevel
      ? { previousLevel, newLevel: this.levelValue, levelsGained: this.levelValue - previousLevel }
      : null;
    this.emit(levelUp);
    return levelUp;
  }

  /** Đăng ký cập nhật cho AvatarFrame, UI nhiệm vụ, phần thưởng mở khóa... */
  subscribe(listener: PlayerLevelListener): () => void {
    this.listeners.add(listener);
    listener(this.snapshot, null);
    return () => this.listeners.delete(listener);
  }

  private normalize(): void {
    while (this.expValue >= this.expRequired) {
      this.expValue -= this.expRequired;
      this.levelValue += 1;
    }
  }

  private emit(levelUp: LevelUpEvent | null): void {
    const snapshot = this.snapshot;
    for (const listener of this.listeners) listener(snapshot, levelUp);
  }
}
