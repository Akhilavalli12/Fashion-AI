import mongoose from 'mongoose';
const { Schema } = mongoose;
const UserSchema = new Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash: { type: String, required: true },
  isDemo: { type: Boolean, default: false },
  demoLabel: String,
  profile: {
    styles: { type: [String], default: [] },
    colorGroups: { type: [String], default: [] },      // neutral | pastel | bold | earth
    favoriteColors: { type: [String], default: [] },
    dislikedColors: { type: [String], default: [] },
    formalityPref: { type: String, default: 'Smart Casual' },
    patternTolerance: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
    city: { type: String, default: 'Hyderabad' },
    bio: String,
  },
  // Learned preference weights, updated by the feedback loop (range -3..3)
  prefs: {
    type: Schema.Types.Mixed,
    default: () => ({ colors: {}, groups: {}, styles: {}, patterns: {}, counts: { likes: 0, dislikes: 0, saves: 0, worn: 0 } }),
  },
}, { timestamps: true, minimize: false });
export default mongoose.model('User', UserSchema);
