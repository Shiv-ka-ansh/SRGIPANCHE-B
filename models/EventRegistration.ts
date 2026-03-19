import mongoose, { Document, Schema } from 'mongoose';

export interface IEventRegistration extends Document {
  studentId: mongoose.Types.ObjectId;
  studentName: string;
  rollNo: string;
  events: {
    category: string;
    eventName: string;
    amount: number;
    subEvent?: string;
  }[];
  totalAmount: number;
  processedBy: mongoose.Types.ObjectId;
  processedAt: Date;
  emailSent: boolean;
}

const EventRegistrationSchema: Schema = new Schema({
  studentId: { type: Schema.Types.ObjectId, ref: 'Student', required: true },
  studentName: { type: String, required: true },
  rollNo: { type: String, required: true },
  events: [
    {
      category: { type: String, required: true },
      eventName: { type: String, required: true },
      amount: { type: Number, required: true },
      subEvent: { type: String },
    },
  ],
  totalAmount: { type: Number, required: true },
  processedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  processedAt: { type: Date, default: Date.now },
  emailSent: { type: Boolean, default: false },
});

export default mongoose.model<IEventRegistration>('EventRegistration', EventRegistrationSchema);
