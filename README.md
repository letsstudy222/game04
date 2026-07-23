# 🌊 ABYSSAL — Mô phỏng thế giới đại dương

Game khám phá đại dương thư giãn, chạy thẳng trong trình duyệt bằng **Three.js**, không cần cài đặt hay build. Bơi tự do trong một thế giới **procedural vô hạn kiểu Minecraft** — vùng biển sinh ra theo mỗi cú bơi của bạn, các biome (rạn san hô, rừng tảo bẹ, biển khơi, vùng cực, biển sâu) nối liền mạch như đại dương thật. Chọn 1 trong 18 loài (tỉ lệ thật) và lặn xuống.

Phong cách đồ họa: **low-poly mềm mại** (kiểu ABZÛ) — smooth shading + filmic tone mapping, nhẹ và mượt, cá dựng hoàn toàn bằng geometry thủ tục nên repo không cần file model nào.

---

## ▶️ Chạy thử trên máy (local)

Game dùng ES modules + import map, nên **phải chạy qua một web server** (mở trực tiếp `index.html` bằng `file://` sẽ lỗi). Chọn 1 cách:

```bash
# Cách 1: Python (có sẵn trên hầu hết máy)
python3 -m http.server 8000
# rồi mở http://localhost:8000

# Cách 2: Node.js
npx serve .
# hoặc: npx http-server -p 8000
```

> Cần kết nối Internet lần đầu để tải Three.js từ CDN và font từ Google Fonts.

---

## 🚀 Đưa lên GitHub Pages (chơi online, miễn phí)

1. Tạo một repository mới trên GitHub (Public), ví dụ `abyssal-ocean`.
2. Upload **toàn bộ** các file trong thư mục này lên repo (giữ nguyên cấu trúc, `index.html` phải nằm ở thư mục gốc của repo).
   - Kéo–thả cả thư mục vào trang repo, hoặc dùng git:
     ```bash
     git init
     git add .
     git commit -m "Abyssal ocean game"
     git branch -M main
     git remote add origin https://github.com/<tên-của-bạn>/abyssal-ocean.git
     git push -u origin main
     ```
3. Vào **Settings → Pages**.
4. Mục **Build and deployment → Source**: chọn **Deploy from a branch**.
5. Chọn branch **main** và thư mục **/ (root)** → **Save**.
6. Đợi ~1 phút, GitHub sẽ cho bạn link dạng:
   `https://<tên-của-bạn>.github.io/abyssal-ocean/`

Xong. Mỗi lần `git push` mới, trang tự cập nhật.

---

## 🎮 Điều khiển (desktop)

| Phím | Hành động |
|------|-----------|
| **W** | Bơi tới |
| **S** | Bơi lùi / phanh |
| **A / D** hoặc **chuột** | Rẽ trái / phải (nhấp chuột để khoá con trỏ, nhìn tự do) |
| **↑ / ↓** | Ngẩng lên / cúi xuống |
| **Space** | Bơi lên |
| **C** | Lặn xuống |
| **Shift** | Tăng tốc |
| **B** hoặc nút 🔇 | Bật/tắt âm thanh đại dương |
| **Cuộn chuột** | Phóng to / thu nhỏ khoảng cách camera (0,25×–3×) |
| **F** | Chuyển góc nhìn thứ nhất (nhìn từ mắt cá) |
| **G** | Bật/tắt bảng đo hiệu năng (FPS, tam giác, số sinh vật) |
| **P** | Chế độ chụp ảnh (ẩn UI, camera quay quanh cá) |
| **J** | Mở/đóng Nhật ký thám hiểm |
| **E** | Mở/đóng Bách khoa toàn thư |
| **M** | Về menu đổi loài |

---

## 🗂️ Cấu trúc dự án

