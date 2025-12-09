const mongoose = require("mongoose");
let productdropdowns = new mongoose.Schema(
  {
    gender: {
      type: String,
    },
    product_name: {
      type: String,
    },
    //now not use
    sub_name: {
      type: Array,
    },

  },
  { timestamps: true }
);


module.exports = mongoose.model("ProductDropdown", productdropdowns);




