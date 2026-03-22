import mongoose, { Document, Schema } from 'mongoose';

export interface IStudent extends Document {
  fullName: string;
  rollNo: string;
  course: string;
  branch: string;
  section: string;
  year: string;
  mobileNo: string;
  email: string;
  tokenHash: string;
  token: string; // Storing plaintext for O(1) lookup
  tokenUsed: boolean;
  registeredAt: Date;
  status: string;
  emailSent: boolean;
}

const StudentSchema: Schema = new Schema({
  fullName: { type: String, required: true },
  rollNo: { type: String, required: true, unique: true, uppercase: true, trim: true },
  course: { type: String, required: true },
  branch: { type: String, required: true, uppercase: true, trim: true },
  section: { type: String, required: true, uppercase: true, trim: true },
  year: { type: String, required: true, uppercase: true },
  mobileNo: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  tokenHash: { type: String, required: true },
  token: { type: String, required: true, index: true, unique: true },
  tokenUsed: { type: Boolean, default: false },
  registeredAt: { type: Date, default: Date.now },
  status: { type: String, enum: ['registered', 'processed'], default: 'registered' },
  emailSent: { type: Boolean, default: false },
  
});

export default mongoose.model<IStudent>('Student', StudentSchema);
