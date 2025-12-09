// models/MostPurchasedCategory.js
const mongoose = require('mongoose');

const purchasedCategorySchema = new mongoose.Schema({
  store_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Store',
    required: true
  },
  category_name: {
    type: String,
    required: true
  },
  count: {
    type: Number,
    required: true,
    default:0
  },
  type:{
    type:String,
    enum:['offline','online'],
    default:'offline'
  }
}, {
  timestamps: true // Optional: adds createdAt and updatedAt
});

purchasedCategorySchema.index({ store_id: 1, category_name:1 }, { unique: true });


module.exports = mongoose.model('purchasedCategory', purchasedCategorySchema);
