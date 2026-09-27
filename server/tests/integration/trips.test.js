import {test,describe,before,after} from 'node:test';
import assert from 'node:assert';
import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import Bus from '../../models/Bus.js';
import RouteModel from '../../models/Route.js';
import Stop from '../../models/Stop.js';
import Trip from '../../models/Trip.js';
import {startTrip,reachStop,reportDelay,endTrip} from '../../controllers/transitController.js';
import User from '../../models/User.js';
import { connectTestDatabase, disconnectTestDatabase } from '../helpers/testDb.js';

describe('trip lifecycle',()=>{
  let driver,passenger,bus,route,stops;
  before(async()=>{
    process.env.JWT_SECRET=process.env.JWT_SECRET||'test_secret';
    await connectTestDatabase();
    await Promise.all([User.deleteMany({}),Bus.deleteMany({}),RouteModel.deleteMany({}),Stop.deleteMany({}),Trip.deleteMany({})]);
    const hash=await bcrypt.hash('Transit123!',12);
    [driver,passenger]=await User.create([
      {name:'Test Driver',email:'driver@test.com',passwordHash:hash,role:'DRIVER'},
      {name:'Test Passenger',email:'pass@test.com',passwordHash:hash,role:'PASSENGER'}
    ]);
    route=await RouteModel.create({routeNumber:'99',name:'Test Route',stops:[]});
    stops=await Stop.create([
      {name:'A',sequence:1,routeId:route._id},
      {name:'B',sequence:2,routeId:route._id},
      {name:'C',sequence:3,routeId:route._id}
    ]);
    route.stops=stops.map(s=>s._id);
    await route.save();
    bus=await Bus.create({busNumber:'TEST-1',routeId:route._id,capacity:40,status:'ACTIVE',driverId:driver._id});
  });
  after(async()=>{
    await Promise.all([User.deleteMany({}),Bus.deleteMany({}),RouteModel.deleteMany({}),Stop.deleteMany({}),Trip.deleteMany({})]);
    await disconnectTestDatabase();
  });
  const authReq=(user)=>({
    user,
    headers:{authorization:`Bearer ${jwt.sign({id:user._id,role:user.role},process.env.JWT_SECRET||'test_secret')}`},
    app:{get:()=>({emit:()=>{}})}
  });
  const makeRes=()=>{
    const res={};
    res.status=c=>{res.statusCode=c;return res};
    res.json=d=>{res.statusCode=res.statusCode||200;res.data=d};
    return res;
  };
  test('driver can start assigned trip',async()=>{
    const req=authReq(driver);
    req.body={busId:bus._id};
    const res=makeRes();
    await startTrip(req,res,()=>{});
    assert.strictEqual(res.statusCode,201);
    assert.strictEqual(res.data.bus.status,'ACTIVE');
    assert.strictEqual(res.data.bus.tripStatus,'IN_PROGRESS');
  });
  test('unauthorized driver cannot start another driver\'s trip',async()=>{
    const otherDriver=await User.create({name:'Other',email:'other@test.com',passwordHash:await bcrypt.hash('pass',12),role:'DRIVER'});
    const req=authReq(otherDriver);
    req.body={busId:bus._id};
    const res=makeRes();
    let capturedErr;
    const next=(err)=>{capturedErr=err};
    await startTrip(req,res,next);
    assert.ok(capturedErr,'expected error to be passed to next');
    assert.strictEqual(capturedErr.statusCode,403);
    await User.deleteOne({_id:otherDriver._id});
  });
  test('reach next stop advances bus correctly',async()=>{
    const activeTrip=await Trip.findOne({busId:bus._id,status:'ACTIVE'});
    const req=authReq(driver);
    req.params={id:activeTrip._id};
    const res=makeRes();
    await reachStop(req,res,()=>{});
    assert.strictEqual(res.statusCode,200);
    assert.strictEqual(res.data.bus.currentStop.toString(),stops[1]._id.toString());
  });
  test('delay validation rejects out of range',async()=>{
    const activeTrip=await Trip.findOne({busId:bus._id,status:'ACTIVE'});
    const req=authReq(driver);
    req.params={id:activeTrip._id};
    req.body={delayMinutes:-1,reason:''};
    const res=makeRes();
    let capturedErr;
    const next=(err)=>{capturedErr=err};
    await reportDelay(req,res,next);
    assert.ok(capturedErr,'expected error to be passed to next');
    assert.strictEqual(capturedErr.statusCode,400);
  });
  test('end trip changes state correctly',async()=>{
    const activeTrip=await Trip.findOne({busId:bus._id,status:'ACTIVE'});
    const req=authReq(driver);
    req.params={id:activeTrip._id};
    const res=makeRes();
    await endTrip(req,res,()=>{});
    assert.strictEqual(res.statusCode,200);
    assert.strictEqual(res.data.trip.status,'ENDED');
    const updatedBus=await Bus.findById(bus._id);
    assert.strictEqual(updatedBus.status,'INACTIVE');
    assert.strictEqual(updatedBus.tripStatus,'COMPLETED');
  });
  test('reach stop on nonexistent trip returns 404',async()=>{
    const req=authReq(driver);
    req.params={id:new mongoose.Types.ObjectId()};
    const res=makeRes();
    let capturedErr;
    const next=(err)=>{capturedErr=err};
    await reachStop(req,res,next);
    assert.ok(capturedErr,'expected error to be passed to next');
    assert.strictEqual(capturedErr.statusCode,404);
  });
  test('end trip on already ended trip returns 404',async()=>{
    const activeTrip=await Trip.findOne({busId:bus._id,status:'ENDED'});
    const req=authReq(driver);
    req.params={id:activeTrip._id};
    const res=makeRes();
    let capturedErr;
    const next=(err)=>{capturedErr=err};
    await endTrip(req,res,next);
    assert.ok(capturedErr,'expected error to be passed to next');
    assert.strictEqual(capturedErr.statusCode,404);
  });
  test('reach stop on final stop returns error',async()=>{
    const finalTrip=await Trip.create({busId:bus._id,routeId:route._id,driverId:driver._id,currentStop:stops[2]._id});
    const req=authReq(driver);
    req.params={id:finalTrip._id};
    const res=makeRes();
    let capturedErr;
    const next=(err)=>{capturedErr=err};
    await reachStop(req,res,next);
    assert.ok(capturedErr,'expected error to be passed to next');
    assert.strictEqual(capturedErr.statusCode,400);
    await Trip.deleteOne({_id:finalTrip._id});
  });
});
