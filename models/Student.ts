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
}

const StudentSchema: Schema = new Schema({
  fullName: { type: String, required: true },
  rollNo: { type: String, required: true, unique: true, uppercase: true, trim: true },
  course: { type: String, required: true },
  branch: { type: String, required: true },
  section: { type: String, required: true },
  year: { type: String, required: true },
  mobileNo: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  tokenHash: { type: String, required: true },
  token: { type: String, required: true, index: true },
  tokenUsed: { type: Boolean, default: false },
  registeredAt: { type: Date, default: Date.now },
  status: { type: String, enum: ['registered', 'processed'], default: 'registered' },
});

export default mongoose.model<IStudent>('Student', StudentSchema);
