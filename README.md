# Tiệm Hoa Nhỏ Của Tôi

Game trồng, gói và bán hoa viết bằng PixiJS 8 + TypeScript + Vite. Giao diện ưu tiên điện thoại dọc, dùng chiều rộng logic 720 và vẫn chạy bằng placeholder vẽ bằng code khi chưa có tranh.

## Chạy game

```bash
npm install
npm run dev
npm test
npm run build
npm run check-assets
```

`npm run dev` chạy đồng thời game ở Vite và server catalog ở cổng `3000`. Vite tự chuyển tiếp `/api` và `/uploads` sang server. Có thể chỉ chạy backend bằng `npm run server`.

## Cấp người chơi

Người chơi nhận EXP khi thu hoạch, bán cành và bán bó hoa. Cấp được suy ra từ tổng EXP, tối đa cấp 30; EXP vẫn tiếp tục tích sau cấp tối đa. Bảng cấp và EXP nguồn nằm trong `src/data/levels.ts`, EXP bó hoa nằm trong `src/data/bouquets.ts`. Loài đã mở khóa được lưu trong save nên không bị khóa lại nếu cấp yêu cầu trên server thay đổi.

## Trang quản trị và catalog SQLite

1. Sao chép `.env.example` thành `.env` hoặc đặt các biến môi trường tương đương. Luôn dùng `ADMIN_TOKEN` dài, ngẫu nhiên khi triển khai.
2. Chạy `npm run dev`, mở `http://localhost:5173/admin.html` (production dùng `/admin`) và nhập token.
3. Chọn **Thêm loài hoa**, khai báo một biến thể gốc, lưu, rồi tải ảnh PNG/WebP vào các vị trí. Loài mới mặc định mở ở cấp 2.
4. Game tải lại catalog khi khởi động và khi trở lại tab nếu cache đã quá 10 phút. Khi server tắt, game dùng cache gần nhất rồi catalog hoa hồng tích hợp.

Các lệnh dữ liệu:

```bash
npm run db:migrate
npm run db:seed
npm run catalog:export -- catalog-backup.json
npm run catalog:import -- catalog-backup.json
```

Sao lưu đầy đủ cần cả `data/catalog.sqlite` và thư mục `uploads/`. File JSON export chỉ chứa catalog và danh sách đường dẫn, không chứa byte ảnh. Production dùng `npm run build` rồi `npm start`; server phục vụ game, `/admin`, API và ảnh upload.

Admin phiên bản đầu chỉ quản lý loài, biến thể và ảnh; không quản lý bó hoa, nhiệm vụ hay hạng hoa hồng. Tính năng này cần máy chủ Node và SQLite; host tĩnh như GitHub Pages không chạy được admin/upload, nhưng game vẫn mở bằng catalog tích hợp.

Mở trên điện thoại cùng mạng bằng `npm run dev -- --host`, sau đó truy cập địa chỉ LAN do Vite in ra. Nhấn phím ``` ``` trên desktop hoặc chạm 5 lần vào bộ đếm xu để mở bảng thử nghiệm.

`npm run check-assets` chỉ đọc manifest và filesystem. Lệnh in ảnh hiện có/đang thiếu theo nhóm, phân biệt bắt buộc/tùy chọn và liệt kê mọi tệp trong `public/assets` chưa được dữ liệu tham chiếu.

## Ảnh hiện đã dùng

Mọi đường dẫn được khai báo trong `src/data/assetPaths.ts` và dữ liệu tương ứng; scene/UI không chứa tên tệp. Texture dùng `linear` scale mode từ `src/data/assetConfig.ts`.

### Chậu

| ID | Tệp | Trạng thái |
|---|---|---|
| `pot_common` | `pots/chau-thuong.png` | Có |
| `pot_terracotta` | `pots/chau-dat-nung.png` | Có |
| `pot_granite` | `pots/chau-hoa-cuong.png` | Có |
| `pot_marble` | `pots/chau-cam-thach.png` | Có |
| `pot_diamond` | `pots/chau-kim-cuong.png` | Có |
| `pot_gold` | `pots/chau-vang.png` | Thiếu, dùng placeholder |

Ảnh chậu được neo giữa–dưới và giữ nguyên tỉ lệ trong nhà kính, kho và cửa hàng. `displayScale` cùng `plantOffset` nằm trong từng `PotDef`.

