# Kiểm tra thời gian trong game

## Kết luận trước khi sửa

Game hoàn toàn chạy ở trình duyệt. Repository không có Node/Express/API/WebSocket/cron, không có backend lưu save hay tiến trình tăng trưởng, và không có server tick cây. Vite chỉ phục vụ file khi phát triển/build; save nằm trong `localStorage`.

Nguồn “now” cũ:

- `src/core/GameClock.ts`: đọc `Date.now()` ở constructor và mỗi lần `now()`, rồi tích lũy chênh lệch vào clock ảo có multiplier.
- `src/Game.ts`: mọi service dùng `GameClock`; ticker gọi `game.tick()` để hết hạn đơn và autosave.
- `src/ui/Toast.ts`, `src/ui/Hud.ts`: dùng `Date.now()` cho hiệu ứng UI/thao tác mở debug, không phải luật game.
- `src/objects/PotView.ts`, `src/ui/ScrollList.ts`: dùng `performance.now()` cho animation/kéo cuộn.
- `src/layout/LayoutManager.ts`: dùng `requestAnimationFrame()` để gộp layout; Pixi ticker cập nhật scene/HUD/UI mỗi frame.
- `src/main.ts`: một `setTimeout()` chỉ để reload sau khi xóa save. Không có `setInterval()`.

Growth không có mẫu `progress += deltaTime`: `PlantService.status()` đã lấy chênh lệch giữa `GameClock.now()` và `lastWateredAt`; `progressSec` chỉ được chốt khi tưới. Tuy nhiên `GameClock` cũ tích lũy clock ảo từ tick/lần gọi, và `multiplier`, `virtualNow`, `realAnchor` chỉ nằm trong RAM. Sau reload, clock ảo quay về clock thiết bị. Nếu debug speed đã đẩy timestamp cây vào tương lai, cây có thể trông như ngừng lớn cho đến khi clock thật bắt kịp. Đây là phụ thuộc vòng đời tiến trình ở nguồn thời gian, không phải server growth.

Các mốc `plantedAt`, `lastWateredAt`, `createdAt`, `expiresAt`, `lastOrderAt`, `cooldownUntil`, `savedAt` cũ bắt đầu từ epoch millisecond của `Date.now()`, nhưng sau khi bật multiplier chúng trở thành game-clock time và có thể nằm trong tương lai. `progressSec` là duration. Watering và cooldown/order timestamp đã được save; phần chỉ nằm trong RAM là clock ảo, multiplier, mốc autosave, timer Toast/scroll và trạng thái UI. Không có lịch sinh đơn kế tiếp trong model; khi khởi động, game chỉ lấp tối đa số đơn đang mở như luật cũ.

Migration v1 giữ nguyên timestamp nếu timeline không nằm trong tương lai. Nếu `savedAt` v1 lớn hơn UTC hiện tại, migration dịch đồng loạt mọi timestamp về cùng anchor hiện tại để giữ stage, thời hạn đơn và cooldown tương đối. V1 không lưu real anchor/multiplier, nên không thể suy ra chính xác khoảng offline thật của một save đã dùng debug speed; từ v2, debug dùng offset riêng và `lastSeenUtc` được lưu đầy đủ.

## Origin của `localStorage`

Save thuộc đúng bộ `protocol + host + port`. Vì vậy `localhost:5173`, `192.168.x.x:5173` và một port khác là ba kho save khác nhau; đổi URL có thể làm game trông như mất cây hoặc không có offline progress. Một origin không thể đọc `localStorage` của origin kia, nên không thể tự tìm save bị tách. Save v2 ghi `originAtSave`; nếu một save được chuyển/import và origin hiện tại khác, Toast và DebugPanel hiển thị cảnh báo rõ ràng.

## Sau khi sửa

`UtcClock` là nơi duy nhất đọc clock hệ thống cho luật game. Model v2 lưu epoch UTC integer cùng `lastSeenUtc`, dùng monotonic guard, và growth/order/cooldown đều được suy ra trực tiếp từ timestamp khi load hoặc khi tab hiện lại. Pixi ticker chỉ yêu cầu refresh/reconcile và autosave; nó không cộng tiến trình. `performance.now()` còn lại chỉ phục vụ animation/UI, không được lưu và không ảnh hưởng luật game.
