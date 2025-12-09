const mongoose = require('mongoose');

const contrastSchema = new mongoose.Schema({
  storeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Store ID is required']
  },
  customerId: {
    type: mongoose.Schema.Types.ObjectId,
  },
  
  products: [
    {
      productId: {
        type: mongoose.Schema.Types.ObjectId,
      },
      name: {
        type: String,
        required: true,
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
              },
              styleImage: {
                type: String,
              },
              styleFabricImage: {
                type: String,
              },
              stylePrice: {
                type: Number,
              },
              stylePosition: {type: String,}
            }
          ],
        }
      ],
            contrast_type:{type:String},
            DefaultButton: {type: Boolean,},
            customButton: {type: String,},
            DefaultButtonContrast: {type: Boolean,},
            AllContrast: {type: Boolean,},
            OnlyCuffsContrast: {type: Boolean,},
            buttonHoles: {type: String,},
            buttonThreads: {type: String,},
            embroideryText: {type: String,},
            embroideryFonts: {type: String, },
            embroideryThreadColor: { type: String,},
            embroideryThreadPosition: {type: String,},
            fabric_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Fabrics' },
            color_code: {type: String,},
            currency: {type: String,},

    }
  ],
}, { timestamps: true });

const CustomerContrast = mongoose.model('CustomerContrast', contrastSchema);

module.exports = CustomerContrast;