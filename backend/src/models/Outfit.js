import mongoose from 'mongoose';
const { Schema } = mongoose;
const OutfitSchema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: 'User', index: true, required: true },
  items: [{ type: Schema.Types.ObjectId, ref: 'Item' }],
  occasion: String,
  weather: { tempC: Number, condition: String, source: String, city: String },
  score: Number,
  breakdown: Schema.Types.Mixed,
  reasons: [String],
  signature: { type: String, index: true },
  source: { type: String, enum: ['engine', 'stylist', 'seed'], default: 'engine' },
  prompt: String,
  status: {
    liked: { type: Boolean, default: false },
    disliked: { type: Boolean, default: false },
    saved: { type: Boolean, default: false },
  },
  wornDates: [Date],
}, { timestamps: true });
export default mongoose.model('Outfit', OutfitSchema);
