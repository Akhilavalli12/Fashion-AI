import { PALETTE } from './colors.js';
export const SUBCATEGORIES = {
  Top: ['T-Shirt', 'Shirt', 'Polo', 'Blouse', 'Sweater', 'Hoodie', 'Sweatshirt', 'Kurta', 'Kurti', 'Henley'],
  Bottom: ['Jeans', 'Trousers', 'Chinos', 'Cargo Pants', 'Track Pants', 'Shorts', 'Skirt', 'Palazzo', 'Churidar'],
  Dress: ['Dress', 'Saree', 'Gown', 'Jumpsuit'],
  Outerwear: ['Jacket', 'Blazer', 'Coat', 'Cardigan', 'Shawl', 'Bomber'],
  Footwear: ['Sneakers', 'Boots', 'Loafers', 'Heels', 'Flats', 'Sandals', 'Juttis'],
  Accessory: ['Watch', 'Bag', 'Hat', 'Belt', 'Necklace', 'Scarf'],
};
export const META = {
  categories: Object.keys(SUBCATEGORIES),
  subcategories: SUBCATEGORIES,
  colors: Object.entries(PALETTE).map(([name, hex]) => ({ name, hex })),
  patterns: ['Solid', 'Striped', 'Checked', 'Floral', 'Printed', 'Colorblock', 'Embroidered'],
  styles: ['Minimal', 'Casual', 'Streetwear', 'Trendy', 'Elegant', 'Traditional', 'Classic', 'Sporty'],
  formalities: ['Casual', 'Smart Casual', 'Semi-Formal', 'Formal'],
  seasons: ['Spring', 'Summer', 'Autumn', 'Winter'],
  colorGroups: ['neutral', 'pastel', 'bold', 'earth'],
};
