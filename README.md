# Tiệm Hoa Nhỏ Của Tôi

Game trồng, gói và bán hoa viết bằng PixiJS 8 + TypeScript + Vite. Game chạy được khi chưa có bất kỳ ảnh nào: mọi ảnh thiếu được thay bằng placeholder vẽ bằng `Graphics` + `Text`, và mỗi đường dẫn thiếu chỉ cảnh báo một lần trong console.

> Repo này không chứa và không tự tạo, tải hay sinh bất kỳ tệp ảnh nào. Bạn tự thêm ảnh vào `public/assets/` khi sẵn sàng.

## Chạy game và kiểm thử

```bash
npm install
npm run dev
npm test
npm run build
npm run check-assets
```

`check-assets` chỉ đọc manifest và filesystem, không tạo tệp. Lệnh trả mã lỗi khi còn ảnh bắt buộc chưa có; đây là hành vi dự kiến trong giai đoạn dùng placeholder. Nhấn phím `` ` `` trong game để mở bảng thử nghiệm.

Để thử trên điện thoại cùng mạng, chạy `npm run dev -- --host`, rồi mở địa chỉ LAN do Vite in ra. Giao diện dùng chiều rộng logic 720, tự tính chiều cao theo tỉ lệ màn hình, đọc safe-area của tai thỏ/home indicator và giữ cột game dọc ở giữa trên desktop hoặc màn hình ngang.

Các số đo giao diện nằm trong `src/data/layout.ts`, màu/chữ nằm trong `src/data/theme.ts`. Muốn căn lưới 5×4 với tranh nền nhà kính, chỉnh `GreenhouseDef.slotLayout` trong `src/data/greenhouses.ts`: `insetX`, `offsetY`, `gapX`, `gapY` và `cellAspect`; không cần sửa scene hoặc logic game.

## Danh sách ảnh cần làm

Tất cả đường dẫn dưới đây nằm trong `public/assets/`. PNG trong suốt, trừ phông nền. Kích thước là gợi ý và được khai báo trong `src/data/assetPaths.ts`.

### Cây hoa — 24 ảnh bắt buộc, 256×256

Mỗi hàng gồm bốn tệp `stage1.png`, `stage2.png`, `stage3.png`, `stage4.png`, neo giữa–dưới `(0.5, 1)`.

| Đường dẫn thư mục | Tệp | Trạng thái |
|---|---|---|
| `plants/rose/red_naomi/` | `stage1.png`, `stage2.png`, `stage3.png`, `stage4.png` | Bắt buộc |
| `plants/rose/black_baccara/` | `stage1.png`, `stage2.png`, `stage3.png`, `stage4.png` | Bắt buộc |
| `plants/rose/monica/` | `stage1.png`, `stage2.png`, `stage3.png`, `stage4.png` | Bắt buộc |
| `plants/rose/bajou/` | `stage1.png`, `stage2.png`, `stage3.png`, `stage4.png` | Bắt buộc |
| `plants/rose/masora/` | `stage1.png`, `stage2.png`, `stage3.png`, `stage4.png` | Bắt buộc |
| `plants/rose/eckart/` | `stage1.png`, `stage2.png`, `stage3.png`, `stage4.png` | Bắt buộc |
| `plants/rose/default/` | `stage1.png`, `stage2.png`, `stage3.png`, `stage4.png` | Tùy chọn; dùng khi `revealVariantFromStage > 1` |

### Chậu — 6 ảnh bắt buộc, 256×256

`pots/pot_common.png`, `pots/pot_terracotta.png`, `pots/pot_granite.png`, `pots/pot_marble.png`, `pots/pot_gold.png`, `pots/pot_diamond.png`.

### Vật phẩm

| Nhóm / kích thước | Tệp | Trạng thái |
|---|---|---|
| Cành hoa 128×128 | `items/flowers/red_naomi.png`, `black_baccara.png`, `monica.png`, `bajou.png`, `masora.png`, `eckart.png` | 6 bắt buộc |
| Hạt giống 128×128 | `items/seeds/seed_rose_1star.png`, `seed_rose_2star.png`, `seed_rose_3star.png` | 3 bắt buộc |
| Bó hoa 192×192 | `items/bouquets/burning_love.png`, `eternal_vow.png`, `lavender_dream.png`, `love_symphony.png`, `two_hearts.png`, `morning_glow.png` | 6 bắt buộc |
| Bình tưới 128×128 | `items/watering_cans/can_copper.png`, `can_silver.png`, `can_gold.png`, `can_diamond.png` | 4 bắt buộc |
| Rương 128×128 | `items/chests/chest_pot.png` | 1 bắt buộc |
| Nhà kính 128×128 | `items/greenhouses/greenhouse_2.png`, `greenhouse_3.png`, `greenhouse_4.png` | 3 bắt buộc |

Icon chậu trong kho/cửa hàng dùng lại ảnh trong `pots/`, không cần bản riêng.

### Tiền tệ — 64×64

| Tệp | Trạng thái |
|---|---|
| `currency/coin.png` | Bắt buộc |
| `currency/points_rose.png` | Bắt buộc |
| `currency/gold.png` | Tùy chọn, dự phòng khi tách tiền vàng |

### Chân dung khách — 256×256

12 ảnh bắt buộc: `customers/portraits/regular.png`, `husband_gift.png`, `tea_shop_owner.png`, `bride_to_be.png`, `proposer.png`, `student.png`, `collector.png`, `wedding_planner.png`, `teacher.png`, `cafe_owner.png`, `long_distance.png`, `designer.png`.

Mỗi archetype có thể thêm hai ảnh tùy chọn `<archetypeKey>_happy.png` và `<archetypeKey>_upset.png` (24 ảnh). Mỗi khách còn có override tùy chọn `customers/portraits/by_id/<customerId>.png` với các ID: `customer.regular`, `customer.husband_gift`, `customer.tea_shop_owner`, `customer.bride_to_be`, `customer.proposer`, `customer.student`, `customer.collector`, `customer.wedding_planner`, `customer.teacher`, `customer.cafe_owner`, `customer.long_distance`, `customer.designer`. Thứ tự tra: `by_id` → mood → ảnh gốc → placeholder.

### Phông nền — 720×1600

Giữ mọi chi tiết quan trọng trong vùng an toàn 720×1280 ở giữa (từ y=160 đến y=1440). Dải 160 px phía trên và dưới chỉ nên là phần trang trí có thể kéo dài hoặc bị cắt.

| Tệp | Trạng thái |
|---|---|
| `backgrounds/greenhouse.png` | Bắt buộc |
| `backgrounds/packing_table.png` | Bắt buộc |
| `backgrounds/farm_tools_shop.png` | Bắt buộc |
| `backgrounds/counter_shop.png` | Bắt buộc |
| `backgrounds/greenhouse_2.png`, `greenhouse_3.png`, `greenhouse_4.png` | Tùy chọn; thiếu thì dùng `greenhouse.png` |

### Giao diện

| Nhóm / kích thước | Tệp | Trạng thái |
|---|---|---|
| Ô nhà kính 256×256 | `ui/slot_empty.png`, `ui/slot_locked.png` | Bắt buộc |
| Ô kho 128×128 | `ui/inventory_slot.png`, `ui/inventory_slot_selected.png` | Bắt buộc |
| Khung hiếm 128×128 | `ui/frame_common.png`, `frame_rare.png`, `frame_epic.png`, `frame_legendary.png` | Bắt buộc |
| Panel 9-slice | `ui/panel_bg.png`, `modal_bg.png`, `order_card_bg.png`, `tooltip_bg.png` | Bắt buộc |
| Nút 9-slice | `ui/button_normal.png`, `button_hover.png`, `button_pressed.png`, `button_disabled.png` | Bắt buộc |
| Tab 9-slice | `ui/tab_normal.png`, `tab_active.png` | Bắt buộc |
| Thanh tiến độ 9-slice | `ui/progress_bg.png`, `progress_fill.png` | Bắt buộc |
| Trạng thái cây 64×64 | `ui/icon_need_water.png`, `icon_ready.png` | Bắt buộc |
| Icon chung 64×64 | `ui/icon_star_filled.png`, `icon_star_empty.png`, `icon_heart_favor.png`, `icon_timer.png`, `icon_lock.png`, `icon_close.png`, `icon_settings.png`, `icon_quest.png`, `icon_rank.png`, `icon_reject.png`, `icon_confirm.png` | Bắt buộc |
| Icon khu vực 64×64 | `ui/tab_icon_greenhouse.png`, `tab_icon_packing.png`, `tab_icon_farm_tools.png`, `tab_icon_counter.png` | Bắt buộc |
| Hiệu ứng 64×64 | `ui/fx_sparkle.png`, `fx_water_drop.png`, `fx_coin.png` | Tùy chọn |

Tổng theo yêu cầu: 24 cây hoa, 6 chậu, 6 cành hoa, 3 hạt giống, 6 bó hoa, 4 bình tưới, 1 rương, 3 icon nhà kính, 2 tiền tệ bắt buộc, 12 chân dung, 4 phông nền và khoảng 45 ảnh UI/tùy chọn. `npm run check-assets` in chính xác số có/thiếu theo từng nhóm và liệt kê riêng ảnh bắt buộc/tùy chọn.

## Mở rộng dữ liệu

- Loài hoa mới: thêm file family tương tự `src/data/plants/rose.ts`, khai báo variant, seed và progress track; đưa family vào danh sách export tổng. Manifest sẽ sinh ảnh cây/cành/hạt từ dữ liệu.
- Độ hiếm mới: thêm một dòng vào `src/data/rarities.ts`. Công thức seed 3★ so sánh `order`, nên Legendary đã sẵn sàng và tự được chọn khi variant có rarity phù hợp.
- Khách mới: thêm `CustomerDef` trong `src/data/customers.ts`, archetype key, template và quà. Tên ngẫu nhiên lấy từ pool hơn 30 tên.
- Bó hoa mới: thêm `BouquetDef` trong `src/data/bouquets.ts`; nguyên liệu dùng `match` theo variant/rarity/tag.
- Nhiệm vụ mới: thêm `QuestDef` trong `src/data/tracks/roseTrack.ts`; nhiệm vụ chỉ lọc EventBus, không cần code riêng.
- Chuyển nơi bán nâng cấp: đổi duy nhất `shopId` trong `src/data/wateringCans.ts` hoặc định nghĩa upgrade tương ứng.

## Các giá trị mặc định đã chọn

1. Một tiền `coin`, hiển thị là “xu”; mọi món vẫn giữ `currencyId`.
2. Bình tưới bán tại `farm_tools`.
3. Cây thiếu nước dừng lớn; `witherAfterSec: null`, chưa héo.
4. `revealVariantFromStage = 1`.
5. Ngưỡng giai đoạn `[0, 0.25, 0.60, 1.0]`.
6. Mutation tối đa 75%; grow time không thấp hơn 30% gốc.
7. Chậu thường giá cố định 5 xu; `priceFormula.enabled = false`.
8. Hoàn 50% khi thay chậu (cấu hình đã dành sẵn; UI thay chậu chưa mở).
9. Giá nhà kính 2/3/4 là 3.000/8.000/20.000 xu; tối đa 4, mỗi nhà 5×4.
10. Hạt 2★ giá 150 xu; công thức bó hoa biết từ đầu.
11. Rank 4 dùng loot 80% cẩm thạch / 15% vàng / 5% kim cương.
12. Favor: hoàn tất +5/+10, thất bại −3/−5, tối thiểu 0; Close tặng hạt 2★ 10%, Soulmate thêm hạt 3★ 3%.
13. Tối đa 4 đơn mở; đơn lẻ khoảng 2 giờ, bó thường 4 giờ, bó hiếm 8–24 giờ.
14. Save key `flower-game-save`, autosave 10 giây; tiến trình offline dùng timestamp tuyệt đối.
15. Khởi đầu: 100 xu, 1 nhà kính, 3 chậu thường, 3 hạt hồng 1★ và bình tưới đồng.
16. Kích thước logic rộng 720, cao linh hoạt 1080–1680; vùng UI thiết yếu 720×1280 được căn giữa. Trên desktop và màn hình ngang, game nằm trong cột dọc tối đa khoảng 480 CSS px.

Các con số trên đều nằm trong `src/data/`, không nằm rải rác trong logic gameplay.
