import mongoose, { Document, Schema } from 'mongoose';

export interface IEvent extends Document {
  category: string;
  name: string;
  amount: number;
  subEvents?: string[];
  color: string;
}

const EventSchema: Schema = new Schema({
  category: { type: String, required: true },
  name: { type: String, required: true },
  amount: { type: Number, required: true },
  subEvents: [{ type: String }],
  color: { type: String, required: true },
});

export default mongoose.model<IEvent>('Event', EventSchema);
