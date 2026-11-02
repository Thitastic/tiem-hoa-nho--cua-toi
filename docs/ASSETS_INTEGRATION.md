# Tích hợp tài nguyên hình ảnh

## Tệp đã kiểm tra

| Nhóm | Tệp | Kích thước | Dung lượng |
|---|---|---:|---:|
| Chậu | `pots/chau-thuong.png` | 200×200 | 51,802 B |
| Chậu | `pots/chau-dat-nung.png` | 200×200 | 58,802 B |
| Chậu | `pots/chau-hoa-cuong.png` | 200×200 | 78,641 B |
| Chậu | `pots/chau-cam-thach.png` | 200×200 | 59,080 B |
| Chậu | `pots/chau-kim-cuong.png` | 200×200 | 67,305 B |
| Hồng | `rose/step-0.png` | 255×255 | 62,600 B |
| Hồng | `rose/step-1.png` | 395×456 | 276,243 B |
| Hồng | `rose/rose-common-2.png` | 433×540 | 359,645 B |
| Hồng | `rose/rose-common-3.png` | 477×574 | 444,248 B |
| Hồng | `rose/rose-common-4.png` | 150×150 | 40,371 B |
| Hồng | `rose/velvet-rose-2.png` | 442×568 | 438,988 B |
| Hồng | `rose/velvet-rose-3.png` | 520×596 | 534,425 B |
| Hồng | `rose/velvet-rose-4.png` | 150×150 | 39,899 B |
| Hồng | `rose/monica.png` | 439×567 | 350,433 B |
| Hồng | `rose/monica-3.png` | 517×626 | 509,849 B |
| Hồng | `rose/monica-4.png` | 150×150 | 43,767 B |
| Hồng | `rose/bajou-2.png` | 446×587 | 400,891 B |
| Hồng | `rose/bajou-3.png` | 517×629 | 518,459 B |
| Hồng | `rose/eckart-2.png` | 448×587 | 418,670 B |
| Hồng | `rose/eckart-3.png` | 580×647 | 617,668 B |
| Hồng | `rose/masora-2.png` | 460×590 | 416,243 B |
| Hồng | `rose/masora-3.png` | 541×629 | 591,059 B |
| UI | `ui/coin.png` | 150×150 | 43,592 B |
| UI | `ui/binh-tuoi.png` | 150×150 | 35,537 B |
| UI | `ui/cai-dat.png` | 150×150 | 46,928 B |
| UI | `ui/nhiem-vu.png` | 150×150 | 42,613 B |

## Quyết định hiển thị

- Ảnh dùng nét vẽ mượt, vì vậy toàn bộ texture dùng `linear` scale mode.
- Ảnh cây không chứa chậu; điểm gốc là giữa cạnh dưới. Phần đất ở đáy ảnh được đặt lên giữa miệng chậu. Chậu cũng neo giữa cạnh dưới; miệng chậu nằm khoảng 20–30% chiều cao ảnh tính từ trên xuống.
- Năm ảnh chậu cùng kích thước 200×200 và dùng chung cơ sở tỉ lệ. Ảnh cây dùng cơ sở chiều cao nguồn 647 px; các ảnh nhỏ ở giai đoạn 0, 1 và ảnh nở 150×150 giữ đúng tỉ lệ tự nhiên, với hệ số theo giai đoạn khai báo trong dữ liệu khi cần.
- `monica.png` được ánh xạ rõ ràng thành giai đoạn 2. Giai đoạn 4 còn thiếu của Bajou, Eckart và Masora dùng im lặng ảnh giai đoạn 3.
- Tổng bộ 26 texture chiếm khoảng **15.58 MiB** khi giải nén RGBA trên GPU. Ảnh lớn nhất là 580×647; không có ảnh vượt 1024 px và hiện chưa cần tối ưu kích thước nguồn.
- Icon thân hoa tạm dùng ảnh cây ở giai đoạn cao nhất; icon bình tưới riêng dùng ảnh chung và tint theo cấp.
