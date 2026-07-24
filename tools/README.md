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

## Đo hiệu năng

`tools/scene-cost.mjs` dựng một vùng 5×5 chunk tại vài toạ độ thật rồi đếm draw
call và tam giác. Đây là con số quyết định FPS, không phải polycount — bản đồ
Trái Đất đưa rừng ngập mặn ra viền mọi bờ nhiệt đới, và một chunk ngập mặn từng
sinh 719 mesh riêng lẻ.

| Vùng | Trước `mergeStatic` | Sau |
|---|---|---|
| Ven bờ (Biển Đỏ) | 12.267 | **738** |
| Rạn san hô | 2.427 | **302** |
| Biển khơi | 754 | 618 |

## Sự kiện thế giới sống

| Bộ kiểm | Bắt lỗi gì |
|---|---|
| `verify-schools.mjs` | Một đàn phải là **đúng 1 lệnh vẽ** và dưới 1.200 tris/con; mọi điểm tuyến di cư phải nằm trên nước; đàn phải được thu dọn khi người chơi đi xa. Đã bắt được 2 tuyến có điểm rơi vào đất liền. |
| `verify-currents.mjs` | Dòng chảy phải nằm đúng vị trí thật (Gulf Stream ngoài khơi Florida, Kuroshio ngoài khơi Nhật), phủ 20–45% mặt biển, và suy giảm theo độ sâu. Đã bắt được điểm cuối Gulf Stream rơi vào Scotland. |

**Vì sao đàn cá chỉ tốn 1 lệnh vẽ:** mỗi loài được "nướng" xuống một geometry duy nhất
(màu texture da đọc vào vertex color), rồi vẽ bằng `InstancedMesh`. Sóng bơi chạy trên
vertex shader với pha riêng từng cá thể. Chi tiết nhỏ hơn 6% chiều dài thân bị loại — hai
con mắt tốn ~1.700 tris, nhiều hơn cả thân, mà ở khoảng cách nhìn thấy đàn thì chỉ là một
điểm. Nhờ vậy 3.080 → 312 tris/con.

## Di cư thẳng đứng

`verify-dvm.mjs` mô phỏng thật: thả một con cá ngừ ở −400 m, chạy 4 phút game ở
pha đêm rồi 4 phút ở pha ngày, và **đòi con vật phải thực sự di chuyển**. Không
đủ nếu dữ liệu `dvm` có mặt mà hành vi không xảy ra.

Kết quả: cá ngừ −400 m → **−100 m qua đêm** → **−429 m ban ngày**.

`Creature.daylight` là biến tĩnh dùng chung, cố ý: nếu truyền `daylight` qua tham
số thì phải sửa chữ ký của `ChunkManager.update`, `Flock.update` và `Creature.update`
chỉ để chuyển một con số. Một nơi ghi, nhiều nơi đọc.

## Địa danh hiếm

`verify-landmarks.mjs` kiểm ba thứ, và cả ba đều từng hỏng:

1. **Tỉ lệ xuất hiện** — xác cá voi 4% chunk biển sâu, trạm vệ sinh 14% chunk rạn.
2. **Vị trí phải báo được ra ngoài.** `mergeStatic` gộp trang trí thành một mesh mỗi
   vật liệu và **xoá sạch `userData`**, nên không thể tìm lại địa danh bằng cách duyệt
   mesh. `buildChunk` trả về mảng `landmarks` riêng.
3. **Đàn cá dọn vệ sinh phải còn động.** `chunkManager` tìm trang trí động bằng
   `decor.children` — **chỉ một tầng**. Ban đầu tôi lồng đàn cá bên trong nhóm trạm,
   nên chúng bị gộp thành đá cứng. Giờ trả về riêng và gắn thẳng vào `decor`.
