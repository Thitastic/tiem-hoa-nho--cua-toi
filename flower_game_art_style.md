# Flower Garden Game — Art Style Guide

> Tài liệu quy chuẩn hình ảnh cho game trồng hoa (PixiJS). Dùng làm hướng dẫn khi tạo icon, vật phẩm, nhân vật, cây trồng và asset giao diện mới.

## 1. Định hướng tổng thể

- **Phong cách:** casual mobile farming game, **3D hoạt hình cách điệu (stylized 3D / soft toy-like 3D)**.
- **Cảm giác:** vui tươi, ấm áp, dễ thương, thân thiện, nhiều màu sắc; phù hợp game trồng hoa.
- **Hình khối:** bo tròn, đầy đặn, mềm mại, ít góc nhọn; hình dạng dễ đọc ngay cả khi thu nhỏ.
- **Bề mặt:** nhẵn, hơi bóng với phản sáng mềm để thể hiện độ nổi khối; không dùng chất liệu kim loại phản chiếu quá thật.
- **Mức chi tiết:** vừa phải; hình rõ ở 64–128 px. Ưu tiên nhận diện vật thể hơn họa tiết li ti.
- **Đường viền:** viền nâu đậm hoặc viền màu đậm cùng tông, vừa đủ rõ trên nền sáng và tối.

## 2. Màu sắc

Sử dụng màu **tươi, rực rỡ và có độ tương phản tốt**, nhưng không quá chói hoặc neon.

| Vai trò | Màu tham khảo | Mã HEX gợi ý |
|---|---|---|
| Xanh cây, vật phẩm thường | Xanh lá tươi | `#7CCB36` |
| Xanh ngọc, nút chức năng | Teal / turquoise | `#1FC6AD` |
| Vàng, vật phẩm cấp cao | Vàng mật ong | `#FFBF2F` |
| Bạc, vật phẩm nâng cấp | Bạc lạnh xanh tím | `#C6CBDD` |
| Xanh hiếm (Rare) | Xanh lam sáng | `#2E96EA` |
| Tím sử thi (Epic) | Tím hoa | `#A04BDA` |
| Đỏ, tim, thông báo | Hồng đỏ san hô | `#F04462` |
| Nâu gỗ và viền | Nâu ấm | `#573326` |
| Giấy, nhãn hạt giống | Kem sáng | `#FFF0CF` |

Màu HEX chỉ là định hướng; có thể thêm vùng tối và vùng sáng quanh màu chính.

## 3. Ánh sáng và đổ bóng

- Ánh sáng studio mềm, thường từ **trên trái**.
- Dùng 2–4 cấp độ sáng/tối để tạo cảm giác 3D.
- Có bóng tiếp xúc nhỏ ở phần ghép nối; không cần đổ bóng dài trên mặt đất.
- Highlight là vùng phản sáng mềm **trên chính vật thể**, không phải sao sáng bay quanh.
- Tuyệt đối tránh **glitter, sparkle, glow, particle, lens flare, tia sáng phép thuật**.

## 4. Quy chuẩn asset

### Icon UI / vật phẩm

- Khung asset **vuông 1:1**, vật thể nằm giữa, không bị cắt cạnh.
- Xuất **PNG nền trong suốt thật (alpha)**; không vẽ nền đen, nền caro hay nền chuyển màu.
- Chừa khoảng trống đều quanh vật thể khoảng 8–12% kích thước ô.
- Góc nhìn chính diện hoặc 3/4 nhẹ; đồng nhất góc nhìn cho vật phẩm cùng nhóm.
- Không kèm chữ, số, watermark hoặc khung nút nếu không được yêu cầu.
- Các biến thể cùng bộ nên giữ **cùng silhouette và tỷ lệ** để so sánh cấp độ rõ ràng.

### Gói hạt giống

- Gói giấy kraft đứng, mép gấp mềm, phần thân nâu nhạt.
- `Common`: viền xanh lá; `Rare`: viền xanh dương; `Epic`: viền tím; `Legend`: viền vàng.
- **Vùng nhãn giữa gói phải thật sự trống, màu kem sáng**, đủ rộng để chồng tên và hình hoa bằng PixiJS.
- Không đặt hoa văn, chữ, biểu tượng ở bên trong vùng nhãn.

