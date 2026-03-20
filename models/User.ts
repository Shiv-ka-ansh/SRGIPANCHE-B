import mongoose, { Document, Schema } from 'mongoose';

export interface IUser extends Document {
  name: string;
  email: string;
  passwordHash: string;
  role: 'admin' | 'superadmin';
  allowedTabs: string[];
  createdAt: Date;
  createdBy?: mongoose.Types.ObjectId;
}

const UserSchema: Schema = new Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash: { type: String, required: true },
  role: { type: String, enum: ['admin', 'superadmin'], required: true, default: 'admin' },
  allowedTabs: { type: [String], default: ['overview', 'students', 'events', 'registrations', 'schedule', 'users'] },
  createdAt: { type: Date, default: Date.now },
  createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
});

export default mongoose.model<IUser>('User', UserSchema);
