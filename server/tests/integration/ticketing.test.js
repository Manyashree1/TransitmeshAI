import { test, describe, before, after, afterEach } from 'node:test';
import assert from 'node:assert';
import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import { issueTicket } from '../../controllers/transitController.js';
import User from '../../models/User.js'; import Route from '../../models/Route.js'; import Stop from '../../models/Stop.js'; import Bus from '../../models/Bus.js'; import Trip from '../../models/Trip.js'; import TicketTransaction from '../../models/TicketTransaction.js';
import { predictDemand } from '../../services/demandService.js';
import { recommendations } from '../../services/recommendationService.js';
import { connectTestDatabase, disconnectTestDatabase } from '../helpers/testDb.js';

const res = () => { const value={}; value.status=code=>{value.statusCode=code;return value}; value.json=data=>{value.statusCode||=200;value.data=data}; return value; };
describe('ETM ticketing and occupancy', () => {
  let driver, bus, trip, stops;
  before(async () => {
    await connectTestDatabase();
    await Promise.all([TicketTransaction.deleteMany({}), Trip.deleteMany({}), Bus.deleteMany({}), Stop.deleteMany({}), Route.deleteMany({}), User.deleteMany({})]);
    driver=await User.create({name:'ETM Driver',email:'etm@test.com',passwordHash:await bcrypt.hash('Transit123!',12),role:'DRIVER'});
    const route=await Route.create({routeNumber:'ETM',name:'ETM route',stops:[]}); stops=await Stop.create(['Start','Mid','End'].map((name,sequence)=>({name,sequence:sequence+1,routeId:route._id,latitude:12.3+sequence*.01,longitude:76.6+sequence*.01})));
    route.stops=stops.map(stop=>stop._id); await route.save(); bus=await Bus.create({busNumber:'ETM-01',routeId:route._id,capacity:5,status:'ACTIVE',tripStatus:'IN_PROGRESS',driverId:driver._id,currentStop:stops[0]._id}); trip=await Trip.create({busId:bus._id,routeId:route._id,driverId:driver._id,currentStop:stops[0]._id});
  });
  after(async()=>{await Promise.all([TicketTransaction.deleteMany({}),Trip.deleteMany({}),Bus.deleteMany({}),Stop.deleteMany({}),Route.deleteMany({}),User.deleteMany({})]);await disconnectTestDatabase();});
  afterEach(async()=>TicketTransaction.deleteMany({}));
  const req = body => ({user:driver,body,app:{get:()=>({emit:()=>{}})}});
  test('issues a source-to-destination ticket and estimates onboard passengers',async()=>{const response=res();await issueTicket(req({tripId:trip._id,sourceStopId:stops[0]._id,destinationStopId:stops[2]._id,ticketType:'ADULT',passengerCount:3}),response,()=>{});assert.equal(response.statusCode,201);assert.equal(response.data.occupancy.estimatedOnboard,3);assert.equal(response.data.occupancy.availableSeats,2);});
  test('rejects a ticket whose source is not the current stop',async()=>{let error;await issueTicket(req({tripId:trip._id,sourceStopId:stops[1]._id,destinationStopId:stops[2]._id,passengerCount:1}),res(),e=>error=e);assert.equal(error.statusCode,400);});
  test('rejects a ticket that would exceed capacity',async()=>{await TicketTransaction.create({ticketId:'capacity-protect-01',busId:bus._id,tripId:trip._id,routeId:bus.routeId,sourceStopId:stops[0]._id,destinationStopId:stops[2]._id,passengerCount:5,issuedBy:driver._id});let error;await issueTicket(req({tripId:trip._id,sourceStopId:stops[0]._id,destinationStopId:stops[2]._id,passengerCount:1}),res(),e=>error=e);assert.equal(error.statusCode,422);});
  test('deduplicates repeated ETM transaction IDs without double counting onboard passengers',async()=>{
    const txId='offline-dup-001';
    const response=res();
    await issueTicket(req({tripId:trip._id,sourceStopId:stops[0]._id,destinationStopId:stops[2]._id,passengerCount:2,transactionId:txId}),response,()=>{});
    const duplicateResponse=res();
    await issueTicket(req({tripId:trip._id,sourceStopId:stops[0]._id,destinationStopId:stops[2]._id,passengerCount:2,transactionId:txId}),duplicateResponse,()=>{});
    assert.equal(await TicketTransaction.countDocuments({ tripId: trip._id }), 1);
    assert.equal(duplicateResponse.statusCode, 200);
    assert.equal(duplicateResponse.data.duplicate, true);
  });
  test('keeps one MongoDB record for the same ETM transaction and updates occupancy/demand exactly once',async()=>{
    await TicketTransaction.deleteMany({});
    const txId='etm-idempotent-race-001';
    const payload={tripId:trip._id,sourceStopId:stops[0]._id,destinationStopId:stops[2]._id,passengerCount:2,transactionId:txId,ticketType:'ADULT'};
    const indexes = await TicketTransaction.collection.indexes();
    const hasUniqueTransactionIndex = indexes.some(index => index.key && index.key.transactionId === 1 && index.unique === true);
    assert.ok(hasUniqueTransactionIndex, 'expected MongoDB unique index on transactionId');

    const firstResponse = res();
    await issueTicket(req(payload), firstResponse, () => {});
    assert.equal(firstResponse.statusCode, 201);

    const retryResponse = res();
    await issueTicket(req(payload), retryResponse, () => {});
    assert.equal(retryResponse.statusCode, 200);
    assert.equal(retryResponse.data.duplicate, true);

    let duplicateKeyError = null;
    try {
      await TicketTransaction.create({
        ticketId: `${txId}-duplicate`,
        transactionId: txId,
        busId: bus._id,
        tripId: trip._id,
        routeId: bus.routeId,
        sourceStopId: stops[0]._id,
        destinationStopId: stops[2]._id,
        passengerCount: 2,
        issuedBy: driver._id,
      });
    } catch (error) {
      duplicateKeyError = error;
    }

    assert.ok(duplicateKeyError, 'expected MongoDB duplicate-key error on repeated transactionId');
    assert.equal(await TicketTransaction.countDocuments({ transactionId: txId }), 1);
    assert.equal(await TicketTransaction.countDocuments({ tripId: trip._id }), 1);

    const occupancy = await (await import('../../services/occupancyService.js')).occupancyEstimate({ tripId: trip._id, stops, currentStop: stops[0]._id, capacity: 10 });
    assert.equal(occupancy.estimatedOnboard, 2);

    const demand = await predictDemand({ routeId: bus.routeId, currentStopId: stops[0]._id, capacity: 10 });
    assert.ok(demand.some(item => item.predictedBoardings >= 1 || item.predictedOccupancy >= 2));
  });

  test('ETM events feed the downstream intelligence pipeline',async()=>{
    await TicketTransaction.deleteMany({});
    const response=res();
    await issueTicket(req({tripId:trip._id,sourceStopId:stops[0]._id,destinationStopId:stops[2]._id,ticketType:'ADULT',passengerCount:3,transactionId:'pipeline-001'}),response,()=>{});
    assert.equal(response.statusCode,201);

    const occupancy = await (await import('../../services/occupancyService.js')).occupancyEstimate({ tripId: trip._id, stops, currentStop: trip.currentStop, capacity: 10 });
    assert.equal(occupancy.estimatedOnboard, 3);

    const demand = await predictDemand({ routeId: bus.routeId, currentStopId: stops[0]._id, capacity: 10 });
    assert.ok(demand.length > 0);
    assert.ok(demand.some(item => item.predictedOccupancy >= 2 || item.predictedBoardings >= 1));

    const set = await recommendations(bus.routeId, stops[2]._id);
    assert.ok(set.recommendation || set.buses.length > 0);
    assert.ok(set.buses.some(choice => choice.crowd && choice.crowd.confidence >= 0));
  });

  test('tracks source and destination progression across stops',async()=>{
    await TicketTransaction.deleteMany({});
    await TicketTransaction.create({
      ticketId: 'A', busId: bus._id, tripId: trip._id, routeId: bus.routeId,
      sourceStopId: stops[0]._id, destinationStopId: stops[2]._id, passengerCount: 4, issuedBy: driver._id,
    });
    await TicketTransaction.create({
      ticketId: 'B', busId: bus._id, tripId: trip._id, routeId: bus.routeId,
      sourceStopId: stops[1]._id, destinationStopId: stops[2]._id, passengerCount: 3, issuedBy: driver._id,
    });
    await Bus.findByIdAndUpdate(bus._id, { capacity: 10 });
    const atCentral = await (await import('../../services/occupancyService.js')).occupancyEstimate({ tripId: trip._id, stops, currentStop: stops[0]._id, capacity: 10 });
    const atMuseum = await (await import('../../services/occupancyService.js')).occupancyEstimate({ tripId: trip._id, stops, currentStop: stops[1]._id, capacity: 10 });
    const atHospital = await (await import('../../services/occupancyService.js')).occupancyEstimate({ tripId: trip._id, stops, currentStop: stops[2]._id, capacity: 10 });
    assert.equal(atCentral.estimatedOnboard, 4);
    assert.equal(atMuseum.estimatedOnboard, 7);
    assert.equal(atHospital.estimatedOnboard, 3);
  });
});
