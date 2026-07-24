// species.js — The 5 playable + spawnable creatures for v1.
// Sizes are REAL SCALE (meters). Biome + depth define where each one lives.
// To add a species: copy a block, keep the same fields. That's the only edit needed.


export const SPECIES = {
  clownfish: {
    id: 'clownfish',
    name: 'Clownfish',
    viet: 'Cá hề',
    scientific: 'Amphiprion ocellaris',
    length: 0.09,                 // ~9 cm
    shape: 'fish',
    colors: { body: 0xff7a1a, band: 0xffffff, fin: 0x1c1c1c, belly: 0xffb060 },
    // Amphiprion ocellaris: deep body (42-48% of standard length), ROUNDED
    // caudal fin, three white bars thinly outlined in black.
    morph: {
      profile: 'deep', pattern: 'bars3',
      fork: -0.45, caudSpan: 0.076, caudLen: 0.076,
      finRim: 0xf4f6f5, iris: 0xd08a2a,
    },
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
    // Lamnid build: pointed conical snout, near-lunate tail, hard caudal keel,
    // and the famously abrupt, ragged line where slate back meets white belly.
    morph: {
      depth: 1.0, width: 1.0, snoutW: 0.86, snoutH: 0.94,
      d1: 1.0, d1z: 0.38, d2: 1.0, pectoral: 1.0,
      caudalLower: 0.82, keel: 0.18, interdorsal: false,
      edgeWobble: 0.26, edgeSharp: 0.10, edgeY: -0.16,
      eyeR: 0.0135, eyeIris: 0x1b2228, eyePupil: 0x06070a,
    },
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
    colors: { body: 0x63798c, fin: 0x33414f, belly: 0xe8eef0 },
    // Disc width runs ~2.2–2.4x disc length (compendium), so discLen 0.44 in
    // wingspan units puts the ratio at 2.27.
    morph: {
      disc: 'manta',
      discLen: 0.44,
      tailLen: 0.46,
    },
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


  // ================= MANGROVE FOREST =================
  mudskipper: {
    id: 'mudskipper', name: 'Giant Mudskipper',
    viet: 'Cá thòi lòi', scientific: 'Periophthalmodon schlosseri',
    length: 0.25, shape: 'fish',
    colors: { body: 0x6a5c3f, band: 0x3d3626, fin: 0x8a7a55, belly: 0xc9bb96 },
    // Periophthalmodon schlosseri: elongate and sub-cylindrical, NOT a deep
    // reef fish. Two dorsal fins, muscular arm-like pectorals it walks on, and
    // periscope eyes on top of the skull.
    morph: {
      profile: 'elongate', pattern: 'mud',
      fork: -0.35, caudSpan: 0.046, caudLen: 0.058, caudZ: 0.95,
      mouthY: -0.06, mouthTo: 0.09, mouthW: 0.0030,
      eyeT: 0.10, iris: 0x8a7238, gillV: 0.19,
      shadeLo: 0.25, shadeHi: 0.85,
    },
    homeBiome: 'mangrove', spawnBiomes: ['mangrove'],
    depth: [-0.3, -2], schooling: false, speedFactor: 0.5,
    info: {
      habitat: 'Bãi bùn triều trong rừng ngập mặn Ấn Độ Dương – Tây Thái Bình Dương',
      fact: 'Thở qua da và khoang miệng, sống trên cạn hơn 90% thời gian, "đi bộ" bằng vây ngực.',
    },
    wiki: {
      weight: '~60–120 g', lifespan: '~5 năm',
      diet: 'Cua nhỏ, động vật không xương, côn trùng, tảo',
      status: 'LC', depthRange: '0–2 m',
      records: 'Loài cá lưỡng cư thực thụ — đào hang trong bùn yếm khí và giữ túi khí bên trong.',
      body: 'Cá thòi lòi có đôi mắt lồi như kính tiềm vọng đặt trên đỉnh đầu, thụt xuống được để giữ ẩm, cho tầm nhìn gần như toàn cảnh cả trên lẫn dưới nước. Vây ngực khỏe như cánh tay giúp nó chống người bò và nhảy trên mặt bùn. Chúng cực kỳ lãnh thổ: dựng vây lưng như cánh buồm để ra oai với con đực khác. Hang của chúng thông xuống lớp bùn không có oxy, nên chúng ngậm khí xuống bơm vào hang cho trứng thở.',
    },
  },
  archerfish: {
    id: 'archerfish', name: 'Banded Archerfish',
    viet: 'Cá măng bắn nước', scientific: 'Toxotes jaculatrix',
    length: 0.22, shape: 'fish',
    colors: { body: 0xdfe4e6, band: 0x24262b, fin: 0xb9c2c6, belly: 0xf2f5f5 },
    // Toxotes jaculatrix: straight dorsal profile, pointed head, SUPERIOR
    // (upward-slanting) mouth, dorsal fin set far back, and 4-6 wedge-shaped
    // dark bars that are broad on the back and fade out before the belly.
    morph: {
      profile: 'archer', pattern: 'wedges',
      dorsalZ: 0.58, analZ: 0.66,
      dorsal: [[0, 0.052], [0.030, 0.046], [0.046, 0.006], [0.032, -0.040], [0.006, -0.052]],
      fork: 0.15, caudSpan: 0.080, caudLen: 0.082,
      mouthY: 0.16, mouthTo: 0.09, mouthW: 0.0016,
      eyeT: 0.075, eyeR: 0.030, eyeX: 0.86, eyeY: 0.50,
      iris: 0x3b4a52, gillV: 0.20,
    },
    homeBiome: 'mangrove', spawnBiomes: ['mangrove'],
    depth: [-0.2, -1.5], schooling: true, schoolSize: [4, 9], speedFactor: 0.7,
    info: {
      habitat: 'Cửa sông nước lợ và rừng ngập mặn, ngay dưới tán lá rủ',
      fact: 'Bắn tia nước chính xác 1–2 m để hạ côn trùng trên lá cây.',
    },
    wiki: {
      weight: '~150–250 g', lifespan: '~5–8 năm',
      diet: 'Côn trùng trên cạn, giun, tôm nhỏ',
      status: 'LC', depthRange: '0–1 m',
      records: 'Tự hiệu chỉnh được khúc xạ ánh sáng qua mặt nước — bài toán quang học mà cá phải giải mỗi lần bắn.',
      body: 'Thân cá măng dẹt bên và cao, lưng gần như thẳng, đầu nhọn với mắt to đặt trước cho thị giác hai mắt. Miệng hếch lên với hàm dưới nhô ra tạo thành rãnh; ép lưỡi lên vòm miệng, nó phụt ra một tia nước có đầu nặng đủ sức hất con mồi rơi xuống. Bốn đến sáu vệt đen hình nêm trên lưng kéo dài lên tận vây lưng, phá vỡ đường viền thân khi nhìn từ trên xuống.',
    },
  },
  mud_crab: {
    id: 'mud_crab', name: 'Giant Mud Crab',
    viet: 'Cua bùn', scientific: 'Scylla serrata',
    length: 0.20, shape: 'crab',
    // NOTE: procedural skin textures in this project are written straight from
    // THREE.Color components, which are LINEAR while ColorManagement is on, so
    // a declared hex lands in the texture much darker than it looks. These
    // values are chosen for how they READ once written, not on the swatch:
    // 0x2f4436 would arrive as (7,15,9) — effectively black.
    colors: { body: 0x7c9481, band: 0x47584c, fin: 0x8aa38d, belly: 0xd2d8bd },
    // Scylla serrata: broad smooth oval carapace with NINE even anterolateral
    // teeth per side, two spines on each wrist, dark green with polygonal
    // marbling over legs and claws, and the last leg pair flattened into
    // swimming paddles.
    morph: {
      shellPattern: 'marbled',
      teeth: 9, frontSpines: 0,
      paddle: true, carpalSpines: 2,
      gloss: 0.62, toothLen: 0.044, legBands: false,
      accentCol: 0x3d5540, handCol: 0x6f8a63, tipCol: 0x14100e,
    },
    homeBiome: 'mangrove', spawnBiomes: ['mangrove'],
    depth: [-0.3, -6], schooling: false, speedFactor: 0.14, benthic: true,
    info: {
      habitat: 'Bùn triều và cửa sông rừng ngập mặn Ấn Độ Dương – Tây Thái Bình Dương',
      fact: 'Càng đủ khỏe để cắn vỡ vỏ sò; một con cái mang tới một triệu trứng.',
    },
    wiki: {
      weight: '2–3 kg', lifespan: '3–4 năm',
      diet: 'Thân mềm, giáp xác, cá nhỏ, xác sinh vật',
      status: 'LC', depthRange: '0–6 m',
      records: 'Mai rộng tới 28 cm; chịu được độ mặn từ gần ngọt tới nước biển.',
      body: 'Mai cua bùn nhẵn, hình bầu dục rộng với chín răng đều nhau mỗi bên phía trước, màu xanh lục sẫm tới gần đen với hoa văn đa giác trên chân và càng. Đôi chân sau dẹt thành mái chèo giúp nó bơi chứ không chỉ bò. Chúng đào hang trong bùn khi thủy triều rút và cực kỳ ăn thịt lẫn nhau — đó là lý do gần như luôn sống đơn độc.',
    },
  },
  lemon_shark: {
    id: 'lemon_shark', name: 'Lemon Shark',
    viet: 'Cá mập chanh', scientific: 'Negaprion brevirostris',
    length: 2.4, shape: 'shark',
    colors: { body: 0xa9975c, band: 0xc4b47c, fin: 0x8e7e4c, belly: 0xeee7cf },
    // Negaprion brevirostris: short broad FLATTENED snout, and a second dorsal
    // fin nearly the size of the first — the one field mark that settles the
    // identification. Countershading grades softly because the animal hides
    // against sand rather than against open blue water.
    morph: {
      depth: 0.93, width: 0.96, snoutW: 1.32, snoutH: 0.78,
      d1: 0.86, d1z: 0.42, d2: 3.35, pectoral: 0.92,
      caudalLower: 0.55, keel: 0.04, interdorsal: false,
      edgeWobble: 0.15, edgeSharp: 0.34, edgeY: -0.24,
      eyeR: 0.0105, eyeIris: 0x6f6a3c, eyePupil: 0x0a0b0d,
      toothShow: 0.55,
    },
    homeBiome: 'mangrove', spawnBiomes: ['mangrove', 'seagrass'],
    depth: [-0.8, -90], schooling: true, schoolSize: [2, 5], speedFactor: 0.85,
    info: {
      habitat: 'Vườn ươm nước nông ven rừng ngập mặn; trưởng thành ra rạn san hô',
      fact: 'Cá mập cái quay về đúng vùng nước nơi chính nó ra đời để sinh con.',
    },
    wiki: {
      weight: '90–180 kg', lifespan: '25–30 năm',
      diet: 'Cá, giáp xác, cá đuối',
      status: 'VU', depthRange: '0–90 m',
      records: 'Cá mập con gắn bó chặt với vùng ươm, có thể sống nhiều năm trong vài trăm mét vuông.',
      body: 'Da vàng ô liu như quả chanh giúp cá mập chanh hòa lẫn vào nền cát và cỏ biển của vùng nước nông. Dấu hiệu nhận dạng chắc chắn nhất là hai vây lưng gần bằng nhau — hầu hết cá mập có vây lưng thứ hai nhỏ hơn hẳn. Mõm ngắn và bè. Chúng bơm nước qua miệng nên nằm yên dưới đáy được, và cá con sống thành nhóm gắn bó trong rễ đước để tránh kẻ săn mồi lớn hơn.',
    },
  },

  // ================= SEAGRASS MEADOW =================
  dugong: {
    id: 'dugong', name: 'Dugong',
    viet: 'Cá cúi', scientific: 'Dugong dugon',
    length: 2.9, shape: 'dugong',
    colors: { body: 0x8f8878, fin: 0x6f6959, belly: 0xc2bcab },
    homeBiome: 'seagrass', spawnBiomes: ['seagrass'],
    depth: [-1, -20], schooling: true, schoolSize: [2, 4], speedFactor: 0.55,
    info: {
      habitat: 'Thảm cỏ biển ven bờ ấm Ấn Độ Dương – Thái Bình Dương',
      fact: 'Động vật có vú biển ăn chay duy nhất; để lại vệt cày trên thảm cỏ khi gặm.',
    },
    wiki: {
      weight: '230–400 kg', lifespan: '50–70 năm',
      diet: 'Cỏ biển (Halophila, Halodule) — hoàn toàn ăn chay',
      status: 'VU', depthRange: '0–20 m',
      records: 'Nhiều khả năng là nguồn gốc của truyền thuyết nàng tiên cá.',
      body: 'Cá cúi có thân hình trụ chắc nịch, không có vây lưng và không có chi sau — chỉ còn đôi vây ngực hình mái chèo và một chiếc đuôi chẻ nằm ngang như cá heo, phân biệt nó với lợn biển đuôi tròn. Mõm to cụp xuống mang một đĩa gặm hình móng ngựa phủ lông cứng, dùng để nhổ cả gốc rễ cỏ biển. Con đực già mọc ngà. Chúng vỗ đuôi chậm rãi, đi khoảng 10 km/h.',
    },
  },
  seahorse: {
    id: 'seahorse', name: 'Spotted Seahorse',
    viet: 'Cá ngựa vằn đốm', scientific: 'Hippocampus kuda',
    length: 0.17, shape: 'seahorse',
    colors: { body: 0xd8a83c, band: 0x6b4a18, fin: 0xefd68a, belly: 0xf2e2ad },
    homeBiome: 'seagrass', spawnBiomes: ['seagrass', 'mangrove'],
    depth: [-0.5, -20], schooling: false, speedFactor: 0.08, benthic: false,
    info: {
      habitat: 'Thảm cỏ biển, rong và cửa sông Ấn Độ Dương – Thái Bình Dương',
      fact: 'Con đực mang thai — ấp trứng trong túi bụng và sinh ra khoảng 250 con.',
    },
    wiki: {
      weight: '8–9 g', lifespan: '1–4 năm',
      diet: 'Chân chèo, tôm nhỏ hút qua mõm ống',
      status: 'VU', depthRange: '0–68 m (thường 0–8 m)',
      records: 'Vây lưng rung khoảng 35 lần mỗi giây mà vẫn là một trong những loài cá bơi chậm nhất.',
      body: 'Cá ngựa đứng thẳng, thân bọc các vòng xương thay cho vảy, không có vây bụng và không có vây đuôi. Đầu gập vuông góc với thân như đầu ngựa, mõm kéo dài thành ống để hút mồi. Đuôi cuộn được, dùng để bám vào lá cỏ biển và neo mình lại giữa dòng. Chúng đổi màu để ngụy trang và khi ve vãn, thường sống thành cặp chung thủy.',
    },
  },
  sea_cucumber: {
    id: 'sea_cucumber', name: 'Sandfish Sea Cucumber',
    viet: 'Hải sâm cát', scientific: 'Holothuria scabra',
    length: 0.30, shape: 'cucumber',
    colors: { body: 0x4a423a, band: 0x2b2723, fin: 0x6b6055, belly: 0x9c917f },
    homeBiome: 'seagrass', spawnBiomes: ['seagrass', 'coral_reef'],
    depth: [-1, -20], schooling: false, speedFactor: 0.04, benthic: true,
    info: {
      habitat: 'Đáy cát bùn dưới thảm cỏ biển Ấn Độ Dương – Thái Bình Dương',
      fact: 'Nuốt cát để lấy mùn hữu cơ, đảo trộn đáy biển như giun đất dưới nước.',
    },
    wiki: {
      weight: '1–1,5 kg', lifespan: '~10 năm',
      diet: 'Mùn hữu cơ và vi khuẩn trong trầm tích',
      status: 'EN', depthRange: '0–20 m',
      records: 'Khi bị đe dọa có thể phun ruột ra ngoài rồi mọc lại toàn bộ.',
      body: 'Hải sâm cát có thân bầu dục, lưng cong và bụng dẹt tạo tiết diện nửa tròn, nằm áp sát nền. Miệng ở mặt dưới phía trước với khoảng 20 xúc tu ngắn dùng xúc cát vào. Mặt lưng nâu sẫm tới đen có vân xám ngang, mặt bụng nhạt hơn — ngụy trang hoàn hảo trên trầm tích. Ban ngày nó vùi một phần thân trong cát.',
    },
  },
  bluespotted_ray: {
    id: 'bluespotted_ray', name: 'Bluespotted Ribbontail Ray',
    viet: 'Cá đuối đốm xanh', scientific: 'Taeniura lymma',
    length: 0.35, shape: 'ray',
    colors: { body: 0xb08a3e, fin: 0x8c6c2e, belly: 0xf0ead6 },
    // Taeniura lymma is NOT a small manta: rounded oval disc, no cephalic fins,
    // mouth underneath, eyes bulging from the top of the disc, and a long thick
    // tail carrying two blue stripes, a deep ventral fin fold and the stings.
    // Disc width is ~0.8x disc LENGTH (the disc is elongated, not circular),
    // hence discLen 1.25 in disc-width units.
    morph: {
      disc: 'oval',
      discLen: 1.25,
      tailLen: 1.30,
    },
    homeBiome: 'seagrass', spawnBiomes: ['seagrass', 'coral_reef'],
    depth: [-0.5, -30], schooling: false, speedFactor: 0.55,
    info: {
      habitat: 'Bãi cát và cỏ biển quanh rạn san hô Ấn Độ Dương – Tây Thái Bình Dương',
      fact: 'Các đốm xanh neon là tín hiệu cảnh báo hai gai độc trên đuôi.',
    },
    wiki: {
      weight: '~5 kg', lifespan: '~15 năm',
      diet: 'Động vật đáy không xương, cá nhỏ',
      status: 'LC', depthRange: '0–30 m',
      records: 'Ban ngày nấp dưới gờ san hô, đêm ra bãi cát kiếm ăn theo thủy triều.',
      body: 'Đĩa thân hình bầu dục rộng tới 35 cm, dày hơn phần lớn cá đuối, mang những đốm xanh neon rực rỡ trên nền vàng nâu cùng hai sọc xanh chạy dọc chiếc đuôi mập. Mắt vàng lồi hẳn lên khỏi đĩa — khác với cá đuối ó có mắt chìm. Nó bơi bằng cách gợn sóng rìa đĩa và đào cát bằng luồng nước phun ra từ mang để moi mồi chôn bên dưới.',
    },
  },

  // ================= BLUE HOLE =================
  reef_shark: {
    id: 'reef_shark', name: 'Caribbean Reef Shark',
    viet: 'Cá mập rạn Caribe', scientific: 'Carcharhinus perezi',
    length: 2.2, shape: 'shark',
    colors: { body: 0x7d7f78, band: 0x94968d, fin: 0x63655f, belly: 0xeceee9 },
    // Carcharhinus perezi: robust requiem body, short rounded snout, plain
    // unmarked fins, and the low interdorsal ridge that separates it from its
    // congeners.
    morph: {
      depth: 0.99, width: 0.97, snoutW: 1.14, snoutH: 0.93,
      d1: 0.92, d1z: 0.40, d2: 1.35, pectoral: 0.98,
      caudalLower: 0.56, keel: 0.06, interdorsal: true,
      edgeWobble: 0.14, edgeSharp: 0.17, edgeY: -0.20,
      eyeR: 0.0118, eyeIris: 0x3f4a44, eyePupil: 0x08090b,
      toothShow: 0.6,
    },
    homeBiome: 'blue_hole', spawnBiomes: ['blue_hole', 'coral_reef'],
    depth: [-1, -65], schooling: true, schoolSize: [2, 6], speedFactor: 0.95,
    info: {
      habitat: 'Gờ đá và vành hố xanh vùng Tây Đại Tây Dương',
      fact: 'Nằm bất động dưới đáy được — hiếm thấy ở cá mập requiem.',
    },
    wiki: {
      weight: '~70 kg', lifespan: '~14–20 năm',
      diet: 'Cá rạn, cá đuối, mực',
      status: 'EN', depthRange: '1–65 m (ngoài thềm tới 436 m)',
      records: 'Loài cá mập thường gặp nhất trên rạn Caribe, tuần tra vành hố xanh nơi còn oxy.',
      body: 'Cá mập rạn Caribe có thân hình thoi chắc, mõm ngắn tròn và một gờ nhỏ chạy giữa hai vây lưng — đặc điểm phân biệt với các loài requiem khác. Vây không có hoa văn, xám nâu trên lưng chuyển trắng dưới bụng khá dứt khoát. Chúng tuần tra lớp nước còn oxy phía trên của hố xanh; bên dưới tầng hydro sulfua thì không sinh vật nào sống được.',
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
    // Chromis viridis: short and deep, no bars, and a distinctly FORKED caudal
    // fin — the quickest way to tell it from a clownfish at a distance.
    morph: {
      profile: 'deep', depth: 0.97, width: 0.94,
      fork: 1.05, caudSpan: 0.088, caudLen: 0.104,
      iris: 0x8fd4c0, shadeLo: 0.10, shadeHi: 0.80,
    },
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
    colors: { body: 0xefd3bd, band: 0x8d2440, fin: 0xe0cdae, belly: 0xf4ead9 },
    // Carpilius maculatus, the "seven-eleven crab": a very smooth, glossy,
    // convex carapace on a cream-to-pink ground carrying nine large violet-
    // maroon blotches in 2-3-4 rows, a smooth margin with no large teeth, and
    // only four small spines between the eyes. No swimming paddles.
    morph: {
      shellPattern: 'spots711',
      teeth: 0, frontSpines: 4,
      paddle: false, carpalSpines: 0,
      gloss: 0.34, grooveDepth: 0.32,
      accentCol: 0xc9705a, handCol: 0xf0e3cd, bandCol: 0x8f6742,
    },
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
export const SPECIES_ORDER = ['clownfish', 'seahorse', 'sea_turtle', 'sea_snake', 'archerfish', 'vaquita', 'bluespotted_ray', 'reef_shark', 'bluefin_tuna', 'lemon_shark', 'dugong', 'sunfish', 'great_white', 'dolphin', 'manta_ray', 'blue_whale', 'giant_squid', 'anglerfish'];

// Everything that can spawn in the world, including ambient life.
export const ALL_SPECIES = [...SPECIES_ORDER, 'reef_fry', 'starfish', 'crab',
  'mudskipper', 'mud_crab', 'sea_cucumber'];

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
