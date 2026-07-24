# tools/ — kiểm tra hồi quy

Thư mục này **không thuộc bản deploy**. GitHub Pages chỉ phục vụ `index.html` và `src/`,
nên `tools/` nằm trong repo mà không ảnh hưởng gì tới trang chơi.

## Vì sao cần

Dự án không có bước build và toàn bộ nội dung sinh bằng thuật toán, nên lỗi hay gặp nhất
là **xoá hoặc đổi một hàm mà cú pháp vẫn hợp lệ** — `node --check` báo sạch, và chỉ tới lúc
chạy thật trong trình duyệt mới lộ. Đã từng mất `makeJelly`, `makeArch`, `makeSpire`,
`makeWreck` đúng theo kiểu này.

Các script dưới đây bắt được đúng loại lỗi đó mà không cần WebGL.

## Cài đặt

```bash
npm install          # chỉ cài three@0.160.0 để chạy headless
```

Ba.js chỉ dùng cho tooling. Bản chơi vẫn nạp Three.js qua import map từ CDN, không có
bước build và không phụ thuộc `node_modules`.

## Chạy

```bash
npm run check        # chạy toàn bộ, đây là lệnh nên dùng trước mỗi lần commit
```

Hoặc từng phần:

| Lệnh | Bắt lỗi gì |
|---|---|
| `python3 tools/check-imports.py` | Import trỏ tới file không tồn tại, hoặc tới một tên không được export. Bắt được cả những file chạm `document` nên không import headless được (`main.js`, `ui/*`). |
| `node tools/build-all.mjs` | Dựng **toàn bộ 24 loài** rồi in bảng kích thước, số mesh, số tam giác. Một hàm bị thiếu sẽ ném lỗi ngay tại đây. Kết quả **tái lập được** (Math.random đã seed), nên có thể `diff` với lần chạy trước để phát hiện thay đổi ngoài ý muốn. |
| `node tools/verify-sharks.mjs` | Ba loài cá mập phải khác nhau đúng chỗ: tỉ lệ vây lưng 2/1, hình đuôi, gờ interdorsal. |
| `node tools/verify-rays.mjs` | Cá đuối manta vs cá đuối đốm xanh: tỉ lệ đĩa, độ dày, chiều dài đuôi, cephalic fins. |
| `node tools/verify-reef.mjs` | Bốn loài cá rạn: độ thẳng của lưng, tiết diện thân, hình đuôi (tròn/chẻ/cụt), số vây lưng. |
| `node tools/verify-crabs.mjs` | Hai loài cua: số răng mép mai, gai cổ tay, mái chèo bơi. |
| `node tools/verify-tail.mjs` | Mặt cắt dọc đuôi cá đuối đốm xanh (nếp da bụng). |

## Xem hình mà không cần trình duyệt

`tools/render.py` là bộ rasteriser phần mềm tự viết — chiếu trực giao, z-buffer, Lambert.

```bash
node tools/dump.mjs great_white /tmp/gw.json     # xuất tam giác + màu ra JSON
python3 tools/render.py /tmp/gw.json side out.png
```

Góc nhìn: `side`, `top`, `front`. Nhiều loài thì ngăn cách bằng dấu phẩy.

**Giới hạn:** bộ render này dùng ánh sáng phẳng, **không có** water shader, fog theo độ sâu
hay khúc xạ. Nó đáng tin cho **silhouette, tỉ lệ và bố cục màu** — không phản ánh đúng cảm
giác trong game. Đừng dùng nó để duyệt màu cuối cùng.

## Một cái bẫy đã biết

Texture thủ tục ghi thẳng các thành phần của `THREE.Color` vào `DataTexture`. Vì
`ColorManagement` đang bật, các thành phần đó ở **không gian linear**, nên một hex khai báo
sẽ vào texture **tối hơn nhiều** so với lúc nhìn bảng màu:

| Hex khai báo | Ý định (sRGB) | Thực tế vào texture |
|---|---|---|
| `0x2f4436` | (47, 68, 54) | (7, 15, 9) |
| `0x6f7c85` | (111, 124, 133) | (41, 51, 60) |

Màu càng tối càng bị nén mạnh. Khi thêm màu mới vào `species.js`, hãy chọn theo **kết quả
render ra**, đừng chọn theo bảng màu. Sửa tận gốc (đánh dấu DataTexture là sRGB) sẽ đổi diện
mạo của cả 24 loài cùng lúc, nên chưa làm.