Khi thêm chậu vàng, đổi đúng một trường của `pot_gold` trong `src/data/pots.ts`:

```ts
image:'pots/chau-vang.png'
```

### Hoa hồng — năm giai đoạn 0–4

Ngưỡng mặc định là `[0, 0.20, 0.45, 0.75, 1.0]`. Giai đoạn 4 chỉ xuất hiện khi cây đã sẵn sàng thu hoạch. Giống được gieo từ đầu nhưng chỉ lộ từ giai đoạn 2.

| Giai đoạn | Ý nghĩa | Ảnh |
|---:|---|---|
| 0 | Mới trồng | `rose/step-0.png`, dùng chung |
| 1 | Mầm non | `rose/step-1.png`, dùng chung |
| 2 | Đang lớn | Ảnh riêng của giống |
| 3 | Đang kết nụ | Ảnh riêng của giống |
| 4 | Nở rộ / sẵn sàng | Ảnh riêng; thiếu thì dùng im lặng ảnh riêng gần nhất thấp hơn |

| Variant | Giai đoạn 2 | Giai đoạn 3 | Giai đoạn 4 |
|---|---|---|---|
| `rose.red_naomi` | `rose-common-2.png` | `rose-common-3.png` | `rose-common-4.png` |
| `rose.black_baccara` | `velvet-rose-2.png` | `velvet-rose-3.png` | `velvet-rose-4.png` |
| `rose.monica` | `monica.png` | `monica-3.png` | `monica-4.png` |
| `rose.bajou` | `bajou-2.png` | `bajou-3.png` | Thiếu; dùng giai đoạn 3 |
| `rose.eckart` | `eckart-2.png` | `eckart-3.png` | Thiếu; dùng giai đoạn 3 |
| `rose.masora` | `masora-2.png` | `masora-3.png` | Thiếu; dùng giai đoạn 3 |

`monica.png` được ánh xạ rõ ràng là giai đoạn 2. Muốn thêm `bajou-4.png`, thêm đúng mục sau vào `images.stages` của Bajou trong `src/data/plants/rose.ts`:

```ts
4:stage('bajou-4.png')
```

Tên tệp không được suy đoán theo convention. Icon cành hoa tạm dùng ảnh cây ở giai đoạn cao nhất vì `assetConfig.useBloomAsStemIcon = true`; thiếu ảnh `items/flowers/*` không tạo cảnh báo trong chế độ này.

### UI

| Tệp | Nơi dùng |
|---|---|
| `ui/coin.png` | HUD, giá cửa hàng, thưởng đơn và giá bó hoa |
| `ui/binh-tuoi.png` | Nút tưới, dấu cây cần nước, fallback bình tưới nâng cấp |
| `ui/cai-dat.png` | Nút Cài đặt trên HUD |
| `ui/nhiem-vu.png` | Nút Nhiệm vụ và đầu sheet nhiệm vụ |

Bình tưới đồng/bạc/vàng/kim cương dùng cùng `binh-tuoi.png` với tint đồng, bạc, vàng, cyan cho đến khi có ảnh riêng trong `items/watering_cans/`.

## Ảnh tiếp theo cần vẽ

- `pots/chau-vang.png`.
- Giai đoạn 4 của Bajou, Eckart và Masora.
- Hạt giống, bó hoa, cành hoa riêng, chân dung NPC, phông nền.
- Phần lớn panel, frame, tab và icon UI còn lại.

Phông nền khu vực nên là 720×1600; giữ nội dung quan trọng trong vùng trung tâm 720×1280. Chân dung khách vẫn là 256×256. Danh sách đầy đủ và trạng thái hiện thời luôn có trong kết quả `npm run check-assets`.

## Cấu hình bố cục và dữ liệu

- Số đo UI: `src/data/layout.ts`.
- Màu và chữ: `src/data/theme.ts`.
- Căn lưới nhà kính 5×4: `GreenhouseDef.slotLayout` trong `src/data/greenhouses.ts`.
- Ánh xạ ảnh và tỉ lệ: `src/data/pots.ts`, `src/data/plants/rose.ts`, `src/data/assetConfig.ts`.

Game giữ nguyên ID trong save và không đổi `saveVersion`.
