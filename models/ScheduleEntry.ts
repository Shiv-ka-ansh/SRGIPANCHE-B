import mongoose, { Document, Schema } from 'mongoose';

export interface IScheduleEntry extends Document {
  day: string;
  date: string;
  time: string;
  eventName: string;
  category: string;
  venue: string;
  description: string;
  order: number;
}

const ScheduleEntrySchema: Schema = new Schema({
  day: { type: String, required: true, enum: ['Day 1', 'Day 2', 'Day 3', 'Day 4', 'Day 5'] },
  date: { type: String, required: true },
  time: { type: String, required: true },
  eventName: { type: String, required: true },
  category: { type: String, required: true },
  venue: { type: String, required: true },
  description: { type: String, required: false },
  order: { type: Number, required: true, default: 0 },
});

export default mongoose.model<IScheduleEntry>('ScheduleEntry', ScheduleEntrySchema);
