import mongoose from 'mongoose';
const schema=new mongoose.Schema({busId:{type:mongoose.Schema.Types.ObjectId,ref:'Bus',required:true},routeId:{type:mongoose.Schema.Types.ObjectId,ref:'Route',required:true},stopId:{type:mongoose.Schema.Types.ObjectId,ref:'Stop'},userId:{type:mongoose.Schema.Types.ObjectId,ref:'User',required:true},crowdLevel:{type:String,enum:['LOW','MEDIUM','HIGH','FULL'],required:true},availableSeats:{type:Number,required:true,min:0},timestamp:{type:Date,default:Date.now},confidence:{type:Number,default:0,min:0,max:1}},{timestamps:false});
schema.index({busId:1,routeId:1,timestamp:-1});schema.index({userId:1,busId:1,timestamp:-1});
export default mongoose.model('CrowdReport',schema);
