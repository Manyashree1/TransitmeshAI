import 'dotenv/config';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import Route from '../models/Route.js';
import Stop from '../models/Stop.js';
import Bus from '../models/Bus.js';
import Trip from '../models/Trip.js';
import CrowdReport from '../models/CrowdReport.js';
import TicketTransaction from '../models/TicketTransaction.js';

const NETWORK = [
  ['12','Central Station → Riverside',['Central Station','Museum Square','City Hospital','Riverside Market','Riverside Terminal'],[12.305,76.655]],
  ['24','Railway Station → Tech Park',['Railway Station','Kuvempunagar','University Circle','Tech Park East','Tech Park Hub'],[12.312,76.644]],
  ['31','Hebbal → Greenfield',['Hebbal','Vijayanagar','Civic Centre','Greenfield School','Greenfield Depot'],[12.332,76.622]],
  ['44','Chamundi Connector',['Chamundi Gate','Lalitha Mahal','Nazarbad','City Bus Stand','Mysuru Central'],[12.288,76.675]],
  ['52','Airport Express',['Mysuru Airport','Belagola','Yelwala','Hebbal Market','Mysuru Central'],[12.232,76.615]],
  ['67','Industrial Link',['Metagalli','Bannimantap','Shivaji Road','Infosys Gate','University Circle'],[12.348,76.635]],
];
const password = 'Transit123!';

