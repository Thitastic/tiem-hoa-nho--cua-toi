import { GameStorage, type GameState } from './GameStorage';
import type { LevelUpEvent } from '../models/PlayerLevel';
import { getPotById } from '../data/pots';

/** Điểm truy cập chung cho state; mỗi thao tác thành công đều lưu xuống storage. */
export class GameStore {
  readonly state: GameState;
  private readonly listeners = new Set<() => void>();

  constructor(state: GameState = GameStorage.load()) {
    this.state = state;
    GameStorage.save(this.state);
  }

  get player() { return this.state.player; }
  get greenhouses() { return this.state.greenhouses; }
  get inventory() { return this.state.inventory; }

  /** HUD và scene có thể đăng ký để phản ánh thay đổi tức thời. */
  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    listener();
    return () => this.listeners.delete(listener);
  }

  save(): boolean {
    const saved = GameStorage.save(this.state);
    this.notifyChange();
    return saved;
  }

  notifyChange(): void {
    // Lỗi ở một HUD/scene không được làm hỏng giao dịch đã lưu thành công.
    for (const listener of this.listeners) {
      try {
        listener();
      } catch (error) {
        console.error('Lỗi cập nhật giao diện sau thay đổi GameStore:', error);
      }
    }
  }

  addCoin(amount: number): void {
    this.player.addCoin(amount);
    this.save();
  }

  addDiamond(amount: number): void {
    this.player.addDiamond(amount);
    this.save();
  }

  addExp(amount: number): LevelUpEvent | null {
    const event = this.player.addExp(amount);
    this.save();
    return event;
  }

  unlockGreenhouse(id: number): void {
    const greenhouse = this.state.getGreenhouse(id);
    if (!greenhouse) throw new Error(`Không tồn tại nhà kính ${id}`);
    greenhouse.unlock = true;
    // Mở nhà kính đồng nghĩa các vị trí trong nhà kính đều có thể đặt chậu.
    greenhouse.unlockedPositions.forEach((row) => row.fill(true));
    greenhouse.plots.forEach((plot) => { plot.unlock = true; });
    this.save();
  }

  unlockPlot(greenhouseId: number, row: number, col: number): void {
    const greenhouse = this.state.getGreenhouse(greenhouseId);
    if (!greenhouse?.unlock) throw new Error('Nhà kính chưa mở khóa');
    const plot = greenhouse.getPlot(row, col);
    if (!plot) throw new Error('Vị trí ô đất không tồn tại');
    greenhouse.unlockedPositions[row][col] = true;
    plot.unlock = true;
    this.save();
  }

  setPot(greenhouseId: number, row: number, col: number, potId: number | null): void {
    const greenhouse = this.state.getGreenhouse(greenhouseId);
    if (!greenhouse?.unlock) throw new Error('Nhà kính chưa mở khóa');
    const plot = greenhouse.getPlot(row, col);
    if (!plot?.unlock) throw new Error('Ô đất chưa mở khóa');
    if (potId !== null && (!Number.isInteger(potId) || potId <= 0)) {
      throw new Error('potId không hợp lệ');
    }
    if (plot.flowerVariantId !== null || plot.seedId !== null) {
      throw new Error('Không thể đổi chậu khi đang trồng cây');
    }
    if (potId === plot.potId) return;
    if (potId !== null && !getPotById(potId)) throw new Error('Không tìm thấy loại chậu');

    const previousPotId = plot.potId;
    // Đặt chậu cần có chậu trong kho, lấy chậu ra thì hoàn trả về kho.
    if (potId !== null) this.inventory.remove('pot', potId, 1);
    try {
      if (previousPotId !== null) this.inventory.add('pot', previousPotId, 1);
    } catch (error) {
      if (potId !== null) this.inventory.add('pot', potId, 1);
      throw error;
    }
    plot.potId = potId;
    if (!this.save()) {
      // Thao tác lưu thất bại: trả chậu về đúng vị trí trong RAM.
      plot.potId = previousPotId;
      if (previousPotId !== null) this.inventory.remove('pot', previousPotId, 1);
      if (potId !== null) this.inventory.add('pot', potId, 1);
      this.notifyChange();
      throw new Error('Không lưu được thay đổi chậu');
    }
  }
}
