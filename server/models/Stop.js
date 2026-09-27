import mongoose from 'mongoose';
const schema = new mongoose.Schema({
  name: { type: String, required: true },
  sequence: { type: Number, required: true },
  routeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Route', required: true },
  // Legacy/imported records may lack coordinates; seeded/live map records always provide them.
  latitude: { type: Number, default: null, min: -90, max: 90 },
  longitude: { type: Number, default: null, min: -180, max: 180 },
}, { timestamps: true });
schema.index({ routeId: 1, sequence: 1 }, { unique: true });
export default mongoose.model('Stop', schema);
