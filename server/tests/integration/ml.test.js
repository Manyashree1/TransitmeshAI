import {test,describe,before,after} from 'node:test';
import assert from 'node:assert';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import {getMlEta,getMlModelInfo,getDemandPrediction} from '../../controllers/transitController.js';
import User from '../../models/User.js';
import Route from '../../models/Route.js';
import Stop from '../../models/Stop.js';
import Bus from '../../models/Bus.js';
import Trip from '../../models/Trip.js';
import TicketTransaction from '../../models/TicketTransaction.js';
import { connectTestDatabase, disconnectTestDatabase } from '../helpers/testDb.js';

const res = () => { const value={}; value.status=code=>{value.statusCode=code;return value}; value.json=data=>{value.statusCode||=200;value.data=data}; return value; };
const next = (err) => { if (err) throw err; };

describe('ML ETA and demand endpoints',()=>{
  let user,bus,route,trip,stops;
  before(async()=>{
    process.env.JWT_SECRET||='test_secret';
    await connectTestDatabase();
    await Promise.all([User.deleteMany({}),Bus.deleteMany({}),Route.deleteMany({}),Stop.deleteMany({}),Trip.deleteMany({}),TicketTransaction.deleteMany({})]);
    user=await User.create({name:'ML User',email:'ml@test.com',passwordHash:await bcrypt.hash('Transit123!',12),role:'PASSENGER'});
    route=await Route.create({routeNumber:'ML1',name:'ML Route',stops:[]});
    stops=await Stop.create(['S1','S2','S3','S4'].map((name,seq)=>({name,sequence:seq+1,routeId:route._id,latitude:12.3+seq*.01,longitude:76.6+seq*.01})));
    route.stops=stops.map(s=>s._id); await route.save();
    bus=await Bus.create({busNumber:'ML-01',routeId:route._id,capacity:40,status:'ACTIVE',tripStatus:'IN_PROGRESS',currentStop:stops[0]._id});
    trip=await Trip.create({busId:bus._id,routeId:route._id,driverId:user._id,currentStop:stops[0]._id,status:'ACTIVE'});
    await TicketTransaction.create({ticketId:'ml-ticket-001',busId:bus._id,tripId:trip._id,routeId:route._id,sourceStopId:stops[0]._id,destinationStopId:stops[2]._id,ticketType:'ADULT',passengerCount:3,issuedBy:user._id});
  });
  after(async()=>{
    await Promise.all([User.deleteMany({}),Bus.deleteMany({}),Route.deleteMany({}),Stop.deleteMany({}),Trip.deleteMany({}),TicketTransaction.deleteMany({})]);
    await disconnectTestDatabase();
  });
  const authReq=()=>({user,headers:{authorization:`Bearer ${jwt.sign({id:user._id,role:user.role},process.env.JWT_SECRET||'test_secret')}`},app:{get:()=>({emit:()=>{}})},query:{}});

  test('getMlModelInfo returns structure',async()=>{
    const response=res();
    await getMlModelInfo(authReq(),response,()=>{});
    assert.equal(response.statusCode,200);
    assert.ok('available' in response.data,'response should include available flag');
    assert.ok('metrics' in response.data,'response should include metrics');
  });

  test('getMlEta returns ml and fallback',async()=>{
    const response=res();
    const req=authReq();
    req.query={routeId:String(route._id),currentStopId:String(stops[0]._id),destinationStopId:String(stops[2]._id),delayMinutes:'0'};
    await getMlEta(req,response,next);
    assert.equal(response.statusCode,200,'should return 200');
    assert.ok('ml' in response.data,'should include ml prediction');
    assert.ok('fallback' in response.data,'should include fallback');
  });

  test('getDemandPrediction returns predictions for future stops',async()=>{
    const response=res();
    const req=authReq();
    req.query={routeId:String(route._id),currentStopId:String(stops[0]._id),busId:String(bus._id)};
    await getDemandPrediction(req,response,next);
    assert.equal(response.statusCode,200,'should return 200');
    assert.ok(Array.isArray(response.data.predictions),'should return array');
    assert.ok(response.data.predictions.length>0,'should have predictions for future stops');
  });
});
