import { Document, Types } from 'mongoose';

export interface IUser extends Document {
  _id: Types.ObjectId;
  name: string;
  email: string;
  password: string;
  isVerified: boolean;
  verificationToken?: string;
  verificationExpires?: Date;
  resetPasswordToken?: string;
  resetPasswordExpires?: Date;
  createdAt: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
  generateVerificationToken(): string;
}

export interface IProduct extends Document {
  _id: Types.ObjectId;
  name: string;
  description: string;
  category: string;
  subcategory: string;
  images: string[];
  sizes: string[];
  colors: string[];
  price: number;
  originalPrice: number;
  discount: number;
  stock: number;
  tags: string[];
  rating: number;
  reviewCount: number;
  featured: boolean;
  isNew: boolean;
  brand: string;
  material: string;
  careInstructions: string;
  createdAt: Date;
}

export interface ICartItem {
  _id?: Types.ObjectId;
  product: Types.ObjectId;
  size: string;
  color: string;
  quantity: number;
  price: number;
}

export interface ICart extends Document {
  _id: Types.ObjectId;
  user: Types.ObjectId;
  items: ICartItem[];
  totalAmount: number;
  totalItems: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface IShippingAddress {
  fullName: string;
  phone: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  pincode: string;
  country: string;
}

export interface IOrderItem {
  product: Types.ObjectId;
  name: string;
  image: string;
  size: string;
  color: string;
  quantity: number;
  price: number;
}

export interface IOrder extends Document {
  _id: Types.ObjectId;
  user: Types.ObjectId;
  items: IOrderItem[];
  shippingAddress: IShippingAddress;
  paymentMethod: 'COD';
  status: 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  totalAmount: number;
  orderNumber: string;
  createdAt: Date;
  updatedAt: Date;
}

// Express request augmentation
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
      };
    }
  }
}
