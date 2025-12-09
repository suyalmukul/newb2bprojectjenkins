// models/CartItem.js
const mongoose = require('mongoose');

const rollCombinationSchema = new mongoose.Schema({
  rollIdentity: {
    type: String,
    required: [true, 'rollIdentity is required']
  },
  rackNumber: {
    type: String,
    required: [true, 'rackNumber is required']
  },
  storeLocation: {
    type: String,
    required: [true, 'storeLocation is required']
  },
  quantity: {
    type: Number,
    required: [true, 'Quantity is required'],
    min: [0.01, 'Quantity must be greater than 0']
  }
}, { _id: false });

const cartItemSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  storeNumber: { type: String, required: true },
  fabDashNumber: { type: String, required: true },
  quantity: {
    type: Number,
    default: 1,
    min: [1, 'Quantity must be at least 1']
  },
  unit: {
    type: String,
    enum: ['meter', 'yard'],
    default: 'meter'
  },
  roll_combinations: {
    type: [rollCombinationSchema],
    validate: {
      validator: function (rolls) {
        const seen = new Set();
        for (let roll of rolls) {
          if (seen.has(roll.rollIdentity)) return false;
          seen.add(roll.rollIdentity);
        }
        return true;
      },
      message: 'Duplicate rollIdentity found in roll_combinations'
    }
  }
}, { timestamps: true });

module.exports = mongoose.model('DesignerCart', cartItemSchema);
