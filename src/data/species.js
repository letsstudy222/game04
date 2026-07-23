// species.js — The 5 playable + spawnable creatures for v1.
// Sizes are REAL SCALE (meters). Biome + depth define where each one lives.
// To add a species: copy a block, keep the same fields. That's the only edit needed.

export const BIOMES = ['coral_reef', 'kelp_forest', 'open_ocean', 'polar', 'deep_sea'];

export const SPECIES = {
  clownfish: {
    id: 'clownfish',
    name: 'Clownfish',
    viet: 'Cá hề',
    scientific: 'Amphiprion ocellaris',
    length: 0.09,                 // ~9 cm
    shape: 'fish',
    colors: { body: 0xff7a1a, band: 0xffffff, fin: 0x1c1c1c, belly: 0xffb060 },
    homeBiome: 'coral_reef',
    spawnBiomes: ['coral_reef'],
    depth: [-1, -15],            // reef flats & slopes
    schooling: true,
    schoolSize: [6, 14],
    speedFactor: 0.5,            // small fish -> slower absolute cruise
    info: {
      habitat: 'Rạn san hô nhiệt đới Ấn Độ Dương – Thái Bình Dương',
      fact: 'Sống cộng sinh với hải quỳ; miễn nhiễm với xúc tu độc nhờ lớp nhầy bảo vệ.',
    },
    wiki: {
      weight: '25–30 g',
      lifespan: '6–10 năm',
      diet: 'Tảo, động vật phù du, mẩu thức ăn thừa của hải quỳ',
      status: 'LC',
      depthRange: '1–15 m',
      records: 'Mỗi đàn có một con cái đầu đàn duy nhất; khi nó chết, con đực lớn nhất chuyển giới thành cái.',
      body: 'Cá hề sống cả đời trong một cụm hải quỳ, được bảo vệ khỏi kẻ săn mồi nhờ lớp nhầy đặc biệt khiến xúc tu độc không nhận ra chúng là con mồi. Đổi lại, cá hề xua đuổi cá bướm ăn hải quỳ và làm sạch xúc tu. Chúng hầu như không bao giờ bơi xa quá vài mét khỏi "nhà" — một cá thể bị tách khỏi hải quỳ thường không sống sót được lâu.',
    },
  },

  sea_turtle: {
    id: 'sea_turtle',
    name: 'Green Sea Turtle',
    viet: 'Rùa biển xanh',
    scientific: 'Chelonia mydas',
    length: 1.2,
    shape: 'turtle',
    colors: { body: 0x4b6b3a, shell: 0x3a4d2b, fin: 0x5c7a44, belly: 0xcfc19a },
    homeBiome: 'coral_reef',
    spawnBiomes: ['coral_reef', 'kelp_forest'],
    depth: [-0.4, -40],
    schooling: false,
    speedFactor: 0.7,
    info: {
      habitat: 'Vùng ven bờ nhiệt đới & cận nhiệt đới, gần rạn san hô và thảm cỏ biển',
      fact: 'Có thể lặn hơn 1 giờ; định hướng di cư hàng nghìn km bằng từ trường Trái Đất.',
    },
    wiki: {
      weight: '110–190 kg',
      lifespan: '60–70 năm',
      diet: 'Cỏ biển và tảo (con trưởng thành ăn chay)',
      status: 'EN',
      depthRange: '0–40 m',
      records: 'Di cư tới 2.600 km giữa bãi kiếm ăn và bãi đẻ trứng nơi chính chúng nở ra.',
      body: 'Rùa biển xanh là loài rùa biển duy nhất ăn chay khi trưởng thành — chính chế độ ăn cỏ biển làm lớp mỡ dưới mai chuyển màu xanh lục, nguồn gốc của tên gọi. Con cái quay về đúng bãi biển nơi mình nở ra để đẻ trứng, định vị bằng cách ghi nhớ dấu từ trường của bãi biển đó. Nhiệt độ cát quyết định giới tính của trứng: cát ấm nở ra con cái, cát mát nở ra con đực.',
    },
  },

  bluefin_tuna: {
    id: 'bluefin_tuna',
    name: 'Bluefin Tuna',
    viet: 'Cá ngừ vây xanh',
    scientific: 'Thunnus thynnus',
    length: 2.2,
    shape: 'tuna',
    colors: { body: 0x2f4a6b, band: 0x8fb7d6, fin: 0xd6b23a, belly: 0xe8eef2 },
    homeBiome: 'open_ocean',
    spawnBiomes: ['open_ocean'],
    depth: [-1, -985],
    schooling: true,
    schoolSize: [5, 12],
    speedFactor: 1.35,          // fast pelagic swimmer
    info: {
      habitat: 'Biển khơi (pelagic) ôn đới & cận nhiệt đới, di cư xuyên đại dương',
      fact: 'Một trong những loài cá nhanh nhất; thân nhiệt cao hơn nước xung quanh (nội nhiệt).',
    },
    wiki: {
      weight: '225–680 kg',
      lifespan: '15–40 năm',
      diet: 'Cá trích, cá thu, mực, giáp xác',
      status: 'LC',
      depthRange: '0–1.000 m',
      records: 'Tốc độ bơi tối đa ~70 km/h; vượt Đại Tây Dương trong chưa đầy 60 ngày.',
      body: 'Cá ngừ vây xanh là một trong số ít loài cá có khả năng nội nhiệt: hệ mạch trao đổi nhiệt ngược dòng giữ cho cơ, mắt và não ấm hơn nước biển tới 20°C, cho phép chúng săn mồi hiệu quả cả ở vùng nước lạnh. Thân hình thoi hoàn hảo cùng bộ vây có thể thu vào rãnh giúp giảm lực cản tối đa. Chúng phải bơi liên tục cả đời để nước chảy qua mang.',
    },
  },

  great_white: {
    id: 'great_white',
    name: 'Great White Shark',
    viet: 'Cá mập trắng lớn',
    scientific: 'Carcharodon carcharias',
    length: 4.6,
    shape: 'shark',
    colors: { body: 0x6f7c85, band: 0x8a969d, fin: 0x5b666d, belly: 0xeef1f2 },
    homeBiome: 'open_ocean',
    spawnBiomes: ['open_ocean', 'kelp_forest'],
    depth: [-1, -1200],
    schooling: false,
    speedFactor: 1.0,
    info: {
      habitat: 'Nước ven bờ ôn đới, thềm lục địa, gần đàn hải cẩu',
      fact: 'Cảm nhận điện trường sinh học của con mồi qua cơ quan Ampullae of Lorenzini.',
    },
    wiki: {
      weight: '680–1.100 kg',
      lifespan: '~70 năm',
      diet: 'Hải cẩu, sư tử biển, cá lớn, xác cá voi',
      status: 'VU',
      depthRange: '0–1.200 m',
      records: 'Một cá thể tên Nicole bơi từ Nam Phi sang Úc và quay lại — 20.000 km trong 9 tháng.',
      body: 'Cá mập trắng lớn phát hiện con mồi bằng cơ quan Ampullae of Lorenzini — mạng lỗ cảm nhận điện trường sinh học yếu ớt phát ra từ cơ bắp và tim đang đập của sinh vật khác. Chúng cũng có bộ máy trao đổi nhiệt giữ thân ấm hơn nước. Trái với hình tượng phim ảnh, chúng phát triển rất chậm: con cái phải tới khoảng 33 tuổi mới sinh sản lần đầu, khiến quần thể cực kỳ khó phục hồi.',
    },
  },

  blue_whale: {
    id: 'blue_whale',
    name: 'Blue Whale',
    viet: 'Cá voi xanh',
    scientific: 'Balaenoptera musculus',
    length: 28,                 // real: up to ~30 m
    shape: 'whale',
    colors: { body: 0x4a6f8a, band: 0x5f86a0, fin: 0x3d5c73, belly: 0x9fb4bf },
    homeBiome: 'polar',
    spawnBiomes: ['polar', 'open_ocean'],
    depth: [-1.5, -500],
    schooling: false,
    speedFactor: 0.9,
    info: {
      habitat: 'Biển khơi toàn cầu; kiếm ăn ở vùng cực giàu nhuyễn thể (krill)',
      fact: 'Động vật lớn nhất từng tồn tại; tiếng kêu tần số thấp truyền xa hàng trăm km.',
    },
    wiki: {
      weight: '100–150 tấn',
      lifespan: '80–90 năm',
      diet: 'Nhuyễn thể (krill) — tới 4 tấn mỗi ngày',
      status: 'EN',
      depthRange: '0–500 m',
      records: 'Động vật lớn nhất từng tồn tại: dài 30 m, tim nặng ~180 kg.',
      body: 'Cá voi xanh ăn bằng cách lao vào đám krill với miệng há rộng, nuốt khối nước lớn hơn cả thể tích cơ thể mình, rồi ép nước ra qua các tấm sừng hàm giữ lại con mồi. Tiếng gọi của chúng ở tần số 10–40 Hz — thấp hơn ngưỡng nghe của người — và truyền xa hàng trăm km dưới nước, có thể là phương tiện liên lạc tầm xa nhất của mọi loài động vật. Săn bắt thương mại thế kỷ 20 đã giết khoảng 360.000 cá thể, và quần thể vẫn đang hồi phục chậm chạp.',
    },
  },

  dolphin: {
    id: 'dolphin',
    name: 'Bottlenose Dolphin',
    viet: 'Cá heo mũi chai',
    scientific: 'Tursiops truncatus',
    length: 2.4,
    shape: 'dolphin',             // cetacean: horizontal fluke, up-down stroke
    colors: { body: 0x7f97a6, band: 0xa9bcc7, fin: 0x5f7482, belly: 0xdfe8ec },
    homeBiome: 'open_ocean',
    spawnBiomes: ['open_ocean', 'coral_reef'],
    depth: [-0.5, -300],
    schooling: true,
    schoolSize: [4, 9],
    speedFactor: 1.3,
    info: {
      habitat: 'Vùng ven bờ ấm & biển khơi ôn đới trên toàn thế giới',
      fact: 'Định vị con mồi bằng sóng siêu âm (echolocation); mỗi cá thể có "tên gọi" huýt sáo riêng.',
    },
    wiki: {
      weight: '150–650 kg',
      lifespan: '40–60 năm',
      diet: 'Cá, mực, giáp xác',
      status: 'LC',
      depthRange: '0–300 m',
      records: 'Nhận ra chính mình trong gương — khả năng chỉ thấy ở rất ít loài.',
      body: 'Cá heo mũi chai định vị bằng tiếng vang: phát chuỗi xung âm qua "quả dưa" trên trán rồi đọc tiếng vọng dội về qua xương hàm dưới, dựng nên bản đồ âm thanh chi tiết tới mức phân biệt được vật kim loại chôn dưới cát. Mỗi cá thể tự đặt cho mình một tiếng huýt đặc trưng ngay từ nhỏ và giữ suốt đời — tương đương một cái tên riêng, và đồng loại dùng đúng tiếng huýt đó để gọi nhau.',
    },
  },

  manta_ray: {
    id: 'manta_ray',
    name: 'Giant Manta Ray',
    viet: 'Cá đuối manta',
    scientific: 'Mobula birostris',
    length: 4.5,                // wingspan
    shape: 'ray',
    colors: { body: 0x2b3540, fin: 0x1f2830, belly: 0xe8eef0 },
    homeBiome: 'open_ocean',
    spawnBiomes: ['open_ocean', 'coral_reef'],
    depth: [-1, -1000],
    schooling: false,
    speedFactor: 0.8,
    info: {
      habitat: 'Biển nhiệt đới & cận nhiệt đới, quanh rạn san hô và vùng nước trồi',
      fact: 'Sải "cánh" tới 7 m; lọc sinh vật phù du khi bơi và có não lớn nhất trong các loài cá.',
    },
    wiki: {
      weight: '1.400–2.000 kg',
      lifespan: '~45 năm',
      diet: 'Sinh vật phù du, nhuyễn thể, ấu trùng cá',
      status: 'EN',
      depthRange: '0–1.000 m',
      records: 'Sải cánh tối đa ghi nhận: 7 m — loài cá đuối lớn nhất thế giới.',
      body: 'Cá đuối manta có tỉ lệ não trên khối lượng cơ thể lớn nhất trong tất cả các loài cá, và đã vượt qua bài kiểm tra nhận thức bản thân trong gương. Chúng lọc thức ăn bằng cách bơi há miệng, dùng hai vây đầu lùa nước vào, rồi giữ lại phù du bằng các tấm mang xốp. Mỗi cá thể mang hoa văn đốm ở mặt bụng độc nhất như vân tay, cho phép các nhà nghiên cứu nhận diện từng con qua ảnh chụp.',
    },
  },

  anglerfish: {
    id: 'anglerfish',
    name: 'Deep-sea Anglerfish',
    viet: 'Cá cần câu biển sâu',
    scientific: 'Melanocetus johnsonii',
    length: 0.4,
    shape: 'angler',
    colors: { body: 0x241f2b, fin: 0x1a1620, belly: 0x3a2f42 },
    homeBiome: 'deep_sea',
    spawnBiomes: ['deep_sea'],
    depth: [-100, -1500],
    schooling: false,
    speedFactor: 0.4,
    info: {
      habitat: 'Tầng nửa đêm của biển sâu, nơi ánh sáng mặt trời không chạm tới',
      fact: 'Chiếc "cần câu" phát sáng nhờ vi khuẩn phát quang cộng sinh, dụ con mồi trong bóng tối tuyệt đối.',
    },
    wiki: {
      weight: '~110 g',
      lifespan: 'Chưa xác định',
      diet: 'Cá nhỏ, giáp xác — bất cứ thứ gì lọt vào miệng',
      status: 'LC',
      depthRange: '200–2.000 m',
      records: 'Con đực nhỏ hơn con cái tới 60 lần và sống ký sinh vĩnh viễn trên bạn tình.',
      body: 'Chiếc "cần câu" trên đầu cá cần câu cái là một tia vây lưng biến đổi, đầu mút chứa hàng triệu vi khuẩn phát quang cộng sinh tạo ra ánh sáng xanh lạnh. Dạ dày co giãn cực mạnh cho phép chúng nuốt con mồi lớn gấp đôi bản thân — trong vùng nước nơi bữa ăn có thể cách nhau hàng tháng. Ở nhiều loài, con đực tí hon cắn vào bụng con cái, mô hai bên dần hợp nhất, và nó trở thành một túi tinh sống gắn vĩnh viễn.',
    },
  },

  giant_squid: {
    id: 'giant_squid',
    name: 'Giant Squid',
    viet: 'Mực khổng lồ',
    scientific: 'Architeuthis dux',
    length: 12,
    shape: 'squid',
    colors: { body: 0x8c3f52, fin: 0x6e2f40, belly: 0xd9a3ab },
    homeBiome: 'deep_sea',
    spawnBiomes: ['deep_sea'],
    depth: [-300, -1000],
    schooling: false,
    speedFactor: 0.75,
    info: {
      habitat: 'Tầng nước sâu 300–1000 m ở mọi đại dương, hiếm khi được nhìn thấy sống',
      fact: 'Mắt lớn nhất trong giới động vật — đường kính tới 27 cm, giúp phát hiện ánh phát quang của kẻ săn mồi trong bóng tối.',
    },
    wiki: {
      weight: '150–275 kg',
      lifespan: '~5 năm',
      diet: 'Cá biển sâu, mực nhỏ',
      status: 'DD',
      depthRange: '300–1000 m',
      records: 'Cá thể dài nhất từng ghi nhận: 13 m tính cả xúc tu săn mồi.',
      body: 'Mực khổng lồ có tám cánh tay và hai xúc tu săn mồi dài, phủ hàng trăm giác bám viền răng kitin sắc. Chúng bơi bằng cách phụt nước qua ống siphon và giữ thăng bằng nhờ đôi vây tam giác ở cuối thân. Suốt hơn một thế kỷ loài này chỉ được biết đến qua xác dạt bờ và vết sẹo giác bám để lại trên da cá nhà táng — kẻ săn mồi chính của chúng. Mãi đến năm 2004 con người mới chụp được ảnh một cá thể sống trong môi trường tự nhiên.',
    },
  },

  sunfish: {
    id: 'sunfish',
    name: 'Ocean Sunfish',
    viet: 'Cá mặt trăng',
    scientific: 'Mola mola',
    length: 3.3,
    shape: 'sunfish',
    colors: { body: 0x9aa7ad, fin: 0x7c8a92, belly: 0xdfe6e9 },
    homeBiome: 'open_ocean',
    spawnBiomes: ['open_ocean', 'kelp_forest'],
    depth: [-0.8, -644],
    schooling: false,
    speedFactor: 0.35,
    info: {
      habitat: 'Biển khơi ôn đới và nhiệt đới; thường nổi nghiêng mình phơi nắng trên mặt biển',
      fact: 'Cá xương nặng nhất thế giới — tới 2,3 tấn — nhưng bơi chậm rãi và chủ yếu ăn sứa.',
    },
    wiki: {
      weight: '250–2.300 kg',
      lifespan: '~10 năm (ước tính)',
      diet: 'Sứa, sinh vật phù du dạng keo, mực nhỏ',
      status: 'VU',
      depthRange: '0–600 m',
      records: 'Cá thể nặng nhất: 2.300 kg, cao 3,3 m từ vây lưng tới vây hậu môn.',
      body: 'Thân cá mặt trăng gần như bị "cắt cụt" phía sau: chúng không có đuôi thật mà thay bằng một phiến gọi là clavus. Chúng lặn sâu xuống vùng nước lạnh để kiếm sứa rồi quay lên mặt biển nằm nghiêng phơi nắng, để chim biển và cá nhỏ dọn ký sinh trùng trên da. Một con cái có thể mang tới 300 triệu trứng — nhiều nhất trong các loài động vật có xương sống.',
    },
  },

  vaquita: {
    id: 'vaquita',
    name: 'Vaquita',
    viet: 'Cá heo chuột vaquita',
    scientific: 'Phocoena sinus',
    length: 1.4,
    shape: 'porpoise',
    colors: { body: 0x6e7c86, fin: 0x2b3238, belly: 0xe6ecef },
    homeBiome: 'coral_reef',
    spawnBiomes: ['coral_reef', 'kelp_forest'],
    depth: [-0.6, -50],
    schooling: true,
    schoolSize: [2, 3],
    speedFactor: 1.0,
    info: {
      habitat: 'Chỉ sống ở vùng nước nông phía bắc Vịnh California, Mexico',
      fact: 'Động vật biển có vú hiếm nhất hành tinh — ước tính chỉ còn khoảng 10 cá thể ngoài tự nhiên.',
    },
    wiki: {
      weight: '43–55 kg',
      lifespan: '~20 năm',
      diet: 'Cá nhỏ, mực, giáp xác',
      status: 'CR',
      depthRange: '0–50 m',
      records: 'Loài cá voi/cá heo nhỏ nhất thế giới và cũng nguy cấp nhất.',
      body: 'Vaquita có quầng đen quanh mắt và viền môi sẫm, trông như đang trang điểm. Chúng sống đơn lẻ hoặc theo cặp mẹ–con, tránh xa tàu thuyền nên rất khó quan sát. Nguyên nhân suy giảm gần như hoàn toàn do mắc kẹt trong lưới đánh cá totoaba bất hợp pháp. Từ khoảng 600 cá thể năm 1997, quần thể đã giảm xuống mức chỉ còn khoảng 10 con — loài này đang ở ngưỡng tuyệt chủng ngay trong thời đại chúng ta.',
    },
  },

  sea_snake: {
    id: 'sea_snake',
    name: 'Banded Sea Krait',
    viet: 'Rắn biển vằn',
    scientific: 'Laticauda colubrina',
    length: 1.4,
    shape: 'snake',
    colors: { body: 0x2f5f8f, band: 0x1a1a24, fin: 0x9fc4e8, belly: 0xe8eef4 },
    homeBiome: 'coral_reef',
    spawnBiomes: ['coral_reef'],
    depth: [-0.3, -60],
    schooling: false,
    speedFactor: 0.6,
    info: {
      habitat: 'Rạn san hô nhiệt đới Ấn Độ Dương – Thái Bình Dương, gần bờ đá',
      fact: 'Vừa bơi giỏi vừa bò được trên cạn — chúng quay lại bờ để tiêu hóa, lột da và đẻ trứng.',
    },
    wiki: {
      weight: '0,6–1,8 kg',
      lifespan: '~10 năm',
      diet: 'Lươn biển, cá nhỏ trong khe san hô',
      status: 'LC',
      depthRange: '0–30 m',
      records: 'Có thể nín thở lặn liên tục tới 2 giờ nhờ hấp thụ oxy qua da.',
      body: 'Rắn biển vằn có thân dẹt hai bên và đuôi bè như mái chèo, giúp lượn sóng trong nước rất hiệu quả. Những vòng đen trắng xen kẽ là tín hiệu cảnh báo: nọc của chúng mạnh hơn nhiều loài rắn cạn. Tuy vậy chúng cực kỳ hiền lành với người, chỉ cắn khi bị giữ chặt. Chúng thường săn theo cặp cùng cá mú hoặc cá nhồng — rắn lùa lươn ra khỏi khe đá, cá đợi sẵn bên ngoài.',
    },
  },

  // ---- Small ambient life: populates reefs/kelp so the sea feels alive.
  reef_fry: {
    id: 'reef_fry',
    name: 'Reef Fry',
    viet: 'Đàn cá con rạn san hô',
    scientific: 'Chromis viridis',
    length: 0.05,
    shape: 'fish',
    colors: { body: 0x6fe6d0, band: 0xaef4ff, fin: 0x3fbfae, belly: 0xdffaf5 },
    homeBiome: 'coral_reef',
    spawnBiomes: ['coral_reef', 'kelp_forest'],
    depth: [-1, -20],
    schooling: true,
    schoolSize: [14, 26],
    speedFactor: 0.45,
    info: {
      habitat: 'Lơ lửng thành đám dày ngay trên các nhánh san hô',
      fact: 'Cả đàn cùng lao vào khe san hô trong tích tắc khi có bóng lớn lướt qua.',
    },
    wiki: {
      weight: '~2 g',
      lifespan: '2–3 năm',
      diet: 'Sinh vật phù du',
      status: 'LC',
      depthRange: '1–20 m',
      records: 'Một đám có thể lên tới hàng nghìn cá thể trên một đầu san hô.',
      body: 'Cá con rạn san hô lơ lửng thành đám dày ngay phía trên các nhánh san hô cành, đớp phù du trôi qua theo dòng. Cả đám phối hợp bằng thị giác ngoại vi và cơ quan đường bên cảm nhận rung động nước, nên khi một bóng lớn lướt qua, toàn bộ đàn biến mất vào khe san hô gần như tức thì. Màu xanh lục ánh kim của chúng tán xạ ánh sáng khiến kẻ săn mồi khó khóa mục tiêu vào một cá thể riêng lẻ.',
    },
  },

  starfish: {
    id: 'starfish',
    name: 'Sea Star',
    viet: 'Sao biển',
    scientific: 'Linckia laevigata',
    length: 0.28,
    shape: 'star',
    colors: { body: 0x3f7fd6, fin: 0x2f5fa8, belly: 0x9fc4ee },
    homeBiome: 'coral_reef',
    spawnBiomes: ['coral_reef', 'kelp_forest'],
    depth: [-1, -40],
    schooling: false,
    speedFactor: 0.06,          // barely moves — clings to the floor
    benthic: true,              // sits ON the seafloor
    speedFactorNote: 'benthic',
    info: {
      habitat: 'Bám trên nền cát và đá quanh rạn san hô',
      fact: 'Có thể mọc lại cả một cánh tay đã mất; di chuyển bằng hàng trăm chân ống nhỏ.',
    },
    wiki: {
      weight: '~300 g',
      lifespan: '~10 năm',
      diet: 'Vi khuẩn, mùn hữu cơ, động vật thân mềm nhỏ',
      status: 'LC',
      depthRange: '0–60 m',
      records: 'Tái tạo được cả một cánh tay đã mất; ở vài loài, một cánh tay đứt rời có thể mọc thành cá thể mới.',
      body: 'Sao biển không có não và cũng không có máu — thay vào đó là hệ mạch nước bơm nước biển qua hàng trăm chân ống thủy lực dưới mỗi cánh tay, giúp chúng bò và bám chặt vào đá. Đầu mỗi cánh tay có một điểm mắt cảm nhận sáng tối. Nhiều loài sao biển ăn bằng cách lộn dạ dày ra ngoài miệng, tiêu hóa con mồi ngay tại chỗ rồi mới hút phần đã hóa lỏng trở vào.',
    },
  },

  crab: {
    id: 'crab',
    name: 'Reef Crab',
    viet: 'Cua đá rạn',
    scientific: 'Carpilius maculatus',
    length: 0.18,
    shape: 'crab',
    colors: { body: 0xb8341d, fin: 0xe0cdae, belly: 0xf0e3cd },
    homeBiome: 'coral_reef',
    spawnBiomes: ['coral_reef', 'kelp_forest'],
    depth: [-0.5, -35],
    schooling: false,
    speedFactor: 0.12,
    benthic: true,
    info: {
      habitat: 'Bò giữa các khe đá và chân rạn san hô',
      fact: 'Đi ngang vì khớp chân chỉ gập được sang hai bên — nhanh hơn nhiều so với đi thẳng.',
    },
    wiki: {
      weight: '~500 g',
      lifespan: '5–8 năm',
      diet: 'Động vật thân mềm, xác sinh vật, tảo',
      status: 'LC',
      depthRange: '0–30 m',
      records: 'Lột toàn bộ vỏ để lớn lên — cơ thể mềm và cực kỳ dễ tổn thương trong vài ngày sau đó.',
      body: 'Cua đá rạn đi ngang vì các khớp chân chỉ gập được sang hai bên, và ở tư thế đó chúng chạy nhanh hơn nhiều so với đi thẳng. Bộ vỏ kitin cứng không giãn nở được, nên để lớn lên chúng phải lột bỏ toàn bộ lớp vỏ cũ, hút nước phồng cơ thể lên rồi chờ vỏ mới cứng lại — giai đoạn chúng phải trốn kỹ trong khe đá. Đôi mắt kép trên cuống xoay được cho tầm nhìn gần như 360 độ.',
    },
  },
};

// Species you can PLAY as (menu + journal). Small ambient life is excluded.
export const SPECIES_ORDER = ['clownfish', 'sea_turtle', 'sea_snake', 'vaquita', 'bluefin_tuna', 'sunfish', 'great_white', 'dolphin', 'manta_ray', 'blue_whale', 'giant_squid', 'anglerfish'];

// Everything that can spawn in the world, including ambient life.
export const ALL_SPECIES = [...SPECIES_ORDER, 'reef_fry', 'starfish', 'crab'];

// IUCN Red List categories used in the encyclopedia.
export const IUCN = {
  LC: { label: 'Ít lo ngại', color: '#4caf7d' },
  NT: { label: 'Sắp bị đe dọa', color: '#9acd5a' },
  VU: { label: 'Sắp nguy cấp', color: '#e8c33f' },
  EN: { label: 'Nguy cấp', color: '#e8853f' },
  CR: { label: 'Cực kỳ nguy cấp', color: '#e05252' },
  DD: { label: 'Thiếu dữ liệu', color: '#8895a0' },
};

// Helper: which species can spawn in a given biome (for NPC population).
export function speciesForBiome(biome) {
  return ALL_SPECIES.filter((id) => SPECIES[id].spawnBiomes.includes(biome));
}
