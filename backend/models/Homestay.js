import mongoose from "mongoose";

const homestaySchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    location: {
      type: String,
      required: true,
      trim: true,
    },
    area: {
      type: String,
      required: true,
      trim: true,
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    discount: {
      type: {
        type: String,
        enum: ["none", "manual", "scheduled"],
        default: "none",
      },
      percent: {
        type: Number,
        default: 0,
        min: 0,
        max: 95,
      },
      isActive: {
        type: Boolean,
        default: false,
      },
      schedules: {
        type: [
          {
            startAt: {
              type: Date,
              required: true,
            },
            endAt: {
              type: Date,
              required: true,
            },
            percent: {
              type: Number,
              required: true,
              min: 0,
              max: 95,
            },
          },
        ],
        default: [],
      },
    },
    rating: {
      type: Number,
      default: 4.8,
      min: 0,
      max: 5,
    },
    reviews: {
      type: Number,
      default: 0,
      min: 0,
    },
    guests: {
      type: Number,
      required: true,
      min: 1,
    },
    beds: {
      type: Number,
      required: true,
      min: 1,
    },
    baths: {
      type: Number,
      required: true,
      min: 1,
    },
    totalRooms: {
      type: Number,
      default: 1,
      min: 1,
    },
    availableRooms: {
      type: Number,
      default: 1,
      min: 0,
    },
    image: {
      type: String,
      required: true,
    },
    gallery: {
      type: [String],
      default: [],
    },
    amenities: {
      type: [String],
      default: [],
    },
    host: {
      type: String,
      default: "You",
      trim: true,
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false,
    },
    type: {
      type: String,
      enum: ["Rent", "Sale"],
      default: "Rent",
    },
    description: {
      type: String,
      required: true,
    },
    isHidden: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true },
);

export const Homestay = mongoose.model("Homestay", homestaySchema);
