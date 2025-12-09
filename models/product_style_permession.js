const mongoose = require('mongoose');

// Define the schema
const Schema = mongoose.Schema;

// Define the product schema
const permissionProductStylesSchema = new Schema({
  storeId: { type: mongoose.Schema.Types.ObjectId, ref: "stores" },
  product_name: {
    type: String,
  },
  product_image: {
    type: String,
  },
  product_number:{
    type: String,
  },
  gender: {
      type: String,
      enum: ['Men', 'Women', 'Other'],
    },
  categorie_name: {
    type: String,
  },
  subcategorie: [
    {
    name: {
        type: String,
        required: true,
      },
    styles: [
        {
            name: {
              type: String,
            },
            number: {
              type: String,
            },
            image: {
              type: String,
            },
            flag: {
              type: Boolean,
              default: false,
            },
          },
    ],
  }
 ] 

},
{
  timestamps: true,
});



// Create a model based on the schema
const permissionproductstyles = mongoose.model('permissionproductstyles', permissionProductStylesSchema);

module.exports = permissionproductstyles;