```
index.html            # Điểm vào — import map Three.js, các lớp overlay (menu/HUD/loading)
styles.css            # Giao diện: thẩm mỹ "nhật ký thám hiểm biển sâu" phát quang sinh học
.nojekyll             # Cho GitHub Pages phục vụ file tĩnh nguyên trạng
src/
  config.js           # ⚙️ Mọi hằng số tinh chỉnh: seed, kích thước chunk, tầm nhìn, tốc độ, giới hạn hiệu năng
  core/
    noise.js          # Noise thủ tục tự chứa (Perlin/fBm) — quyết định địa hình & biome, có seed nên tái tạo giống hệt
    input.js          # Bàn phím + chuột (pointer lock)
  data/
    species.js        # ⭐ Dữ liệu 24 loài: kích thước thật, biome, độ sâu, màu, mục bách khoa
  world/
    biomes.js         # Ánh xạ toạ độ → biome; độ cao đáy biển; cấu hình màu/độ sâu mỗi biome
    chunk.js          # Dựng 1 chunk: lưới đáy biển + trang trí (san hô/tảo/đá/băng/miệng phun) + điểm spawn
    chunkManager.js   # Streaming: load/unload chunk quanh người chơi, quản lý sinh vật, sway tảo
    ocean.js          # Bầu không khí: mặt nước, fog theo độ sâu, tia nắng, phù du
  entities/
    fishMesh.js       # Dựng mesh cá/mập/voi/rùa low-poly + animation bơi
    creature.js       # AI sinh vật NPC: bơi lang thang + bơi theo đàn (boids)
    player.js         # Nhân vật điều khiển + camera góc thứ 3
  ui/
    menu.js           # Màn chọn loài (field-guide, thanh so sánh kích thước với thợ lặn)
    hud.js            # HUD: độ sâu, vùng biển, toạ độ, la bàn
  main.js             # Ghép tất cả + vòng lặp game
```

---

## 🧩 Cách mở rộng

### Thêm một loài cá mới
Mở `src/data/species.js`, **copy một khối loài** rồi sửa các trường (`length` theo mét, `homeBiome`, `spawnBiomes`, `depth`, `colors`, `shape`). Thêm `id` mới vào mảng `SPECIES_ORDER`. Thẻ trong menu và việc spawn NPC sẽ **tự động** nhận loài mới.

- `shape` nhận: `'fish'`, `'shark'`, `'whale'`, `'turtle'` (quyết định hình dáng mesh trong `fishMesh.js`). Muốn hình dáng hoàn toàn mới thì thêm một nhánh trong `buildCreature()`.

### Thêm / chỉnh một biome
Mở `src/world/biomes.js`: thêm khối vào `BIOME_DEF` (màu đáy, màu nước, độ sâu nền, kiểu trang trí) và thêm nhánh trong `biomeAt()` để quyết định khi nào biome đó xuất hiện. Nếu dùng kiểu trang trí mới, thêm hàm dựng trong `src/world/chunk.js`.

### Tinh chỉnh cảm giác / hiệu năng
Tất cả nằm trong `src/config.js`: `chunk.renderRadius` (tầm nhìn — giảm nếu máy yếu), `chunk.size`, `perf.maxCreatures`, `perf.plankton`, tốc độ bơi, v.v.

---

## 🗺️ Tám vùng biển
| Vùng | Độ sâu trung vị | Đặc trưng |
|---|---|---|
| Rừng ngập mặn | −3 m | Rễ đước chống vòm, rễ thở, nước đục màu tanin, tầm nhìn thấp nhất game |
| Bãi cỏ biển | −9 m | Thảm lá dày đung đưa, cát sạch, nước rất trong |
| Hố xanh | −19 m vành, **−124 m đáy** | Vực karst thành dựng đứng, nhũ đá, thảm vi khuẩn lưu huỳnh |
| Rạn san hô | −22 m | 5 kiểu san hô, cá đàn |
| Rừng tảo bẹ | −45 m | Tảo cao đung đưa |
| Vùng cực | −93 m | Băng trôi |
| Biển khơi | −156 m | Rãnh sâu, xác tàu |
| Biển sâu | −293 m | Sứa phát quang, miệng phun |

Hố xanh dựng theo Great Blue Hole thật (rộng 300 m, sâu 124 m): trong game rộng 240 m, đáy 106–136 m.

