const mongoose = require('mongoose');

// Define the schema
const Schema = mongoose.Schema;

// Define the product schema
const CategoryStylesUploadSchema = new Schema({
  storeId: { type: mongoose.Schema.Types.ObjectId, ref: "stores" },
  category: {type:mongoose.Schema.Types.ObjectId,ref:"AdminProductForUser"},
  user:{type:mongoose.Schema.Types.ObjectId,ref:"User"},
  options:[{
    name: {type:String},
    image:{type:String},
  }],
  style_name:{type:String}
},
{
  timestamps: true,
});

// Create a model based on the schema
const CategoryStylesUpload = mongoose.model('CategoryStylesUpload', CategoryStylesUploadSchema);

module.exports = CategoryStylesUpload;
