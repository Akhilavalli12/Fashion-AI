import mongoose from 'mongoose';
const { Schema } = mongoose;
const ItemSchema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: 'User', index: true, required: true },
  name: { type: String, required: true },
  category: { type: String, enum: ['Top', 'Bottom', 'Dress', 'Outerwear', 'Footwear', 'Accessory'], required: true },
  subcategory: String,
  dominantColor: { type: String, required: true },
  colorHex: String,
  secondaryColors: { type: [String], default: [] },
  pattern: { type: String, default: 'Solid' },
  style: { type: String, default: 'Casual' },
  formality: { type: String, enum: ['Casual', 'Smart Casual', 'Semi-Formal', 'Formal'], default: 'Casual' },
  season: { type: [String], default: [] },
  price: Number,
  imageUrl: String,           // path/URL only. Binary lives in the storage service, never in MongoDB.
  imageKey: String,
  fieldSources: { type: Schema.Types.Mixed, default: {} },   // per-field 'ai' | 'user' | 'seed'
  analysis: {
    source: { type: String, enum: ['ai', 'manual', 'seed'], default: 'manual' },
    method: String,
    confidence: Schema.Types.Mixed,       // {category, color, pattern} 0..1 from the model/heuristic
    confidenceLabel: Schema.Types.Mixed,  // {category:'likely', ...}
    detected: Schema.Types.Mixed,         // snapshot of what the AI said before user edits
    analyzedAt: Date,
  },
  timesWorn: { type: Number, default: 0 },
  lastWorn: Date,
  archived: { type: Boolean, default: false },
}, { timestamps: true, minimize: false });
export default mongoose.model('Item', ItemSchema);
