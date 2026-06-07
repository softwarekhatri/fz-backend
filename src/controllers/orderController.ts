import { Request, Response, NextFunction } from 'express';
import { Types } from 'mongoose';
import Order from '../models/Order';
import Cart from '../models/Cart';
import Product from '../models/Product';
import User from '../models/User';
import { sendOrderConfirmationEmail } from '../services/emailService';
import { IShippingAddress } from '../types';

export const createOrder = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Not authenticated.' });
      return;
    }

    const { shippingAddress } = req.body;

    // Validate shipping address
    if (!shippingAddress) {
      res.status(400).json({ success: false, message: 'Shipping address is required.' });
      return;
    }

    const requiredAddressFields: (keyof IShippingAddress)[] = [
      'fullName', 'phone', 'addressLine1', 'city', 'state', 'pincode', 'country',
    ];

    for (const field of requiredAddressFields) {
      if (!shippingAddress[field]) {
        res.status(400).json({
          success: false,
          message: `Shipping address field '${field}' is required.`,
        });
        return;
      }
    }

    // Get cart with populated products
    const cart = await Cart.findOne({ user: req.user.id }).populate({
      path: 'items.product',
      select: 'name images price stock',
    });

    if (!cart || cart.items.length === 0) {
      res.status(400).json({ success: false, message: 'Your cart is empty. Please add items before placing an order.' });
      return;
    }

    // Verify stock availability for all items
    for (const item of cart.items) {
      const product = item.product as unknown as { _id: Types.ObjectId; name: string; stock: number; price: number; images: string[] };

      const freshProduct = await Product.findById(product._id);
      if (!freshProduct) {
        res.status(400).json({
          success: false,
          message: `Product '${product.name}' is no longer available.`,
        });
        return;
      }

      if (freshProduct.stock < item.quantity) {
        res.status(400).json({
          success: false,
          message: `Insufficient stock for '${freshProduct.name}'. Only ${freshProduct.stock} available.`,
        });
        return;
      }
    }

    // Build order items
    const orderItems = cart.items.map((item) => {
      const product = item.product as unknown as { _id: Types.ObjectId; name: string; images: string[]; price: number };
      return {
        product: product._id,
        name: product.name,
        image: product.images[0] || '',
        size: item.size,
        color: item.color,
        quantity: item.quantity,
        price: item.price,
      };
    });

    const totalAmount = cart.totalAmount;

    // Create the order
    const order = await Order.create({
      user: req.user.id,
      items: orderItems,
      shippingAddress: {
        fullName: shippingAddress.fullName,
        phone: shippingAddress.phone,
        addressLine1: shippingAddress.addressLine1,
        addressLine2: shippingAddress.addressLine2 || '',
        city: shippingAddress.city,
        state: shippingAddress.state,
        pincode: shippingAddress.pincode,
        country: shippingAddress.country || 'India',
      },
      paymentMethod: 'COD',
      totalAmount,
    });

    // Update product stock
    for (const item of cart.items) {
      const product = item.product as unknown as { _id: Types.ObjectId };
      await Product.findByIdAndUpdate(product._id, {
        $inc: { stock: -item.quantity },
      });
    }

    // Clear cart
    cart.items = [];
    await cart.save();

    // Send order confirmation email
    const user = await User.findById(req.user.id);
    if (user) {
      try {
        await sendOrderConfirmationEmail(
          user.email,
          user.name,
          order.orderNumber,
          orderItems.map((item) => ({
            name: item.name,
            image: item.image,
            size: item.size,
            color: item.color,
            quantity: item.quantity,
            price: item.price,
          })),
          totalAmount
        );
      } catch {
        console.error('Failed to send order confirmation email');
      }
    }

    res.status(201).json({
      success: true,
      message: 'Order placed successfully!',
      order,
    });
  } catch (error) {
    next(error);
  }
};

export const getOrders = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Not authenticated.' });
      return;
    }

    const orders = await Order.find({ user: req.user.id })
      .sort({ createdAt: -1 })
      .lean();

    res.status(200).json({
      success: true,
      orders,
    });
  } catch (error) {
    next(error);
  }
};

export const getOrder = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Not authenticated.' });
      return;
    }

    const { id } = req.params;

    const order = await Order.findOne({
      _id: id,
      user: req.user.id,
    }).lean();

    if (!order) {
      res.status(404).json({ success: false, message: 'Order not found.' });
      return;
    }

    res.status(200).json({
      success: true,
      order,
    });
  } catch (error) {
    next(error);
  }
};

export const cancelOrder = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Not authenticated.' });
      return;
    }

    const { id } = req.params;

    const order = await Order.findOne({
      _id: id,
      user: req.user.id,
    });

    if (!order) {
      res.status(404).json({ success: false, message: 'Order not found.' });
      return;
    }

    if (order.status !== 'pending' && order.status !== 'confirmed') {
      res.status(400).json({
        success: false,
        message: `Order cannot be cancelled. Current status is '${order.status}'.`,
      });
      return;
    }

    order.status = 'cancelled';
    await order.save();

    // Restore stock for each item
    for (const item of order.items) {
      await Product.findByIdAndUpdate(item.product, {
        $inc: { stock: item.quantity },
      });
    }

    res.status(200).json({
      success: true,
      message: 'Order cancelled successfully.',
      order,
    });
  } catch (error) {
    next(error);
  }
};
