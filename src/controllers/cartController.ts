import { Request, Response, NextFunction } from 'express';
import { Types } from 'mongoose';
import Cart from '../models/Cart';
import Product from '../models/Product';

export const getCart = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Not authenticated.' });
      return;
    }

    const cart = await Cart.findOne({ user: req.user.id })
      .populate({
        path: 'items.product',
        select: 'name images price originalPrice discount stock sizes colors brand category',
      });

    if (!cart) {
      res.status(200).json({
        success: true,
        cart: {
          items: [],
          totalAmount: 0,
          totalItems: 0,
        },
      });
      return;
    }

    res.status(200).json({
      success: true,
      cart: {
        _id: cart._id,
        items: cart.items,
        totalAmount: cart.totalAmount,
        totalItems: cart.totalItems,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const addToCart = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Not authenticated.' });
      return;
    }

    const { productId, size, color, quantity = 1 } = req.body;

    if (!productId || !size || !color) {
      res.status(400).json({
        success: false,
        message: 'productId, size, and color are required.',
      });
      return;
    }

    if (quantity < 1) {
      res.status(400).json({ success: false, message: 'Quantity must be at least 1.' });
      return;
    }

    // Verify product exists and has stock
    const product = await Product.findById(productId);
    if (!product) {
      res.status(404).json({ success: false, message: 'Product not found.' });
      return;
    }

    if (product.stock < quantity) {
      res.status(400).json({
        success: false,
        message: `Only ${product.stock} items available in stock.`,
      });
      return;
    }

    if (!product.sizes.includes(size)) {
      res.status(400).json({ success: false, message: `Size '${size}' is not available for this product.` });
      return;
    }

    if (!product.colors.includes(color)) {
      res.status(400).json({ success: false, message: `Color '${color}' is not available for this product.` });
      return;
    }

    let cart = await Cart.findOne({ user: req.user.id });

    if (!cart) {
      cart = await Cart.create({
        user: req.user.id,
        items: [],
      });
    }

    // Check if same product+size+color already in cart
    const existingItemIndex = cart.items.findIndex(
      (item) =>
        item.product.toString() === productId &&
        item.size === size &&
        item.color === color
    );

    if (existingItemIndex > -1) {
      const newQuantity = cart.items[existingItemIndex].quantity + quantity;

      if (newQuantity > product.stock) {
        res.status(400).json({
          success: false,
          message: `Cannot add more. Only ${product.stock} items available in stock.`,
        });
        return;
      }

      cart.items[existingItemIndex].quantity = newQuantity;
    } else {
      cart.items.push({
        product: new Types.ObjectId(productId),
        size,
        color,
        quantity,
        price: product.price,
      });
    }

    await cart.save();

    const populatedCart = await Cart.findById(cart._id).populate({
      path: 'items.product',
      select: 'name images price originalPrice discount stock sizes colors brand category',
    });

    res.status(200).json({
      success: true,
      message: 'Item added to cart.',
      cart: {
        _id: populatedCart!._id,
        items: populatedCart!.items,
        totalAmount: populatedCart!.totalAmount,
        totalItems: populatedCart!.totalItems,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const updateCartItem = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Not authenticated.' });
      return;
    }

    const { itemId } = req.params;
    const { quantity } = req.body;

    if (!quantity || quantity < 1) {
      res.status(400).json({ success: false, message: 'Quantity must be at least 1.' });
      return;
    }

    const cart = await Cart.findOne({ user: req.user.id });

    if (!cart) {
      res.status(404).json({ success: false, message: 'Cart not found.' });
      return;
    }

    const itemIndex = cart.items.findIndex(
      (item) => item._id && item._id.toString() === itemId
    );

    if (itemIndex === -1) {
      res.status(404).json({ success: false, message: 'Cart item not found.' });
      return;
    }

    // Verify stock
    const product = await Product.findById(cart.items[itemIndex].product);
    if (!product) {
      res.status(404).json({ success: false, message: 'Product not found.' });
      return;
    }

    if (quantity > product.stock) {
      res.status(400).json({
        success: false,
        message: `Only ${product.stock} items available in stock.`,
      });
      return;
    }

    cart.items[itemIndex].quantity = quantity;
    await cart.save();

    const populatedCart = await Cart.findById(cart._id).populate({
      path: 'items.product',
      select: 'name images price originalPrice discount stock sizes colors brand category',
    });

    res.status(200).json({
      success: true,
      message: 'Cart item updated.',
      cart: {
        _id: populatedCart!._id,
        items: populatedCart!.items,
        totalAmount: populatedCart!.totalAmount,
        totalItems: populatedCart!.totalItems,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const removeFromCart = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Not authenticated.' });
      return;
    }

    const { itemId } = req.params;

    const cart = await Cart.findOne({ user: req.user.id });

    if (!cart) {
      res.status(404).json({ success: false, message: 'Cart not found.' });
      return;
    }

    const itemIndex = cart.items.findIndex(
      (item) => item._id && item._id.toString() === itemId
    );

    if (itemIndex === -1) {
      res.status(404).json({ success: false, message: 'Cart item not found.' });
      return;
    }

    cart.items.splice(itemIndex, 1);
    await cart.save();

    const populatedCart = await Cart.findById(cart._id).populate({
      path: 'items.product',
      select: 'name images price originalPrice discount stock sizes colors brand category',
    });

    res.status(200).json({
      success: true,
      message: 'Item removed from cart.',
      cart: {
        _id: populatedCart!._id,
        items: populatedCart!.items,
        totalAmount: populatedCart!.totalAmount,
        totalItems: populatedCart!.totalItems,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const clearCart = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Not authenticated.' });
      return;
    }

    const cart = await Cart.findOneAndUpdate(
      { user: req.user.id },
      { $set: { items: [] } },
      { new: true }
    );

    if (!cart) {
      res.status(200).json({
        success: true,
        message: 'Cart is already empty.',
        cart: { items: [], totalAmount: 0, totalItems: 0 },
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'Cart cleared.',
      cart: {
        _id: cart._id,
        items: [],
        totalAmount: 0,
        totalItems: 0,
      },
    });
  } catch (error) {
    next(error);
  }
};