## 🌊 Nước và ánh sáng
- **Sóng Gerstner thật** trên GPU: bốn lớp sóng khác hướng và bước sóng, đỉnh nhọn đáy phẳng như sóng biển thật (sóng hình sin đối xứng trông như tấm vải).
- **Cửa sổ Snell**: nhìn lên từ dưới nước, toàn bộ bầu trời bị khúc xạ dồn vào một đĩa sáng rộng khoảng 97° ngay trên đầu, có mặt trời lấp lánh gợn theo sóng; ngoài đĩa đó mặt nước phản chiếu biển tối trở lại.
- **Vệt caustic**: đỉnh sóng hội tụ ánh nắng thành lưới sáng lay động, chiếu lên đáy biển, san hô, xác tàu **và cả lưng cá** — mờ dần và tắt hẳn khoảng 60 m.
- **Mất màu theo độ sâu đúng vật lý**: đỏ tắt gần hết ở 30 m (còn 1%), lục còn 41%, lam còn 72%; xuống 80 m chỉ còn lam (42%). Đây là thứ khiến độ sâu *trông ra* độ sâu chứ không chỉ tối đi.
- **Bơi lên mặt nước**: bỏ trần cứng cũ. Cá voi, cá heo, rùa, cá mặt trăng nay nổi lên phá sóng với khoảng 77% thân trên mặt nước; lực cản tăng vọt ở mét cuối nên cảm giác đúng như trồi lên.

## ⚡ Hiệu năng
Mô hình chi tiết rất tốn: mỗi sinh vật 8–13 nghìn tam giác, và việc uốn thân theo sóng phải tính lại pháp tuyến mỗi khung. Đo được **1,81 ms cho MỘT con** — 60 con là 108 ms/khung, tức ~9 FPS.

Hệ **LOD** chia sinh vật thành 4 bậc theo khoảng cách:

| Bậc | Xử lý | Chi phí |
|---|---|---|
| 0 — gần | Uốn thân + tính lại pháp tuyến (3 khung/lần) | 0,186 ms |
| 1 — vừa | Uốn thân, giữ pháp tuyến cũ | 0,043 ms |
| 2 — xa | Chỉ vây và đuôi động | 0,0003 ms |
| 3 — rất xa | Nghỉ | 0,0003 ms |

Bậc 0 còn bị giới hạn số lượng (5/8/12 con tuỳ mật độ). Sinh vật NPC cũng dùng lưới thưa hơn người chơi (giảm 47% tam giác).

Kết quả: **150 con từ 271 ms xuống 3,2 ms mỗi khung — nhanh gấp 86 lần.** Nhấn **G** trong game để xem FPS thực tế.

## ✨ Có gì trong thế giới
- **Camera tự chỉnh:** cuộn chuột kéo góc nhìn sát vào hoặc lùi ra (0,25×–3× khoảng cách mặc định) — cá nhỏ như cá hề có thể zoom sát để ngắm chi tiết. Nhấn **F** để vào góc nhìn thứ nhất, nhìn thẳng từ mắt con vật.
- **Độ sâu theo số liệu thật** (FishBase/IUCN/NOAA): cá ngừ vây xanh 1–985 m, cá mập trắng 1–1.200 m, cá mặt trăng 0,8–644 m, cá đuối manta 1–1.000 m, cá cần câu 100–1.500 m, mực khổng lồ 300–1.000 m. Loài thở bằng phổi và loài phơi nắng đều lên tới sát mặt nước.
- **Cảm giác khối lượng khi điều khiển:** loài càng lớn càng nặng nề khi đổi hướng. Cá hề bẻ lái tức thì (độ nhanh nhẹn 14, quay tối đa 6,0 rad/s); cá voi xanh mất khoảng một giây để vào cua và cũng chừng ấy để ra (2,2 và 1,1 rad/s) — kèm quán tính khi tăng/giảm tốc và độ nghiêng thân lớn hơn khi lượn.
- **Sinh vật dựng theo giải phẫu thật:** mỗi loài lớn là **một mặt cong liền mạch** có tiết diện biến đổi dọc thân (đầu bẹt rộng → giữa tròn đầy → cuống đuôi dẹt đứng), không phải các khối hình ghép lại. Chi tiết da (rãnh bụng cá voi, khe mang cá mập, vạch cá hề, vân vảy) được **sinh bằng thuật toán vào texture** — không dùng file ảnh nào, nên sắc nét mà vẫn nhẹ.
- **Mắt thật:** nhãn cầu sẫm lắp chìm gần phẳng với đầu, vành mống mắt mỏng theo từng loài (cá hề vàng cam, cá ngừ vàng đồng, cá mập gần đen), kèm một chấm sáng ướt.
- **Thân uốn theo sóng lan truyền:** cá và cá mập lượn ngang, cá voi và cá heo nhấp nhô dọc — đúng cơ chế bơi của từng nhóm sinh vật.
- **Một hệ ánh sáng duy nhất** (`src/core/lighting.js`) dùng chung cho game và bộ render duyệt mẫu, nên hình trong game giống hệt ảnh đã duyệt.

