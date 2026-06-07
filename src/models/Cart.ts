import mongoose, { Schema } from 'mongoose';
import { ICart, ICartItem } from '../types';

const cartItemSchema = new Schema<ICartItem>(
  {
    product: {
      type: Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
    },
    size: {
      type: String,
      required: [true, 'Size is required'],
      trim: true,
    },
    color: {
      type: String,
      required: [true, 'Color is required'],
      trim: true,
    },
    quantity: {
      type: Number,
      required: [true, 'Quantity is required'],
      min: [1, 'Quantity must be at least 1'],
      default: 1,
    },
    price: {
      type: Number,
      required: [true, 'Price is required'],
      min: [0, 'Price cannot be negative'],
    },
  },
  { _id: true }
);

const cartSchema = new Schema<ICart>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    items: {
      type: [cartItemSchema],
      default: [],
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual for totalAmount
cartSchema.virtual('totalAmount').get(function (this: ICart) {
  return this.items.reduce((total, item) => {
    return total + item.price * item.quantity;
  }, 0);
});

// Virtual for totalItems
cartSchema.virtual('totalItems').get(function (this: ICart) {
  return this.items.reduce((total, item) => {
    return total + item.quantity;
  }, 0);
});

cartSchema.index({ user: 1 });

const Cart = mongoose.model<ICart>('Cart', cartSchema);

export default Cart;
