const mongoose = require("mongoose");

const productQrSchema = new mongoose.Schema(
  {
    orderNumber: { type: String },
    fabric_image: { type: String },
    fabric_name: { type: String },
    fabric_material: { type: String },
    product_name: { type: String },
    product_number: { type: String },
    quantity: { type: String },
    unit:{ type: String },
    orderId: { type: mongoose.Schema.Types.ObjectId },
    productId: { type: mongoose.Schema.Types.ObjectId },
    Qr: [
      {
        qr_scan_by: {
          mastertailor: { type: Boolean, default: false },
          cutter: { type: Boolean, default: false },
        },
      },
    ],
    created_time: { type: Date },
    delivery_date: { type: Date },
    qrcode_url: { type: String },
  },
  { timestamps: true }
);

const ProductQr = mongoose.model("ProductQr", productQrSchema);

module.exports = ProductQr;
