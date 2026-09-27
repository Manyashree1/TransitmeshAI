import mongoose from 'mongoose';
const schema = new mongoose.Schema({
  routeNumber: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  stops: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Stop' }],
  geometry: { type: [[Number]], default: [] }, // [longitude, latitude] for map rendering
  active: { type: Boolean, default: true },
}, { timestamps: true });
export default mongoose.model('Route', schema);
