export type ShopItemType = 'flower' | 'pot' | 'seed' | 'tool' | 'boost' | 'special';
export type ShopCurrency = 'coin' | 'diamond';

/** Shop chỉ tham chiếu item gốc; thay đổi giá ở đây không sửa Pot/Seed. */
export interface ShopItem {
  id: number;
  itemType: ShopItemType;
  itemId: number;
  currency: ShopCurrency;
  price: number;
  requiredLevel: number;
  stock: number; // -1: không giới hạn; 0: hết hàng.
  available: boolean;
}

export function validateShopItem(item: ShopItem): void {
  if (![item.id, item.itemId, item.requiredLevel, item.price, item.stock].every(Number.isSafeInteger)
      || item.id <= 0 || item.itemId <= 0 || item.requiredLevel < 1
      || item.price < 0 || item.stock < -1) {
    throw new Error(`Dữ liệu ShopItem ${item.id} không hợp lệ`);
  }
}
