const { default: mongoose } = require("mongoose");
// require("./AdminProductForUser.model");

const ProductSchema = new mongoose.Schema(
  {
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
      // required: true,
    },
    quantityType: {
      type: String,
      // required: true,
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
    price: { type: Number, required: true },
    // price: { type: Number },
    category: { type: String, required: true },
    // category: { type: String },
    gender: { type: String, enum: ["men", "women", "unisex"], required: true },
    // gender: { type: String, enum: ["men", "women", "unisex"] },
    type: { type: String, enum: ["customize", "ready-made"], required: true },
    // type: { type: String, enum: ["customize", "ready-made"] },
    store_id: { type: mongoose.Schema.Types.ObjectId, ref: "stores" },
    category_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "AdminProductForUser",
    },
    product_image_url: [
      {
        name: { type: String, required: true },
        url: { type: String, required: true },
        // name: { type: String },
        // url: { type: String },
      },
    ],
    fabric_quantity: { type: Number, default: 1 },
    unit: { type: String, default: "mtr" },
    ready_made: { type: String },
    voice_notes: [
      {
        type: String,
      },
    ],
    isLovojFabric: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Product", ProductSchema);
