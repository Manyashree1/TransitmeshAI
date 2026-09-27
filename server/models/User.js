import mongoose from 'mongoose';
const schema=new mongoose.Schema({name:{type:String,required:true,trim:true},email:{type:String,required:true,unique:true,lowercase:true,trim:true},passwordHash:{type:String,required:true},role:{type:String,enum:['PASSENGER','DRIVER','ADMIN'],default:'PASSENGER'}},{timestamps:{createdAt:true,updatedAt:false}});
schema.set('toJSON',{transform:(_,ret)=>{delete ret.passwordHash;return ret;}});
export default mongoose.model('User',schema);