try {
  await mongoose.connect(process.env.MONGODB_URI);
  await Promise.all([
    TicketTransaction.deleteMany({}), CrowdReport.deleteMany({}),
    Trip.deleteMany({}), Bus.deleteMany({}),
    Stop.deleteMany({}), Route.deleteMany({}), User.deleteMany({}),
  ]);

  const passwordHash = await bcrypt.hash(password, 12);
  const passengers = await User.create(Array.from({ length: 15 }, (_, i) => ({
    name: i === 0 ? 'Priya Passenger' : `Passenger ${i + 1}`,
    email: i === 0 ? 'passenger@transitai.local' : `passenger${i + 1}@transitai.local`,
    passwordHash, role: 'PASSENGER',
  })));
  const drivers = await User.create(Array.from({ length: 7 }, (_, i) => ({
    name: i === 0 ? 'Dev Driver' : `Driver ${i + 1}`,
    email: i === 0 ? 'driver@transitai.local' : `driver${i + 1}@transitai.local`,
    passwordHash, role: 'DRIVER',
  })));
  const admins = await User.create(['Asha Admin', 'Naveen Admin'].map((name, i) => ({
    name, email: i === 0 ? 'admin@transitai.local' : `admin${i + 1}@transitai.local`,
    passwordHash, role: 'ADMIN',
  })));

  const routes = [];
  for (const [routeNumber, name, stopNames, [baseLat, baseLng]] of NETWORK) {
    const route = await Route.create({ routeNumber, name, stops: [] });
    const stops = await Stop.create(stopNames.map((name, index) => ({
      name, sequence: index + 1, routeId: route._id,
      latitude: Number((baseLat + index * 0.005).toFixed(6)),
      longitude: Number((baseLng + index * 0.006).toFixed(6)),
    })));
    route.stops = stops.map(s => s._id);
    route.geometry = stops.map(s => [s.longitude, s.latitude]);
    await route.save();
    routes.push({ route, stops });
  }

  const buses = [];
  for (let i = 0; i < 18; i++) {
    const routeInfo = routes[Math.floor(i / 3)];
    const ordinal = (i % 3) + 1;
    const stopIndex = i % 3;
    const active = i < 14;
    buses.push({
      busNumber: `TM-${routeInfo.route.routeNumber}${String(ordinal).padStart(2, '0')}`,
      routeId: routeInfo.route._id,
      capacity: i % 2 ? 44 : 40,
      status: active ? 'ACTIVE' : 'INACTIVE',
      tripStatus: active ? 'IN_PROGRESS' : 'IDLE',
      currentStop: routeInfo.stops[stopIndex]._id,
      driverId: drivers[i % drivers.length]._id,
      location: {
        latitude: routeInfo.stops[stopIndex].latitude,
        longitude: routeInfo.stops[stopIndex].longitude,
        timestamp: new Date(), speedKph: active ? 18 : 0, source: 'SIMULATED',
      },
      segmentProgress: active ? 0.15 : 0,
      movementStatus: active ? 'MOVING' : 'OFFLINE',
    });
  }
  const createdBuses = await Bus.create(buses);

  const activeTrips = [];
  const now = Date.now();

  for (let i = 0; i < 14; i++) {
    const bus = createdBuses[i];
    const routeInfo = routes[i % routes.length];
    activeTrips.push({
      busId: bus._id,
      routeId: bus.routeId,
      driverId: bus.driverId,
      currentStop: bus.currentStop,
      delayMinutes: i % 5 === 0 ? 5 : i % 3 === 0 ? 2 : 0,
      delayReason: i % 5 === 0 ? 'Traffic' : i % 3 === 0 ? 'Passenger boarding' : '',
    });
  }
  const trips = await Trip.create(activeTrips);

  const endedTrips = [];
  for (let i = 14; i < 18; i++) {
    const bus = createdBuses[i];
    const routeInfo = routes[i % routes.length];
    const lastStop = routeInfo.stops[routeInfo.stops.length - 1];
    endedTrips.push({
      busId: bus._id,
      routeId: bus.routeId,
      driverId: bus.driverId,
      currentStop: lastStop._id,
      status: 'ENDED',
      startedAt: new Date(now - (i + 1) * 45 * 60000),
      endedAt: new Date(now - i * 40 * 60000),
      delayMinutes: i % 4 === 0 ? 8 : i % 3 === 0 ? 3 : 0,
    });
  }
  const endedTripRecords = await Trip.create(endedTrips);

  const tickets = [];
  const reports = [];

  for (let i = 0; i < 14; i++) {
    const trip = trips[i];
    const bus = createdBuses[i];
    const info = routes[Math.floor(i / 3)];
    for (let j = 0; j < 9; j++) {
      const source = Math.min(j % 3, 2);
      const destination = Math.min(4, source + 1 + (j % 2));
      tickets.push({
        ticketId: `ETM-${bus.busNumber}-${trip._id.toString().slice(-6)}-${j + 1}`,
        transactionId: `TX-${bus.busNumber}-${Date.now()}-${j + 1}`,
        busId: bus._id,
        tripId: trip._id,
        routeId: info.route._id,
        sourceStopId: info.stops[source]._id,
        destinationStopId: info.stops[destination]._id,
        ticketType: ['ADULT', 'STUDENT', 'SENIOR'][j % 3],
        passengerCount: 1 + (j % 3),
        issuedBy: bus.driverId,
        issuedAt: new Date(now - (j + 1) * 6 * 60000),
      });
    }
    for (let j = 0; j < 3; j++) {
      reports.push({
        busId: bus._id,
        routeId: info.route._id,
        stopId: bus.currentStop,
        userId: passengers[(i + j) % passengers.length]._id,
        crowdLevel: ['LOW', 'MEDIUM', 'HIGH'][i % 3],
        availableSeats: Math.max(3, bus.capacity - (12 + i % 4 * 7)),
        timestamp: new Date(now - (j + 2) * 7 * 60000),
        confidence: 0.65,
      });
    }
  }

  for (let i = 0; i < endedTrips.length; i++) {
    const trip = endedTripRecords[i];
    const bus = createdBuses[i + 14];
    const info = routes[(i + 14) % routes.length];
    const numTickets = 6 + (i % 4);
    for (let j = 0; j < numTickets; j++) {
      const source = Math.min(j % 3, 2);
      const destination = Math.min(4, source + 1 + (j % 2));
      tickets.push({
        ticketId: `ETM-${bus.busNumber}-${trip._id.toString().slice(-6)}-${j + 1}`,
        transactionId: `TX-${bus.busNumber}-${Date.now()}-${i}-${j + 1}`,
        busId: bus._id,
        tripId: trip._id,
        routeId: info.route._id,
        sourceStopId: info.stops[source]._id,
        destinationStopId: info.stops[destination]._id,
        ticketType: ['ADULT', 'STUDENT', 'SENIOR'][j % 3],
        passengerCount: 1 + (j % 3),
        issuedBy: bus.driverId,
        issuedAt: new Date(now - (i + 1) * 45 * 60000 - j * 5 * 60000),
      });
    }
  }

  await TicketTransaction.create(tickets);
  await CrowdReport.create(reports);
  console.log(`Seed complete: ${routes.length} routes, ${createdBuses.length} buses, ${trips.length} active trips, ${endedTripRecords.length} ended trips, ${tickets.length} ETM transactions. Demo password: ${password}`);
} catch (error) {
  console.error('Seed failed:', error);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
