# Kế hoạch cấp người chơi và catalog hoa

## Audit game hiện tại

- `EventBus` phát `GameEvent { type, at, payload }`; `ProgressService` nghe wildcard để cập nhật quest và Hạng hoa hồng. `Reward` hiện hỗ trợ modifier, item, loot table, unlock và currency. Loot table là danh sách `itemId/weight`; shop là `ShopEntry` trỏ đến seed, chậu, nâng cấp hoặc nhà kính.
- `PlantFamilyDef` và `PlantVariantDef` đang được khai báo tĩnh trong `src/data/plants/rose.ts`. `PlantService`, inventory matching, shop, scene, asset lookup và debug import trực tiếp registry hoa hồng. Cần một registry catalog runtime thuần TypeScript để family/variant/seed/shop/asset lookup cùng đọc một nguồn; rose vẫn là built-in bất biến về balance.
- EXP sẽ dùng `LevelService` chỉ nghe event, độc lập với Điểm/Hạng hoa hồng. `Reward` thêm loại `exp`. Level suy ra từ bảng `src/data/levels.ts`; unlock family được lưu để grandfathering.

## Các chỗ đang gắn với rose

- Balance và ảnh: `data/plants/rose.ts`, `data/seeds.ts`, `data/assetPaths.ts`.
- Shop/plant/inventory/render/UI: `PlantService`, `SellService`, `InventoryService`, `FarmToolsScene`, `GreenhouseScene`, `PackingScene`, `InventorySheet`, `PotView`, `TextureProvider`, `DebugPanel`.
- Nội dung riêng rose: `tracks/roseTrack.ts`, quest/Hạng hoa hồng, bouquets, order templates, loot gifts và nhiều regression test.

Một species mới không cần bouquet, quest hoặc rank track. Nó chỉ cần family, đúng một base variant, seed được sinh từ family, rarity hợp lệ và các ảnh tùy chọn. Registry phải cho phép danh sách bouquet/quest/track không có mục tương ứng mà không tạo UI rỗng hoặc lỗi; placeholder xử lý ảnh thiếu.

## Backend

Repository chưa có backend; game hiện là Vite client và `localStorage`. Chọn Node 20+ + TypeScript + Fastify, `@fastify/multipart`, `@fastify/cookie`, `@fastify/rate-limit`, `@fastify/static`, SQLite qua `better-sqlite3`, và `image-size` để đọc kích thước mà không dùng thư viện xử lý ảnh native như Sharp. Server chỉ sở hữu catalog/ảnh; save người chơi vẫn ở client.

## Dev, build và production

- `npm run dev`: `concurrently` chạy Vite và Fastify; Vite proxy `/api` và `/uploads`.
- `npm run server`: server dev qua `tsx`.
- `npm run build`: typecheck game/admin, Vite multi-page build (`index.html`, `admin.html`) và compile server vào `dist-server`.
- `npm start`: Node chạy server build, phục vụ `dist`, `/admin`, API và uploads.
- `db:migrate`, `db:seed`, `catalog:export`, `catalog:import`: CLI dùng cùng database layer và `DATA_DIR`/`UPLOAD_DIR`.

Admin là Vite entry riêng, vanilla TypeScript và chuỗi tiếng Việt trong `src/admin/strings.ts`. Migrations SQL được đánh số; tests dùng database/upload temp và không ghi ảnh vào repository.
