const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const tokenSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: "user",
    },
    role: {
      type: String,
      enum: [
        "admin",
        "superadmin",
        "stylish",
        "manager",
        "sales",
        "cutter",
        "tailor",
        "stitching",
        "QC",
        "delivery",
        "helper",
        "embroidery",
      ],
    },
    device: {
      type: {
        type: String,
        enum: ["android", "iPhone", "web"],
      },
      token: { type: String },
      id: { type: String },
    },
    token: { type: String },
    isDeleted: { type: Boolean, default: false },
    blacklisted: { type: Boolean, default: false },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("NewToken", tokenSchema);
