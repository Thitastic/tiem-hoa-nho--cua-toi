/** ISO 8601; sự kiện hết hạn khi thời điểm hiện tại >= due_date. */
export class Event {
  constructor(
    public readonly id: number,
    public readonly name: string,
    public readonly due_date: string,
    public readonly asset: string,
  ) {
    if (!Number.isSafeInteger(id) || id <= 0 || !name.trim() || !Number.isFinite(Date.parse(due_date))) {
      throw new Error(`Event không hợp lệ: ${id}`);
    }
  }

  get isActive(): boolean {
    return Date.now() < Date.parse(this.due_date);
  }
}
