const mongoose = require("mongoose");

const customerProductSchema = new mongoose.Schema(
  {
    storeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Store ID is required"],
    },
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
    },
    product: [
      {
        gender: {
          type: String,
          // required: true,
        },
        name: {
          type: String,
          required: true,
        },
        productNumber: {
          type: String,
        },
        productQuantity: {
          type: String,
        },
        categories: [
          {
            name: {
              type: String,
              required: true,
            },
            styles: [
              {
                styleName: {
                  type: String,
                  // required: true,
                },
                styleType: {
                  type: String,
                  // required: true,
                },
                styleImage: {
                  type: String,
                  // required: true,
                },
              },
            ],
          },
        ],
        fabric_id: { type: mongoose.Schema.Types.ObjectId, ref: "Fabrics" },
        fabricImage: {
          type: String,
        },
        customerOwnFabricImage: {
          type: String,
        },
        fabricName: {
          type: String,
          // required: true,
        },
        fabricMaterial: {
          type: String,
        },
        fabricQuantity: {
          type: Number,
          required: true,
        },
        quantityType: {
          type: String,
          required: true,
        },
        fabDashNumber: {
          type: String,
        },
        customNumber: {
          type: String,
        },
        tilex: { type: Number },
        tiley: { type: Number },
        contrast: { type: Number },
        brightness: { type: Number },
        rotation: { type: Number },
        color: { type: String },
        glossy: { type: Boolean },
        product_image_url: [
          {
            name: { type: String, required: true },
            url: { type: String, required: true },
          },
        ],
        isHelper: { type: Boolean, default: false },
        isEmbroidery: { type: Boolean, default: false },
        isLovojFabric: { type: Boolean, default: false },
      },
    ],
  },
  {
    timestamps: true,
  }
);

const CustomerProduct = mongoose.model(
  "CustomerProduct",
  customerProductSchema
);

module.exports = CustomerProduct;
