const mongoose = require("mongoose");

const mesurmentProductAlterationSchema = new mongoose.Schema(
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
        MeasurmentType: {
          type: String,
        },
        MeasurmentVoiceRecording: {
          type: Array,
        },
        MeasurmentSizePreference: {
          type: String,
        },
        name: {
          type: String,
        },
        mesurments: [
          {
            mesurmentName: {
              type: String,
            },
            mesurmentNumber: {
              type: String,
            },
            mesurmentImage: {
              type: String,
            },
            customerOwnMeasurmentImage: {
              type: String,
            },
            size: {
              type: String,
            },
            alt1: {
              type: String,
            },
            alt2: {
              type: String,
            },
          },
        ],
      },
    ],
  },
  {
    timestamps: true,
  }
);

const MesurmentAlteration = mongoose.model(
  "MesurmentAlteration",
  mesurmentProductAlterationSchema
);

module.exports = MesurmentAlteration;
