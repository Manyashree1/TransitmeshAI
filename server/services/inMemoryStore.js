import bcrypt from 'bcryptjs';

const DEMO_PASSWORD = 'Transit123!';

const NETWORK_DATA = [
  ['12', 'Central Station → Riverside', ['Central Station', 'Museum Square', 'City Hospital', 'Riverside Market', 'Riverside Terminal'], [12.305, 76.655]],
  ['24', 'Railway Station → Tech Park', ['Railway Station', 'Kuvempunagar', 'University Circle', 'Tech Park East', 'Tech Park Hub'], [12.312, 76.644]],
  ['31', 'Hebbal → Greenfield', ['Hebbal', 'Vijayanagar', 'Civic Centre', 'Greenfield School', 'Greenfield Depot'], [12.332, 76.622]],
  ['44', 'Chamundi Connector', ['Chamundi Gate', 'Lalitha Mahal', 'Nazarbad', 'City Bus Stand', 'Mysuru Central'], [12.288, 76.675]],
  ['52', 'Airport Express', ['Mysuru Airport', 'Belagola', 'Yelwala', 'Hebbal Market', 'Mysuru Central'], [12.232, 76.615]],
  ['67', 'Industrial Link', ['Metagalli', 'Bannimantap', 'Shivaji Road', 'Infosys Gate', 'University Circle'], [12.348, 76.635]],
];

class InMemoryStore {
  constructor() {
    this.users = [];
    this.routes = [];
    this.stops = [];
    this.buses = [];
    this.trips = [];
    this.crowdReports = [];
    this.tickets = [];
    this.initialized = false;
  }

  async init() {
    if (this.initialized) return;
    const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);

    // Initial users
    this.users = [
      { _id: '66a000000000000000000001', name: 'Priya Passenger', email: 'passenger@transitai.local', passwordHash, role: 'PASSENGER' },
      { _id: '66a000000000000000000002', name: 'Dev Driver', email: 'driver@transitai.local', passwordHash, role: 'DRIVER' },
      { _id: '66a000000000000000000003', name: 'Asha Admin', email: 'admin@transitai.local', passwordHash, role: 'ADMIN' },
    ];

    // Build routes & stops
    this.routes = [];
    this.stops = [];
    NETWORK_DATA.forEach(([routeNumber, name, stopNames, [baseLat, baseLng]], rIndex) => {
      const routeId = `66a00000000000000000010${rIndex + 1}`;
      const routeStops = stopNames.map((sName, sIndex) => {
        const stopId = `66a0000000000000000002${rIndex}${sIndex}`;
        const stop = {
          _id: stopId,
          name: sName,
          sequence: sIndex + 1,
          routeId,
          latitude: Number((baseLat + sIndex * 0.005).toFixed(6)),
          longitude: Number((baseLng + sIndex * 0.006).toFixed(6)),
        };
        this.stops.push(stop);
        return stop;
      });

      const geometry = routeStops.map(s => [s.longitude, s.latitude]);
      this.routes.push({
        _id: routeId,
        routeNumber,
        name,
        stops: routeStops,
        geometry,
        active: true,
      });
    });

    // Build buses and active trips
    this.buses = [];
    this.trips = [];
    for (let i = 0; i < 18; i++) {
      const route = this.routes[Math.floor(i / 3)];
      const ordinal = (i % 3) + 1;
      const stopIndex = i % (route.stops.length || 1);
      const active = i < 14;
      const busId = `66a0000000000000000003${String(i + 1).padStart(2, '0')}`;
      const currentStop = route.stops[stopIndex];

      const bus = {
        _id: busId,
        busNumber: `TM-${route.routeNumber}${String(ordinal).padStart(2, '0')}`,
        routeId: route,
        capacity: i % 2 ? 44 : 40,
        status: active ? 'ACTIVE' : 'INACTIVE',
        tripStatus: active ? 'IN_PROGRESS' : 'IDLE',
        currentStop,
        driverId: this.users[1]._id,
        location: {
          latitude: currentStop.latitude,
          longitude: currentStop.longitude,
          timestamp: new Date(),
          speedKph: active ? 22 : 0,
          source: 'SIMULATED',
        },
        segmentProgress: active ? 0.25 : 0,
        movementStatus: active ? 'MOVING' : 'OFFLINE',
      };
      this.buses.push(bus);

      if (active) {
        const tripId = `66a0000000000000000004${String(i + 1).padStart(2, '0')}`;
        this.trips.push({
          _id: tripId,
          busId,
          routeId: route._id,
          driverId: this.users[1]._id,
          currentStop: currentStop._id,
          status: 'ACTIVE',
          startedAt: new Date(Date.now() - 30 * 60 * 1000),
          delayMinutes: i % 4 === 0 ? 5 : i % 3 === 0 ? 2 : 0,
          delayReason: i % 4 === 0 ? 'Heavy Traffic' : '',
        });
      }
    }

