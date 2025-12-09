const mongoose = require('mongoose');

const itemSchema = new mongoose.Schema({
  name: { type: String, required: true },
  price: { type: Number, required: true },
  quantity: { type: Number, required: true },
});

const expenseSchema = new mongoose.Schema({
  title: { type: String, required: true },
  items: [itemSchema],
  amount: { type: Number, required: true }, // Could be auto-calculated from items
  category: { type: String },
  date: { type: Date, required: true },
  notes: { type: String },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
}, {
  timestamps: true
});

module.exports = mongoose.model('Expense', expenseSchema);
