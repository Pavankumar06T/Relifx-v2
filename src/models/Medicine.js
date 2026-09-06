import mongoose from "mongoose";

// HH:mm 24-hour time format, e.g. "08:00", "20:30"
const TIME_REGEX = /^([01]\d|2[0-3]):([0-5]\d)$/;

const ALLOWED_FREQUENCIES = [
  "once_daily",
  "twice_daily",
  "three_times_daily",
  "as_needed",
  "custom",
];

const medicineSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "userId is required"],
    },
    name: {
      type: String,
      required: [true, "Medicine name is required"],
      trim: true,
      minlength: [1, "Medicine name cannot be empty"],
      maxlength: [100, "Medicine name cannot exceed 100 characters"],
    },
    dosage: {
      type: String,
      required: [true, "Dosage is required"],
      trim: true,
      maxlength: [50, "Dosage cannot exceed 50 characters"],
    },
    frequency: {
      type: String,
      required: [true, "Frequency is required"],
      enum: {
        values: ALLOWED_FREQUENCIES,
        message: `frequency must be one of: ${ALLOWED_FREQUENCIES.join(", ")}`,
      },
    },
    scheduleTimes: {
      type: [String],
      default: [],
      validate: {
        validator: (arr) => Array.isArray(arr) && arr.every((t) => TIME_REGEX.test(t)),
        message: "scheduleTimes must contain valid HH:mm time strings",
      },
    },
    startDate: {
      type: Date,
      required: [true, "startDate is required"],
    },
    endDate: {
      type: Date,
      validate: {
        validator: function (value) {
          if (!value) return true;
          return value >= this.startDate;
        },
        message: "endDate cannot be before startDate",
      },
    },
    instructions: {
      type: String,
      trim: true,
      maxlength: [500, "instructions cannot exceed 500 characters"],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Speeds up "list my active medicines" / ownership lookups, which are the
// dominant access patterns for this collection.
medicineSchema.index({ userId: 1, isActive: 1 });

const Medicine = mongoose.model("Medicine", medicineSchema);

export default Medicine;
export { ALLOWED_FREQUENCIES, TIME_REGEX };
