import mongoose from 'mongoose';
const schema = new mongoose.Schema({
  busNumber: { type: String, required: true, unique: true }, routeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Route', required: true }, capacity: { type: Number, required: true, min: 1 },
  status: { type: String, enum: ['ACTIVE','INACTIVE','MAINTENANCE'], default: 'INACTIVE' }, currentStop: { type: mongoose.Schema.Types.ObjectId, ref: 'Stop', default: null },
  tripStatus: { type: String, enum: ['IDLE','IN_PROGRESS','COMPLETED'], default: 'IDLE' }, driverId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  location: { latitude: { type: Number, default: null }, longitude: { type: Number, default: null }, timestamp: { type: Date, default: null }, speedKph: { type: Number, default: 0 }, source: { type: String, enum: ['SIMULATED','GPS'], default: 'SIMULATED' } },
  segmentProgress: { type: Number, default: 0, min: 0, max: 1 }, movementStatus: { type: String, enum: ['STOPPED','MOVING','OFFLINE'], default: 'OFFLINE' },
}, { timestamps: true });
schema.index({routeId:1,status:1});export default mongoose.model('Bus',schema);