### Nhân vật ong

- Thân tròn, đầu hơi lớn, mắt biểu cảm, má hồng, cánh xanh nhạt trong mờ.
- Phân biệt vai trò bằng tỷ lệ, phụ kiện và dáng đứng: bé ong nhỏ nhắn; chị ong có hoa; anh ong thân lớn, áo làm vườn.
- Nhất quán màu vàng mật ong, sọc nâu đậm, biểu cảm thân thiện.

### Hoa và cây trồng

- Từng giống hoa giữ đúng đặc điểm hình cánh, hình cụm hoa và màu chủ đạo.
- Nếu làm 4 giai đoạn phát triển (0–3), bảo đảm **cùng góc nhìn, cùng điểm neo gốc cây**, chiều cao tăng dần.
- Màu lá xanh tươi, thể tích rõ, tránh tạo quá nhiều gân lá li ti.
- Với sprite trồng trên ô đất, không tự thêm chậu trừ khi yêu cầu có chậu.

## 5. Bố cục sprite sheet

- Các asset phải nằm trong ô riêng, **không chồng lấn sang ô kế bên**.
- Khi xuất sprite sheet, ưu tiên bố cục lưới đều (ví dụ 4 cột × 2 hàng).
- Mỗi icon giữ kích thước thị giác gần tương đương; tránh một icon quá nhỏ so với icon khác.
- Không in nhãn tên trên sprite sheet. Tên file và metadata được quản lý riêng trong code.
- Tốt nhất là xuất từng ảnh PNG riêng; nếu xuất sprite sheet, cần kiểm tra lại kích thước ô trước khi cắt.

## 6. Prompt mẫu (English)

```text
Create a production-ready [ASSET NAME] for a colorful cozy flower farming mobile game.
Art direction: premium stylized soft 3D cartoon game asset, rounded toy-like sculpted shapes,
vivid saturated but tasteful colors, soft upper-left studio lighting, smooth cel-shaded depth,
subtle ambient occlusion, warm clean outlines, simple readable silhouette at 64px.
Composition: one centered isolated object, square 1:1 framing, 10% clear padding,
front or slight three-quarter perspective, consistent proportions with the existing set.
Background: truly transparent alpha PNG.
Avoid: text, letters, numbers, watermark, buttons or frames unless specifically requested,
glitter, sparkles, glowing particles, lens flares, photorealism, complex backgrounds.
```

### Prompt cho gói hạt giống

```text
Create four matching flower seed packets for a cozy mobile farming game,
in the established colorful stylized 3D cartoon asset style.
Identical packet proportions and large completely blank pale-cream front label panels.
Common has green trim, Rare blue trim, Epic purple trim, Legend golden-yellow trim.
No text, no flower image inside labels, no glitter, genuine transparent PNG background.
```

### Prompt cho nhiều icon

```text
Create an isolated sprite sheet of [N] mobile flower farming game UI icons,
arranged on an exact [COLUMNS] by [ROWS] grid with equal square cells.
Each item should be visually centered and entirely contained within its own cell.
Use consistent premium soft stylized 3D cartoon rendering, vivid colors,
warm outlines, soft form shading, genuine transparent background.
No text, no watermark, no glitter, no overlap between cells.
Icons: [LIST OF ICONS].
```

## 7. Checklist kiểm tra trước khi đưa vào PixiJS

- [ ] Nhìn rõ khi thu nhỏ xuống 64×64 px.
- [ ] Đúng chủ thể, đúng cấp độ, đúng màu phân loại.
- [ ] Không có chi tiết lấp lánh/hiệu ứng phát sáng không cần thiết.
- [ ] PNG thực sự có alpha, không lẫn nền màu.
- [ ] Có lề trong suốt, không bị cắt mép.
- [ ] Nhất quán kích thước, hướng nhìn và ánh sáng với asset cùng nhóm.
- [ ] Nếu là gói hạt giống, nhãn trung tâm sạch để chèn nội dung động.
- [ ] Nếu là sprite sheet, từng asset có thể cắt sạch thành icon 1:1.

> **Quy tắc ngắn gọn:** “3D hoạt hình mềm + màu hoa rực rỡ + hình bo tròn + dễ đọc ở kích thước nhỏ + không lấp lánh + nền trong suốt.”