    this.initialized = true;
  }

  findUserByEmail(email) {
    const e = (email || '').toLowerCase().trim();
    return this.users.find(u => u.email.toLowerCase() === e) || null;
  }

  findUserById(id) {
    return this.users.find(u => String(u._id) === String(id)) || null;
  }

  async createUser({ name, email, password, role = 'PASSENGER' }) {
    const passwordHash = await bcrypt.hash(password, 10);
    const user = {
      _id: `66a0000000000000000009${Date.now().toString().slice(-4)}`,
      name,
      email: email.toLowerCase().trim(),
      passwordHash,
      role,
    };
    this.users.push(user);
    return user;
  }

  getRoutes() {
    return this.routes;
  }

  getRouteById(id) {
    return this.routes.find(r => String(r._id) === String(id)) || null;
  }

  getBuses(routeId) {
    let buses = this.buses;
    if (routeId) {
      buses = buses.filter(b => String(b.routeId._id) === String(routeId) || String(b.routeId) === String(routeId));
    }
    return buses.map(bus => {
      const activeTrip = this.trips.find(t => String(t.busId) === String(bus._id) && t.status === 'ACTIVE');
      const delayMinutes = activeTrip ? activeTrip.delayMinutes : 0;
      const crowdLevels = ['LOW', 'MEDIUM', 'HIGH', 'FULL'];
      const crowdLevel = crowdLevels[Math.abs(bus.busNumber.charCodeAt(4)) % 4];
      return {
        ...bus,
        delayMinutes,
        crowd: {
          crowdLevel,
          confidence: 0.85,
          sampleCount: 12,
          availableSeats: crowdLevel === 'LOW' ? 24 : crowdLevel === 'MEDIUM' ? 12 : 2,
        },
        occupancy: {
          percentage: crowdLevel === 'LOW' ? 35 : crowdLevel === 'MEDIUM' ? 65 : 90,
          level: crowdLevel,
          source: 'ML_FUSED',
        },
      };
    });
  }

  getBusById(id) {
    const bus = this.buses.find(b => String(b._id) === String(id));
    if (!bus) return null;
    const activeTrip = this.trips.find(t => String(t.busId) === String(bus._id) && t.status === 'ACTIVE');
    return {
      bus,
      crowd: {
        crowdLevel: 'LOW',
        confidence: 0.9,
        sampleCount: 15,
        availableSeats: 22,
      },
      ticketing: {
        currentPassengers: 18,
        capacity: bus.capacity,
        occupancyRate: 0.45,
      },
      occupancy: {
        percentage: 45,
        level: 'LOW',
        source: 'ML_FUSED',
      },
    };
  }

  advanceBuses() {
    const updates = [];
    this.buses.forEach(bus => {
      if (bus.status !== 'ACTIVE' || bus.tripStatus !== 'IN_PROGRESS') return;
      const route = bus.routeId;
      if (!route || !route.stops || !route.stops.length) return;

      const stops = route.stops;
      let currentIndex = stops.findIndex(s => String(s._id) === String(bus.currentStop?._id || bus.currentStop));
      if (currentIndex === -1) currentIndex = 0;

      let nextIndex = (currentIndex + 1) % stops.length;
      let current = stops[currentIndex];
      let next = stops[nextIndex];

      let progress = (bus.segmentProgress || 0) + 0.1;
      if (progress >= 1) {
        progress = 0;
        bus.currentStop = next;
        current = next;
        next = stops[(nextIndex + 1) % stops.length];
      }

      bus.segmentProgress = Number(progress.toFixed(2));
      const lat = Number((current.latitude + (next.latitude - current.latitude) * progress).toFixed(6));
      const lng = Number((current.longitude + (next.longitude - current.longitude) * progress).toFixed(6));

      bus.location = {
        latitude: lat,
        longitude: lng,
        timestamp: new Date(),
        speedKph: 24,
        source: 'SIMULATED',
      };
      bus.movementStatus = 'MOVING';

      updates.push({
        busId: bus._id,
        routeId: route._id,
        location: bus.location,
        movementStatus: bus.movementStatus,
        currentStop: bus.currentStop,
        routeProgress: bus.segmentProgress,
        source: 'SIMULATED',
      });
    });
    return updates;
  }
}

export const inMemoryStore = new InMemoryStore();
await inMemoryStore.init();
