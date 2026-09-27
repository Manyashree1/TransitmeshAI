import mongoose from 'mongoose';

const schema = new mongoose.Schema({
  ticketId: { type: String, required: true, unique: true, trim: true },
  transactionId: { type: String, unique: true, sparse: true, trim: true },
  busId: { type: mongoose.Schema.Types.ObjectId, ref: 'Bus', required: true },
  tripId: { type: mongoose.Schema.Types.ObjectId, ref: 'Trip', required: true },
  routeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Route', required: true },
  sourceStopId: { type: mongoose.Schema.Types.ObjectId, ref: 'Stop', required: true },
  destinationStopId: { type: mongoose.Schema.Types.ObjectId, ref: 'Stop', required: true },
  ticketType: { type: String, enum: ['ADULT', 'STUDENT', 'SENIOR'], default: 'ADULT' },
  passengerCount: { type: Number, required: true, min: 1, max: 10 },
  deviceId: { type: String, default: 'ETM-DEMO-01', trim: true },
  conductorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  issuedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  syncStatus: { type: String, enum: ['SYNCED', 'PENDING', 'QUEUED', 'PENDING_SYNC'], default: 'SYNCED' },
  locationSnapshot: {
    latitude: { type: Number, default: null },
    longitude: { type: Number, default: null },
    timestamp: { type: Date, default: null },
  },
  issuedAt: { type: Date, default: Date.now },
}, { timestamps: true });

schema.index({ transactionId: 1 }, { unique: true, sparse: true, name: 'ux_ticket_transaction_id' });
schema.index({ tripId: 1, issuedAt: -1 });
schema.index({ busId: 1, routeId: 1, issuedAt: -1 });

export default mongoose.model('TicketTransaction', schema);
