import mongoose, { Document, Schema } from "mongoose";

export interface IAdminPermissions {
  canViewDashboard: boolean;
  canManageEvents: boolean;
  canManageRegistrations: boolean;
  canExportReports: boolean;
  canManageAdmins: boolean;
  canViewFinance: boolean;
  assignedCategories?: mongoose.Types.ObjectId[];
}

export interface IUser extends Document {
  name: string;
  email: string;
  passwordHash: string;
  role: "admin" | "superadmin" | "moderator";
  allowedTabs: string[];
  permissions: IAdminPermissions;
  isActive: boolean;
  createdAt: Date;
  createdBy?: mongoose.Types.ObjectId;
}

const UserSchema: Schema = new Schema({
  name: { type: String, required: true },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  },
  passwordHash: { type: String, required: true },
  role: {
    type: String,
    enum: ["admin", "superadmin", "moderator"],
    required: true,
    default: "admin",
  },
  allowedTabs: {
    type: [String],
    default: [
      "overview",
      "single",
      "group",
      "students",
      "events",
      "registrations",
      "schedule",
      "users",
    ],
  },
  permissions: {
    canViewDashboard: { type: Boolean, default: true },
    canManageEvents: { type: Boolean, default: false },
    canManageRegistrations: { type: Boolean, default: false },
    canExportReports: { type: Boolean, default: false },
    canManageAdmins: { type: Boolean, default: false },
    canViewFinance: { type: Boolean, default: false },
    assignedCategories: [{ type: Schema.Types.ObjectId, ref: "Category" }],
  },
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
  createdBy: { type: Schema.Types.ObjectId, ref: "User" },
});

export default mongoose.model<IUser>("User", UserSchema);
