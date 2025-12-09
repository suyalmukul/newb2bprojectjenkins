/*********************** */

const mongoose = require("mongoose");

const specialInstructionAltreationSchema = new mongoose.Schema(
  {
    stylish_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Stylish ID is required"],
    },
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
    },
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "orders",
    },
    products: [
      {
        productId: {
          type: mongoose.Schema.Types.ObjectId,
        },
        name: {
          type: String,
          // required: true,
        },
        specialInstructions: [
          {
            instructionPhoto: {
              type: Array,
            },
            instructionNotes: {
              type: Array,
            },
            instructionVoice: {
              type: Array,
            },
            instructionHandNotes: {
              type: Array,
            },
          },
        ],
      },
    ],
  },
  { timestamps: true }
);

const SpacialInstructionAltreation = mongoose.model(
  "SpacialInstructionAltreation",
  specialInstructionAltreationSchema
);

module.exports = SpacialInstructionAltreation;
