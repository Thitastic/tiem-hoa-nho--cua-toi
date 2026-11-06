import { PotGrid, type PotGridData } from './PotGrid';

export interface GreenhouseData {
  id: number;
  name: string;
  unlock: boolean;
  /** Ma trận boolean: true = ô đã mở, false = ô khóa. */
  unlockedPositions: boolean[][];
  /** Trạng thái ô đã lưu; nếu thiếu thì sinh ô mới theo matrix. */
  plots?: PotGridData[];
}

export class Greenhouse implements GreenhouseData {
  readonly id: number;
  readonly name: string;
  unlock: boolean;
  unlockedPositions: boolean[][];
  readonly plots: PotGrid[];

  constructor(data: GreenhouseData) {
    this.id = data.id;
    this.name = data.name;
    this.unlock = data.unlock;
    this.unlockedPositions = data.unlockedPositions.map((row) => [...row]);
    this.plots = this.unlockedPositions.flatMap((row, rowIndex) =>
      row.map((isUnlocked, colIndex) => {
        const saved = data.plots?.find((plot) =>
          plot.position.row === rowIndex && plot.position.col === colIndex,
        );
        return new PotGrid({
          ...saved,
          id: rowIndex * row.length + colIndex + 1,
          position: { row: rowIndex, col: colIndex },
          unlock: this.unlock && isUnlocked,
          potId: this.unlock && isUnlocked ? (saved?.potId ?? null) : null,
        });
      }),
    );
  }

  getPlot(row: number, col: number): PotGrid | undefined {
    return this.plots.find((plot) => plot.position.row === row && plot.position.col === col);
  }

  toJSON(): GreenhouseData {
    return {
      id: this.id,
      name: this.name,
      unlock: this.unlock,
      unlockedPositions: this.unlockedPositions.map((row) => [...row]),
      plots: this.plots.map((plot) => ({
        ...plot,
        position: { ...plot.position },
      })),
    };
  }
}
