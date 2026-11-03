# Audit avatar khách hàng

## Tệp ảnh thực tế

Đọc trực tiếp header PNG/GIF, không sửa tệp. Tất cả là chân dung đầu-vai hoặc bán thân, bố cục dọc; khuôn mặt nằm ở nửa trên và gần trục giữa.

| Tệp | Kích thước | Dung lượng | Nền/header |
|---|---:|---:|---|
| `anh-khoa.png` | 224×231 | 25.796 B | đục |
| `anh-nam.png` | 176×236 | 62.414 B | alpha |
| `anh-quan.png` | 224×229 | 24.662 B | đục |
| `anh-tuan.png` | 224×241 | 26.175 B | đục |
| `ba-huong.png` | 180×239 | 75.515 B | alpha |
| `ba-lien.png` | 186×231 | 27.210 B | đục |
| `ba-oanh.png` | 186×241 | 32.043 B | đục |
| `ba-tam.gif` | 186×229 | 27.888 B | GIF |
| `ba-tam.png` | 205×241 | 82.750 B | alpha |
| `be-an.png` | 150×201 | 50.645 B | alpha |
| `be-bao.png` | 181×231 | 20.610 B | đục |
| `be-mi.png` | 181×241 | 26.332 B | đục |
| `chi-hanh.png` | 214×241 | 26.160 B | đục |
| `chi-ly.png` | 214×229 | 28.618 B | đục |
| `chi-mai.png` | 150×200 | 47.892 B | alpha |
| `chi-uyen.png` | 214×231 | 33.033 B | đục |
| `chu-binh.png` | 230×231 | 28.717 B | đục |
| `chu-lam.png` | 230×241 | 30.214 B | đục |
| `chu-minh.png` | 180×241 | 75.930 B | alpha |
| `chu-phuc.png` | 230×229 | 33.462 B | đục |
| `co-ha.png` | 196×229 | 28.174 B | đục |
| `co-lan.png` | 179×239 | 71.053 B | alpha |
| `co-van.png` | 196×231 | 28.963 B | đục |
| `co-yen.png` | 205×229 | 28.776 B | đục |
| `di-ngoc.png` | 205×231 | 27.473 B | đục |
| `di-thao.png` | 150×200 | 59.056 B | alpha |
| `di-tram.png` | 196×241 | 29.677 B | đục |
| `thay-dung.png` | 158×210 | 57.137 B | alpha |
| `thay-long.png` | 236×241 | 26.310 B | đục |
| `thay-son.png` | 236×231 | 28.496 B | đục |

Ảnh không đồng kích thước và tỷ lệ nằm khoảng 0,75–1,02. Một số ảnh có phần hình thừa hoặc sọc ở sát mép (`be-an`, `chi-ly`, `chi-mai`, `chu-lam`, `chu-phuc`, `co-van`, `di-thao`, `thay-long`). Vì vậy UI dùng **cover**, focus mặc định `(0.5, 0.25)` và mask bo tròn; cách này giữ mặt rõ, không kéo giãn và cắt phần thừa ở mép. Chân dung lớn tại quầy cũng dùng cover vì contain sẽ lộ các mép thừa này.

## `ba-tam.gif`

- Canvas: 186×229, dung lượng 27.888 B.
- Parser tìm thấy **1 frame**, delay 100 ms, không có extension lặp `NETSCAPE`; do đó tệp hiện tại thực tế là ảnh tĩnh dù có đuôi GIF.
- Bộ nhớ RGBA giải mã ước tính: `186 × 229 × 4 × 1 = 170.376 B` (khoảng 166,4 KiB), chưa tính overhead texture/canvas.
- PixiJS 8.22.0 có `pixi.js/gif`; game vẫn dùng `GifSprite` đúng pipeline tại chân dung lớn của Bà Tám và PNG ở mọi nơi khác. Với file hiện tại sẽ không thấy chuyển động. Không cần tối ưu dung lượng; nếu muốn chuyển động, chủ sở hữu cần thay bằng GIF nhiều frame sau này.

## Hệ thống trước khi đổi

- `src/data/customers.ts` biến 12 archetype thành 12 customer ID, lấy tên theo vị trí từ một name pool dài hơn; avatar tra theo convention `customers/portraits/<archetype>.png`, mood và `by_id`.
- `CustomerState` chỉ lưu `customerId`, Favor, mốc order/cooldown và bộ đếm. `OrderInstance` lưu `customerId`.
- `OrderService` chọn trực tiếp từ `CUSTOMERS`; không có hệ thống spawn customer riêng. Vì vậy roster mới được khởi tạo một lần, duy nhất theo ID, và order tiếp tục dùng cùng thuật toán/template/cooldown cũ.
- `CounterScene` có một sprite vuông 184 và card order chưa có avatar. `Toast` và `Modal` chỉ có text/coin. Không có Favor/customer sheet riêng.
- `TextureProvider` dùng chuỗi fallback archetype → mood → by-id → placeholder. Asset loader hiện tải toàn bộ manifest lúc khởi động.

## Quyết định triển khai

- Roster 29 người và mapping avatar nằm duy nhất trong `src/data/customers.ts`; archetype chỉ còn quyết định template/order và gift như cũ.
- Ảnh tĩnh được đăng ký trong manifest nhưng tải lười khi customer sắp hiển thị. GIF chỉ tải khi Bà Tám đang focus, animation được điều khiển bằng private ticker của app và dừng khi tab ẩn.
- Component `CustomerAvatar` dùng lại ở chân dung focus, order card, toast và gift modal; kích thước/focus/radius nằm trong data config.
- Save migration chuẩn hóa tên có bỏ dấu; legacy còn lại được ghép ổn định vào roster chưa dùng, order mở được cập nhật theo map. Customer dư quá 29 được giữ nguyên và dùng placeholder.
