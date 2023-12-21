const mongoose = require('mongoose');

const producSchema = new mongoose.Schema({
  name: {type: String, required: true},
  desc: {type: String, required: true},
  price: {type: Number, required: true},
  image: {type: Object, required: true},
  category: { type: String, required: true },
  brand: { type: String, required: true },
  warranty: { type: String }
}, {timestamps: true});

const Product = mongoose.model('Product', producSchema);

exports.Product = Product;