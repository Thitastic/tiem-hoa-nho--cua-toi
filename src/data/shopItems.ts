import { getPotById } from './pots';
import { getFlowerSeedById } from './flowerSeeds';
import { validateShopItem, type ShopItem } from '../models/ShopItem';

/** CHỈNH GIÁ BÁN TẠI ĐÂY. Giá này độc lập với Pot.price. */
export const SHOP_ITEMS: readonly ShopItem[] = [
  { id: 1, itemType: 'pot', itemId: 1, currency: 'coin', price: 50, requiredLevel: 1, stock: -1, available: true },
  { id: 2, itemType: 'pot', itemId: 2, currency: 'coin', price: 100, requiredLevel: 1, stock: -1, available: true },
  { id: 3, itemType: 'pot', itemId: 3, currency: 'coin', price: 250, requiredLevel: 3, stock: -1, available: true },
  { id: 4, itemType: 'pot', itemId: 4, currency: 'coin', price: 700, requiredLevel: 5, stock: -1, available: true },
  { id: 5, itemType: 'pot', itemId: 5, currency: 'diamond', price: 50, requiredLevel: 10, stock: -1, available: true },
  { id: 6, itemType: 'pot', itemId: 6, currency: 'coin', price: 2000, requiredLevel: 8, stock: -1, available: true },
  { id: 1001, itemType: 'seed', itemId: 1, currency: 'coin', price: 25, requiredLevel: 1, stock: -1, available: true },
  { id: 1002, itemType: 'seed', itemId: 2, currency: 'coin', price: 35, requiredLevel: 1, stock: -1, available: true },
  { id: 1003, itemType: 'seed', itemId: 3, currency: 'coin', price: 50, requiredLevel: 1, stock: -1, available: true },
  { id: 1004, itemType: 'seed', itemId: 4, currency: 'coin', price: 50, requiredLevel: 1, stock: -1, available: true },
  // Hạt huyền thoại có giá -1: không đưa vào shop, cấp qua event/phần thưởng.
];

for (const item of SHOP_ITEMS) {
  validateShopItem(item);
  if (item.itemType === 'pot' && !getPotById(item.itemId)) throw new Error(`Chậu ${item.itemId} chưa khai báo`);
  if (item.itemType === 'seed' && !getFlowerSeedById(item.itemId)) throw new Error(`Hạt ${item.itemId} chưa khai báo`);
}

export const SHOP_ITEMS_BY_ID: ReadonlyMap<number, ShopItem> = new Map(SHOP_ITEMS.map((item) => [item.id, item]));
export function getShopItem(id: number): ShopItem | undefined { return SHOP_ITEMS_BY_ID.get(id); }
