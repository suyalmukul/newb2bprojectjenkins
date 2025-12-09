const mongoose = require("mongoose");

const productAlterationSchema = new mongoose.Schema(
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
    product: [
      {
        name: {
          type: String,
          // required: true,
        },

        productNumber: {
          type: String,
        },

        categories: [
          {
            name: {
              type: String,
              // required: true,
            },

            alteration: [
              {
                alterationFrontImage: {
                  type: Array,
                },
                alterationBackImage: {
                  type: Array,
                },
              },
            ],
          },
        ],
      },
    ],
  },
  {
    timestamps: true,
  }
);

const ProductAlteration = mongoose.model(
  "productAlteration",
  productAlterationSchema
);

module.exports = ProductAlteration;
