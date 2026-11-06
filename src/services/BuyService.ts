import { getShopItem } from '../data/shopItems';
import type { ShopItem } from '../models/ShopItem';
import { gameStore } from './GameSession';
import type { GameStore } from './GameStore';

export type BuyResult =
  | { ok: true; item: ShopItem; quantity: number; totalPrice: number }
  | { ok: false; reason: string };

/** Xử lý mua hàng tập trung: kiểm tra, trừ tiền, nhập kho và lưu một lần. */
export class BuyService {
  constructor(private readonly store: GameStore = gameStore) {}

  buy(shopItemId: number, quantity = 1): BuyResult {
    const item = getShopItem(shopItemId);
    if (!item || !item.available) return { ok: false, reason: 'Vật phẩm không được bán' };
    if (!Number.isSafeInteger(quantity) || quantity <= 0) {
      return { ok: false, reason: 'Số lượng mua không hợp lệ' };
    }

    const player = this.store.player;
    if (player.level < item.requiredLevel) {
      return { ok: false, reason: `Cần đạt cấp ${item.requiredLevel}` };
    }

    const purchased = this.store.state.purchasedCounts[String(shopItemId)] ?? 0;
    if (item.stock !== -1 && (quantity > item.stock || purchased > item.stock - quantity)) {
      return { ok: false, reason: 'Vật phẩm đã hết lượt mua' };
    }

    const totalPrice = item.price * quantity;
    if (!Number.isSafeInteger(totalPrice)) return { ok: false, reason: 'Giá mua vượt giới hạn' };
    if (player[item.currency] < totalPrice) {
      return { ok: false, reason: `Không đủ ${item.currency === 'coin' ? 'xu' : 'kim cương'}` };
    }

    if (!Number.isSafeInteger(purchased + quantity)) return { ok: false, reason: 'Vượt giới hạn lượt mua' };
    if (!Number.isSafeInteger(this.store.inventory.get(item.itemType, item.itemId) + quantity)) {
      return { ok: false, reason: 'Kho vượt giới hạn số lượng' };
    }

    let charged = false;
    let addedToInventory = false;
    try {
      // Mọi kiểm tra đã hoàn thành trước khi thay đổi dữ liệu.
      if (item.currency === 'coin') player.addCoin(-totalPrice);
      else player.addDiamond(-totalPrice);
      charged = true;
      this.store.inventory.add(item.itemType, item.itemId, quantity);
      addedToInventory = true;
      this.store.state.purchasedCounts[String(shopItemId)] = purchased + quantity;

      if (!this.store.save()) throw new Error('Không lưu được giao dịch');
      return { ok: true, item, quantity, totalPrice };
    } catch (error) {
      // Hoàn tác dữ liệu trong RAM nếu lưu hoặc cập nhật kho thất bại.
      if (charged && item.currency === 'coin') player.coin += totalPrice;
      else if (charged) player.diamond += totalPrice;
      if (addedToInventory) {
        this.store.inventory.remove(item.itemType, item.itemId, quantity);
      }
      if (purchased === 0) delete this.store.state.purchasedCounts[String(shopItemId)];
      else this.store.state.purchasedCounts[String(shopItemId)] = purchased;
      this.store.notifyChange();
      return { ok: false, reason: error instanceof Error ? error.message : 'Mua hàng thất bại' };
    }
  }
}

export const buyService = new BuyService();