- **Mô hình 3D theo giải phẫu thật:** mỗi loài có đường viền thân (profile) dựng từ tỉ lệ cơ thể thật, không dùng khuôn chung. Cá voi xanh có **rãnh bụng (ventral pleats)**, mõm bẹt hình chữ U, lỗ thở kèm gờ chắn nước, vây lưng nhỏ đặt lùi 72% thân, đuôi hai thùy có khía giữa. Cá mập trắng có **5 khe mang**, hàm răng nhọn, đuôi lưỡi liềm lệch. Cá heo có **melon** (trán tròn) và mỏ; vaquita có quầng mắt đen đặc trưng. Mực khổng lồ có 8 tay + 2 xúc tu nhiều đốt uốn lượn.
- **Ngụy trang phản bóng (countershading):** mọi loài đậm màu ở lưng, nhạt dần xuống bụng — bằng vertex color, không tốn texture.
- **Thân dẹt hai bên đúng thật:** cá không có tiết diện tròn; cá hề rộng 5,5cm × cao 6,3cm.
- **Cảm giác đồ sộ đã sửa:** trước đây camera lùi *tỉ lệ thuận* với kích thước loài nên **mọi loài đều chiếm 30–33% khung hình như nhau** — đó là lý do cá voi 28m trông chẳng khác cá nhỏ. Nay camera lùi theo `length^0.72`: cá voi **tràn 118% khung hình**, mực 89%, cá hề chỉ 6%. FOV cũng nới rộng theo tốc độ.
- **Bách khoa toàn thư** (`E`): mục tra cứu cho cả 15 loài với **số liệu thật** — cân nặng, tuổi thọ, thức ăn, dải độ sâu, kỷ lục, và **trạng thái bảo tồn IUCN** có màu (Ít lo ngại → Cực kỳ nguy cấp). Mỗi loài có một đoạn viết về tập tính và sinh học. Loài chưa gặp bị khoá kèm gợi ý nơi tìm.
- **12 loài chơi được**, trong đó 4 loài mới: **mực khổng lồ** (12 m, 8 tay + 2 xúc tu săn mồi, biển sâu), **cá mặt trăng** (thân đĩa khổng lồ, vây lưng và hậu môn chèo ngược nhau), **cá heo chuột vaquita** (loài thú biển hiếm nhất hành tinh — CR), **rắn biển vằn** (thân 14 đốt lượn sóng, đuôi bè như mái chèo).
- **Chọn mật độ sinh vật** ngay trong menu: Thấp (70) / Vừa (150) / Cao (240 sinh vật cùng lúc).
- **Điều khiển kiểu ABZÛ, chống chóng mặt:** chuột lái hướng bơi trực tiếp; camera bám theo có độ trễ mềm và **chỉ nghiêng 60% theo góc ngẩng** nên chân trời luôn ổn định; thân cá nghiêng nhẹ theo *tốc độ rẽ* rồi **tự cân bằng về 0**; góc ngẩng giới hạn ±60°; camera không bao giờ xoay nghiêng. Thêm **chỉ báo chân trời** trong HUD.
- **Sinh vật nhỏ làm biển sống động:** đàn cá con rạn san hô (14–26 con lơ lửng trên nhánh san hô), **sao biển** và **cua đá** bò sát đáy biển (benthic — bám nền, không bơi lơ lửng).
- **Địa hình mốc:** **cột đá** cao 22–52 m vươn lên từ đáy (~12% chunk) và **vòm đá** bơi xuyên qua được (~8% chunk) — dùng làm mốc định hướng khi khám phá.
- **Minimap thế giới** góc trên phải: bản đồ màu các vùng biển xung quanh (san hô vàng cát, tảo bẹ xanh lục, biển khơi xanh dương, vùng cực xám băng, biển sâu tối), mũi tên phát sáng chỉ hướng bạn đang bơi, hướng Bắc luôn ở trên.
- **Hình ảnh mềm mại:** smooth shading toàn bộ (địa hình, sinh vật, san hô), ACES filmic tone mapping cho màu chuyển êm như phim, ánh sáng môi trường dày hơn để bóng đổ dịu.
- **Đại dương phản ứng với bạn:** chơi cá mập trắng → cá nhỏ và cả đàn cá dạt ra bỏ chạy (tăng tốc gấp đôi); bơi loài hiền lành → cá heo tò mò lượn theo bạn. Cá voi điềm nhiên không quan tâm, cá cần câu rình mồi đứng im.
- **Chia sẻ thế giới bằng seed:** đổi seed trong menu hoặc mở link `?seed=tên-bất-kỳ` — cùng seed là cùng một đại dương, gửi link cho bạn bè để khám phá chung bản đồ.
- **4 danh hiệu:** Nhà hải dương học (đủ mọi loài), Người vẽ hải đồ (đủ 5 vùng), Thợ săn xác tàu, Chạm vực thẳm (sâu quá 500 m) — lưu vĩnh viễn, xem trong Nhật ký (`J`).
- **Nhật ký thám hiểm** (`J`): bơi gần một loài lần đầu → ghi nhận kèm thông báo; vào vùng biển mới → đánh dấu khám phá. Tiến độ **tự lưu qua các lần chơi** (localStorage). Loài chưa gặp hiện "???" kèm gợi ý vùng cần tìm; thẻ menu có dấu ✓ với loài đã gặp.
- **8 loài tỉ lệ thật:** cá hề, rùa biển, cá ngừ, cá mập trắng, cá heo, cá đuối manta, cá voi xanh — và **cá cần câu biển sâu** với chiếc lure phát sáng, loài duy nhất sống ở tầng nửa đêm.
- **Chu kỳ ngày/đêm** (6 phút/vòng): ánh sáng, màu nước và tia nắng đổi dần từ trưa rực rỡ đến đêm thăm thẳm — ban đêm sứa và cá cần câu phát sáng nổi bật.
- **Chế độ chụp ảnh** (`P`): ẩn toàn bộ UI, camera từ từ quay quanh con cá của bạn.
- **Xác tàu đắm** hiếm gặp (~6% chunk biển khơi/biển sâu) — nghiêng mình trên đáy, cột buồm gãy, chờ được khám phá.
- **Sứa phát quang sinh học** trôi lơ lửng ở biển sâu & vùng cực (đập nhịp chuông, dâng hạ theo dòng nước).
- **Bọt khí** bay lên quanh bạn, **phù du** trôi, **tia nắng** xuyên mặt nước, **tảo bẹ** đung đưa.
- **Âm thanh đại dương procedural** (Web Audio — không file mp3 nào): tiếng nước trầm dâng trào như sóng xa. Nhấn `B` để bật.
- **Tự động hạ chất lượng** nếu máy yếu: FPS < 38 → giảm độ phân giải render; FPS < 30 → thu hẹp tầm streaming 7×7 → 5×5 chunk. Không cần cài đặt gì.
- **Tốc độ bơi theo kích thước thật:** cá hề ~1.4 m/s, rùa ~7, cá voi ~15, cá mập ~17, cá ngừ nhanh nhất ~19 m/s — camera cũng tự co giãn theo cỡ loài.

## ⚠️ Ghi chú kỹ thuật
- Không có bước build. Three.js nạp qua **import map** từ CDN jsDelivr (phiên bản `0.160.0`).
- Thế giới **có seed** (`config.js → seed`): cùng seed → cùng bản đồ. Đổi seed để có đại dương khác.
- Cá được dựng bằng geometry thủ tục (LatheGeometry + các vây tam giác) nên **không cần asset ngoài**.

## 📄 License
MIT — dùng tự do cho mục đích cá nhân & thương mại.
