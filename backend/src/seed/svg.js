// Generates simple garment illustrations for seeded demo items (real files in /uploads/seed).
import { PALETTE } from '../services/colors.js';
const LONG = 'M60 20 L85 12 Q100 28 115 12 L140 20 L196 150 L170 160 L148 90 L148 224 L52 224 L52 90 L30 160 L4 150 Z';
const SHAPES = {
  'T-Shirt': 'M60 20 L85 12 Q100 28 115 12 L140 20 L190 60 L168 88 L148 74 L148 224 L52 224 L52 74 L32 88 L10 60 Z',
  Shirt: LONG, Polo: LONG, Blouse: LONG, Henley: LONG, Sweater: LONG, Hoodie: LONG, Sweatshirt: LONG, Cardigan: LONG,
  Kurta: 'M60 20 L85 12 Q100 28 115 12 L140 20 L190 70 L170 90 L148 70 L152 236 L48 236 L52 70 L30 90 L10 70 Z',
  Kurti: 'M60 20 L85 12 Q100 28 115 12 L140 20 L190 70 L170 90 L148 70 L156 200 L44 200 L52 70 L30 90 L10 70 Z',
  Jeans: 'M50 10 L150 10 L160 232 L108 232 L100 80 L92 232 L40 232 Z',
  Trousers: 'M50 10 L150 10 L156 232 L106 232 L100 80 L94 232 L44 232 Z',
  Chinos: 'M50 10 L150 10 L156 232 L106 232 L100 80 L94 232 L44 232 Z',
  'Cargo Pants': 'M46 10 L154 10 L166 232 L108 232 L100 80 L92 232 L34 232 Z',
  'Track Pants': 'M50 10 L150 10 L152 232 L108 232 L100 80 L92 232 L48 232 Z',
  Palazzo: 'M50 10 L150 10 L190 232 L104 232 L100 70 L96 232 L10 232 Z',
  Churidar: 'M50 10 L150 10 L146 232 L108 232 L100 80 L92 232 L54 232 Z',
  Shorts: 'M46 10 L154 10 L162 120 L108 120 L100 60 L92 120 L38 120 Z',
  Skirt: 'M60 20 L140 20 L184 200 L16 200 Z',
  Dress: 'M75 10 L125 10 L130 70 L172 226 L28 226 L70 70 Z', Gown: 'M75 10 L125 10 L130 70 L180 236 L20 236 L70 70 Z',
  Saree: 'M70 10 L130 10 L150 60 L190 236 L10 236 L50 60 Z', Jumpsuit: 'M70 10 L130 10 L135 90 L158 236 L106 236 L100 120 L94 236 L42 236 L65 90 Z',
  Jacket: LONG, Blazer: LONG, Coat: 'M60 14 L85 8 Q100 26 115 8 L140 14 L196 160 L170 170 L148 96 L152 236 L48 236 L52 96 L30 170 L4 160 Z', Bomber: LONG, Shawl: 'M20 40 Q100 0 180 40 L180 200 Q100 170 20 200 Z',
  Sneakers: 'M14 150 Q14 112 56 112 L100 142 L168 150 Q190 156 190 188 L14 188 Z',
  Boots: 'M50 40 L100 40 L102 130 L170 150 Q190 158 190 190 L40 190 Q40 120 50 40 Z',
  Loafers: 'M14 150 Q14 120 56 120 L100 146 L168 154 Q190 160 190 186 L14 186 Z', Heels: 'M20 80 L60 80 L110 150 L180 160 L186 176 L100 176 L90 196 L80 196 L84 170 L20 120 Z',
  Flats: 'M14 150 Q14 120 56 120 L100 146 L168 154 Q190 160 190 186 L14 186 Z', Sandals: 'M14 160 L190 160 L190 186 L14 186 Z', Juttis: 'M14 150 Q30 110 70 120 L100 146 L168 154 Q190 150 196 190 L14 186 Z',
  Watch: 'M80 20 L120 20 L120 70 L140 100 L120 130 L120 180 L80 180 L80 130 L60 100 L80 70 Z', Bag: 'M40 80 L160 80 L172 200 L28 200 Z M70 80 Q70 30 100 30 Q130 30 130 80',
  Hat: 'M40 120 Q40 50 100 50 Q160 50 160 120 L196 130 L196 148 L4 148 L4 130 Z', Belt: 'M10 90 L190 90 L190 120 L10 120 Z', Necklace: 'M30 40 Q100 220 170 40 L160 40 Q100 180 40 40 Z', Scarf: 'M70 10 L130 10 L130 120 L160 230 L110 230 L100 140 L90 230 L40 230 L70 120 Z',
};
const defs = (id, pattern, c1, c2) => ({
  Solid: '', Striped: `<pattern id="${id}" width="14" height="14" patternUnits="userSpaceOnUse"><rect width="14" height="14" fill="${c1}"/><rect width="5" height="14" fill="${c2}"/></pattern>`,
  Checked: `<pattern id="${id}" width="20" height="20" patternUnits="userSpaceOnUse"><rect width="20" height="20" fill="${c1}"/><rect width="10" height="10" fill="${c2}"/><rect x="10" y="10" width="10" height="10" fill="${c2}"/></pattern>`,
  Floral: `<pattern id="${id}" width="26" height="26" patternUnits="userSpaceOnUse"><rect width="26" height="26" fill="${c1}"/><circle cx="8" cy="8" r="4" fill="${c2}"/><circle cx="20" cy="19" r="3" fill="${c2}"/></pattern>`,
  Printed: `<pattern id="${id}" width="30" height="30" patternUnits="userSpaceOnUse"><rect width="30" height="30" fill="${c1}"/><path d="M5 25 L15 5 L25 25 Z" fill="${c2}"/></pattern>`,
  Embroidered: `<pattern id="${id}" width="22" height="22" patternUnits="userSpaceOnUse"><rect width="22" height="22" fill="${c1}"/><path d="M11 3 L14 11 L11 19 L8 11 Z" fill="${c2}"/></pattern>`,
  Colorblock: `<pattern id="${id}" width="200" height="240" patternUnits="userSpaceOnUse"><rect width="200" height="240" fill="${c1}"/><rect width="200" height="110" fill="${c2}"/></pattern>`,
}[pattern] ?? '');
export function garmentSvg({ subcategory, category, color, pattern = 'Solid', secondary }, idx) {
  const c1 = PALETTE[color] || '#999', c2 = PALETTE[secondary] || (color === 'White' || color === 'Cream' ? PALETTE.Navy : PALETTE.White);
  const id = `p${idx}`;
  const fill = pattern === 'Solid' || !defs(id, pattern, c1, c2) ? c1 : `url(#${id})`;
  const d = SHAPES[subcategory] || SHAPES.Shirt;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 240"><defs>${defs(id, pattern, c1, c2)}</defs><rect width="200" height="240" fill="#f3f1ee"/><path d="${d}" fill="${fill}" stroke="rgba(0,0,0,.35)" stroke-width="2" stroke-linejoin="round" fill-rule="evenodd"/></svg>`;
}
