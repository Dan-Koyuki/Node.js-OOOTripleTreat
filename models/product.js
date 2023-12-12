const mongoose = require('mongoose');

const producSchema = new mongoose.Schema({
  name: {type: String, required: true},
  desc: {type: String, required: true},
  price: {type: Number, required: true},
  image: {type: Object, required: true},
}, {timestamps: true});

const Product = mongoose.model('Product', producSchema);

exports.Product = Product;