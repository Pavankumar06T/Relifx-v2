import mongoose from "mongoose";

const ALLOWED_STATUSES = ["taken", "missed", "skipped"];

const medicineDoseSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "userId is required"],
    },
    medicineId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Medicine",
      required: [true, "medicineId is required"],
    },
    scheduledAt: {
      type: Date,
      required: [true, "scheduledAt is required"],
    },
    takenAt: {
      type: Date,
    },
    status: {
      type: String,
      required: [true, "status is required"],
      enum: {
        values: ALLOWED_STATUSES,
        message: `status must be one of: ${ALLOWED_STATUSES.join(", ")}`,
      },
    },
    notes: {
      type: String,
      trim: true,
      maxlength: [500, "notes cannot exceed 500 characters"],
    },
  },
  {
    timestamps: true,
  }
);

// Supports "dose history for this medicine" and "all doses for this user"
// queries, both filtered/sorted by time.
medicineDoseSchema.index({ userId: 1, medicineId: 1, scheduledAt: -1 });
medicineDoseSchema.index({ userId: 1, scheduledAt: -1 });

const MedicineDose = mongoose.model("MedicineDose", medicineDoseSchema);

export default MedicineDose;
export { ALLOWED_STATUSES };
