import mongoose, { Schema, SchemaDefinition } from 'mongoose';
import { IProduct } from '../types';

// Using SchemaDefinition to avoid TS conflict with reserved keyword 'new' in isNew
const productSchemaDefinition: SchemaDefinition = {
  name: {
    type: String,
    required: [true, 'Product name is required'],
    trim: true,
    maxlength: [200, 'Product name cannot exceed 200 characters'],
  },
  description: {
    type: String,
    required: [true, 'Product description is required'],
    trim: true,
  },
  category: {
    type: String,
    required: [true, 'Category is required'],
    enum: ['women', 'men', 'kids', 'accessories'],
    lowercase: true,
  },
  subcategory: {
    type: String,
    required: [true, 'Subcategory is required'],
    lowercase: true,
    trim: true,
  },
  images: {
    type: [String],
    required: [true, 'At least one image is required'],
    validate: {
      validator: (val: string[]) => val.length > 0,
      message: 'At least one image URL is required',
    },
  },
  sizes: {
    type: [String],
    default: [],
  },
  colors: {
    type: [String],
    default: [],
  },
  price: {
    type: Number,
    required: [true, 'Price is required'],
    min: [0, 'Price cannot be negative'],
  },
  originalPrice: {
    type: Number,
    required: [true, 'Original price is required'],
    min: [0, 'Original price cannot be negative'],
  },
  discount: {
    type: Number,
    default: 0,
    min: [0, 'Discount cannot be negative'],
    max: [100, 'Discount cannot exceed 100%'],
  },
  stock: {
    type: Number,
    required: [true, 'Stock is required'],
    min: [0, 'Stock cannot be negative'],
    default: 0,
  },
  tags: {
    type: [String],
    default: [],
  },
  rating: {
    type: Number,
    default: 0,
    min: [0, 'Rating cannot be negative'],
    max: [5, 'Rating cannot exceed 5'],
  },
  reviewCount: {
    type: Number,
    default: 0,
    min: [0, 'Review count cannot be negative'],
  },
  featured: {
    type: Boolean,
    default: false,
  },
  isNew: {
    type: Boolean,
    default: false,
  },
  brand: {
    type: String,
    trim: true,
    default: '',
  },
  material: {
    type: String,
    trim: true,
    default: '',
  },
  careInstructions: {
    type: String,
    trim: true,
    default: '',
  },
};

const productSchema = new Schema<IProduct>(productSchemaDefinition, {
  timestamps: true,
});

// Indexes for performance
productSchema.index({ category: 1 });
productSchema.index({ subcategory: 1 });
productSchema.index({ price: 1 });
productSchema.index({ featured: 1 });
productSchema.index({ isNew: 1 });
productSchema.index({ rating: -1 });
productSchema.index({ name: 'text', description: 'text', tags: 'text' });

const Product = mongoose.model<IProduct>('Product', productSchema);

export default Product;
