import { Router } from 'express';
import {
  getCart,
  addToCart,
  updateCartItem,
  removeFromCart,
  clearCart,
} from '../controllers/cartController';
import { protect } from '../middleware/auth';

const router = Router();

// All cart routes are protected
router.use(protect);

// GET /api/cart
router.get('/', getCart);

// POST /api/cart/add
router.post('/add', addToCart);

// PUT /api/cart/:itemId
router.put('/:itemId', updateCartItem);

// DELETE /api/cart/:itemId
router.delete('/:itemId', removeFromCart);

// DELETE /api/cart (clear all)
router.delete('/', clearCart);

export default router;
