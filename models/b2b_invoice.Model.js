const mongoose = require('mongoose');
const Counter = require('./Counter.model');

const invoiceSchema = new mongoose.Schema({
    invoiceNumber: { type: String, unique: true },
    trialDate: { type: Date },
    deliveryDate: { type: Date },
    placeOfSupply: { type: String },
    orderNumber: { type: String },
    customerId: { type: mongoose.Types.ObjectId },
    storeId: { type: mongoose.Types.ObjectId },
    shippingAddress: {
        name: String,
        address: String,
        state: String,
        pincode: String,
        contact: String,
        gstin: String
    },
    billingAddress: {
        name: String,
        address: String,
        state: String,
        pincode: String,
        contact: String,
        gstin: String
    },
    items: [{
        product_id: mongoose.Types.ObjectId,
        name: String,
        description: String,
        hsnOrSac: String,
        quantity: Number,
        size:String,
        unit: String,
        rate: Number,
        discount: { type: Number, default: 0 }, // in ₹ or %
        taxableValue: Number, // after discount
        cgst: Number,
        sgst: Number,
        igst: Number,
        total: Number,
        price_breakup: {
            fabric_price: { type: Number },
            making_charges: { type: Number },
            trims_price: { type: Number },
            additional_price: []

        }
    }],

    totals: {
        subTotal: Number,     // sum of taxableValue
        totalCgst: Number,
        totalSgst: Number,
        totalIgst: Number,
        totalTax: Number,     // totalCgst + totalSgst + totalIgst
        grandTotal: Number,   // subTotal + totalTax
        roundOff: Number,
        payableAmount: Number,
        paymentAdvance: { type: Number, default: 0 },
        pendingAmount: { type: Number, default: 0 }
    },

    payment_id: { type: mongoose.Types.ObjectId },
    payment_method: { type: String, default: "Cash" },
    termsAndConditions: String,
    notes: String,
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

    createdAt: { type: Date, default: Date.now },
}, { timestamps: true });
invoiceSchema.pre('save', async function (next) {
    const doc = this;

    // Generate invoiceNumber
    if (doc.isNew && !doc.invoiceNumber) {
        try {
            const counter = await Counter.findByIdAndUpdate(
                { _id: 'invoice' },
                { $inc: { seq: 1 } },
                { new: true, upsert: true }
            );

            const currentYear = new Date().getFullYear();
            const paddedSeq = String(counter.seq).padStart(5, '0');
            doc.invoiceNumber = `INV-${currentYear}-${paddedSeq}`;
        } catch (err) {
            return next(err);
        }
    }

    // Calculate pendingAmount
    if (doc.totals && typeof doc.totals.grandTotal === 'number') {
        const advance = typeof doc.totals.paymentAdvance === 'number' ? doc.totals.paymentAdvance : 0;
        doc.totals.pendingAmount = doc.totals.grandTotal - advance;
    }

    next();
});


module.exports = mongoose.model('B2BInvoice', invoiceSchema);
