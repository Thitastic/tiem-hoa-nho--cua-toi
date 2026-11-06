import type { ShopItemType } from './ShopItem';

export interface InventoryItem {
  itemType: ShopItemType;
  itemId: number;
  quantity: number;
}

/** Đồ đang đặt trong nhà kính không được tính vào số lượng trong kho. */
export class Inventory {
  private readonly entries = new Map<string, InventoryItem>();

  constructor(data: readonly InventoryItem[] = []) {
    for (const entry of data) this.add(entry.itemType, entry.itemId, entry.quantity);
  }

  private static key(type: ShopItemType, id: number): string { return `${type}:${id}`; }

  get(type: ShopItemType, id: number): number {
    return this.entries.get(Inventory.key(type, id))?.quantity ?? 0;
  }

  add(type: ShopItemType, id: number, quantity: number): void {
    if (!Number.isSafeInteger(id) || id <= 0 || !Number.isSafeInteger(quantity) || quantity <= 0) {
      throw new Error('Số lượng hoặc itemId không hợp lệ');
    }
    const old = this.get(type, id);
    if (!Number.isSafeInteger(old + quantity)) throw new Error('Kho đã vượt giới hạn');
    this.entries.set(Inventory.key(type, id), { itemType: type, itemId: id, quantity: old + quantity });
  }

  remove(type: ShopItemType, id: number, quantity: number): void {
    if (!Number.isSafeInteger(quantity) || quantity <= 0 || this.get(type, id) < quantity) {
      throw new Error('Không đủ vật phẩm trong kho');
    }
    const left = this.get(type, id) - quantity;
    if (left === 0) this.entries.delete(Inventory.key(type, id));
    else this.entries.set(Inventory.key(type, id), { itemType: type, itemId: id, quantity: left });
  }

  toJSON(): InventoryItem[] { return Array.from(this.entries.values(), (entry) => ({ ...entry })); }
}
