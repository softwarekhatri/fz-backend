import { Router } from 'express';
import {
  createOrder,
  getOrders,
  getOrder,
  cancelOrder,
} from '../controllers/orderController';
import { protect } from '../middleware/auth';

const router = Router();

// All order routes are protected
router.use(protect);

// POST /api/orders
router.post('/', createOrder);

// GET /api/orders
router.get('/', getOrders);

// GET /api/orders/:id
router.get('/:id', getOrder);

// PUT /api/orders/:id/cancel
router.put('/:id/cancel', cancelOrder);

export default router;
