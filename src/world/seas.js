// seas.js — Named waters, so the HUD and the map can tell you where you are.
//
// A real Earth is not much use if every place is just "biển". These are rough
// bounding boxes, tested in order: the enclosed seas first, then the open
// basins as a fallback. Boxes are deliberately generous — this answers "which
// sea am I in", not "where exactly is the boundary", which is disputed for
// most of them anyway.

const SEAS = [
  // --- enclosed and marginal seas, most specific first ---
  { vi: 'Biển Đỏ',            en: 'Red Sea',            lon: [32, 44],    lat: [12, 30] },
  { vi: 'Vịnh Ba Tư',         en: 'Persian Gulf',       lon: [47, 57],    lat: [23, 31] },
  { vi: 'Biển Đen',           en: 'Black Sea',          lon: [27, 42],    lat: [40, 48] },
  { vi: 'Địa Trung Hải',      en: 'Mediterranean',      lon: [-6, 37],    lat: [30, 46] },
  { vi: 'Biển Baltic',        en: 'Baltic Sea',         lon: [9, 30],     lat: [53, 66] },
  { vi: 'Biển Bắc',           en: 'North Sea',          lon: [-5, 9],     lat: [51, 62] },
  { vi: 'Vịnh Mexico',        en: 'Gulf of Mexico',     lon: [-98, -80],  lat: [18, 31] },
  { vi: 'Biển Caribe',        en: 'Caribbean Sea',      lon: [-89, -59],  lat: [8, 23] },
  { vi: 'Vịnh California',    en: 'Gulf of California', lon: [-115, -107], lat: [22, 32] },
  { vi: 'Biển Đông',          en: 'South China Sea',    lon: [104, 122],  lat: [1, 24] },
  { vi: 'Biển Hoa Đông',      en: 'East China Sea',     lon: [118, 131],  lat: [24, 34] },
  { vi: 'Biển Nhật Bản',      en: 'Sea of Japan',       lon: [127, 142],  lat: [34, 52] },
  { vi: 'Biển Okhotsk',       en: 'Sea of Okhotsk',     lon: [135, 163],  lat: [44, 62] },
  { vi: 'Biển Bering',        en: 'Bering Sea',         lon: [162, 180],  lat: [51, 66] },
  { vi: 'Biển Bering',        en: 'Bering Sea',         lon: [-180, -157], lat: [51, 66] },
  { vi: 'Biển Ả Rập',         en: 'Arabian Sea',        lon: [51, 76],    lat: [4, 26] },
  { vi: 'Vịnh Bengal',        en: 'Bay of Bengal',      lon: [77, 96],    lat: [4, 23] },
  { vi: 'Biển Andaman',       en: 'Andaman Sea',        lon: [92, 100],   lat: [5, 17] },
  { vi: 'Biển Java',          en: 'Java Sea',           lon: [105, 118],  lat: [-8, 0] },
  { vi: 'Biển Banda',         en: 'Banda Sea',          lon: [120, 135],  lat: [-9, -2] },
  { vi: 'Biển San Hô',        en: 'Coral Sea',          lon: [144, 168],  lat: [-30, -9] },
  { vi: 'Biển Tasman',        en: 'Tasman Sea',         lon: [147, 176],  lat: [-48, -30] },
  { vi: 'Biển Bắc Cực',       en: 'Arctic Ocean',       lon: [-180, 180], lat: [66, 90] },
  { vi: 'Nam Đại Dương',      en: 'Southern Ocean',     lon: [-180, 180], lat: [-90, -55] },
  // --- open basins ---
  { vi: 'Bắc Đại Tây Dương',  en: 'North Atlantic',     lon: [-80, 10],   lat: [5, 66] },
  { vi: 'Nam Đại Tây Dương',  en: 'South Atlantic',     lon: [-70, 20],   lat: [-55, 5] },
  { vi: 'Ấn Độ Dương',        en: 'Indian Ocean',       lon: [20, 120],   lat: [-55, 30] },
  { vi: 'Bắc Thái Bình Dương', en: 'North Pacific',     lon: [120, 180],  lat: [0, 66] },
  { vi: 'Bắc Thái Bình Dương', en: 'North Pacific',     lon: [-180, -75], lat: [0, 66] },
  { vi: 'Nam Thái Bình Dương', en: 'South Pacific',     lon: [120, 180],  lat: [-55, 0] },
  { vi: 'Nam Thái Bình Dương', en: 'South Pacific',     lon: [-180, -68], lat: [-55, 0] },
];

/** Which named water is this position in? Never returns null. */
export function seaAt(lon, lat) {
  for (const s of SEAS) {
    if (lon >= s.lon[0] && lon <= s.lon[1] && lat >= s.lat[0] && lat <= s.lat[1]) return s;
  }
  return { vi: 'Biển khơi', en: 'Open ocean' };
}

export { SEAS };
