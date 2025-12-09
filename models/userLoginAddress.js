const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
require("mongoose-type-email");

const UserLoginAddressSchema = mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    ip: { type: String },
    country: { type: String },
    countryCode: { type: String },
    region: { type: String },
    regionName: { type: String },
    city: { type: String },
    // zip: { type: String },
    // lat: { type: Number },
    // lon: { type: Number },
    timezone: { type: String },
    isp: { type: String },
    org: { type: String },
    as: { type: String },
    query: { type: String }, // same as ip
    location: {
      type: {
        type: String,
        enum: ["Point"],
        default: "Point",
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        required: true,
        default: [0, 0],
      },
    },
  },
  { timestamps: true }
);

UserLoginAddressSchema.index({ location: "2dsphere" });

module.exports = mongoose.model("UserLoginAddress", UserLoginAddressSchema);
