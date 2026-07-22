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
    depth: [-1, -18],            // reef flats & slopes
    schooling: true,
    schoolSize: [6, 14],
    speedFactor: 0.5,            // small fish -> slower absolute cruise
    info: {
      habitat: 'Rạn san hô nhiệt đới Ấn Độ Dương – Thái Bình Dương',
      fact: 'Sống cộng sinh với hải quỳ; miễn nhiễm với xúc tu độc nhờ lớp nhầy bảo vệ.',
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
    depth: [-1, -45],
    schooling: false,
    speedFactor: 0.7,
    info: {
      habitat: 'Vùng ven bờ nhiệt đới & cận nhiệt đới, gần rạn san hô và thảm cỏ biển',
      fact: 'Có thể lặn hơn 1 giờ; định hướng di cư hàng nghìn km bằng từ trường Trái Đất.',
    },
  },

  bluefin_tuna: {
    id: 'bluefin_tuna',
    name: 'Bluefin Tuna',
    viet: 'Cá ngừ vây xanh',
    scientific: 'Thunnus thynnus',
    length: 2.2,
    shape: 'fish',
    colors: { body: 0x2f4a6b, band: 0x8fb7d6, fin: 0xd6b23a, belly: 0xe8eef2 },
    homeBiome: 'open_ocean',
    spawnBiomes: ['open_ocean'],
    depth: [-5, -250],
    schooling: true,
    schoolSize: [5, 12],
    speedFactor: 1.35,          // fast pelagic swimmer
    info: {
      habitat: 'Biển khơi (pelagic) ôn đới & cận nhiệt đới, di cư xuyên đại dương',
      fact: 'Một trong những loài cá nhanh nhất; thân nhiệt cao hơn nước xung quanh (nội nhiệt).',
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
    depth: [-3, -260],
    schooling: false,
    speedFactor: 1.0,
    info: {
      habitat: 'Nước ven bờ ôn đới, thềm lục địa, gần đàn hải cẩu',
      fact: 'Cảm nhận điện trường sinh học của con mồi qua cơ quan Ampullae of Lorenzini.',
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
    depth: [-6, -200],
    schooling: false,
    speedFactor: 0.9,
    info: {
      habitat: 'Biển khơi toàn cầu; kiếm ăn ở vùng cực giàu nhuyễn thể (krill)',
      fact: 'Động vật lớn nhất từng tồn tại; tiếng kêu tần số thấp truyền xa hàng trăm km.',
    },
  },

  dolphin: {
    id: 'dolphin',
    name: 'Bottlenose Dolphin',
    viet: 'Cá heo mũi chai',
    scientific: 'Tursiops truncatus',
    length: 2.4,
    shape: 'whale',             // cetacean: horizontal fluke, up-down stroke
    colors: { body: 0x7f97a6, band: 0xa9bcc7, fin: 0x5f7482, belly: 0xdfe8ec },
    homeBiome: 'open_ocean',
    spawnBiomes: ['open_ocean', 'coral_reef'],
    depth: [-2, -80],
    schooling: true,
    schoolSize: [4, 9],
    speedFactor: 1.3,
    info: {
      habitat: 'Vùng ven bờ ấm & biển khơi ôn đới trên toàn thế giới',
      fact: 'Định vị con mồi bằng sóng siêu âm (echolocation); mỗi cá thể có "tên gọi" huýt sáo riêng.',
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
    depth: [-3, -60],
    schooling: false,
    speedFactor: 0.8,
    info: {
      habitat: 'Biển nhiệt đới & cận nhiệt đới, quanh rạn san hô và vùng nước trồi',
      fact: 'Sải "cánh" tới 7 m; lọc sinh vật phù du khi bơi và có não lớn nhất trong các loài cá.',
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
    depth: [-350, -650],
    schooling: false,
    speedFactor: 0.4,
    info: {
      habitat: 'Tầng nửa đêm của biển sâu, nơi ánh sáng mặt trời không chạm tới',
      fact: 'Chiếc "cần câu" phát sáng nhờ vi khuẩn phát quang cộng sinh, dụ con mồi trong bóng tối tuyệt đối.',
    },
  },
};

export const SPECIES_ORDER = ['clownfish', 'sea_turtle', 'bluefin_tuna', 'great_white', 'dolphin', 'manta_ray', 'blue_whale', 'anglerfish'];

// Helper: which species can spawn in a given biome (for NPC population).
export function speciesForBiome(biome) {
  return SPECIES_ORDER.filter((id) => SPECIES[id].spawnBiomes.includes(biome));
}
