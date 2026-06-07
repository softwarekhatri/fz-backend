import { Router } from 'express';
import {
  getProducts,
  getProduct,
  getFeaturedProducts,
  getNewArrivals,
  getCategories,
  searchSuggestions,
} from '../controllers/productController';

const router = Router();

// GET /api/products
router.get('/', getProducts);

// GET /api/products/featured
router.get('/featured', getFeaturedProducts);

// GET /api/products/new-arrivals
router.get('/new-arrivals', getNewArrivals);

// GET /api/products/categories
router.get('/categories', getCategories);

// GET /api/products/search-suggestions?q=query
router.get('/search-suggestions', searchSuggestions);

// GET /api/products/:id
router.get('/:id', getProduct);

export default router;
