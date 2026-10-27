import mongoose from 'mongoose';
const { Schema } = mongoose;
export default mongoose.model('Message', new Schema({
  user: { type: Schema.Types.ObjectId, ref: 'User', index: true, required: true },
  role: { type: String, enum: ['user', 'assistant'] },
  text: String,
  outfits: [{ type: Schema.Types.ObjectId, ref: 'Outfit' }],
  meta: Schema.Types.Mixed,
}, { timestamps: true }));
