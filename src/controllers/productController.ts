import { Request, Response, NextFunction } from 'express';
import Product from '../models/Product';

export const getProducts = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const {
      page = '1',
      limit = '12',
      category,
      subcategory,
      minPrice,
      maxPrice,
      sizes,
      colors,
      sort,
      search,
      featured,
      isNew,
    } = req.query;

    const pageNum = Math.max(1, parseInt(page as string, 10));
    const limitNum = Math.min(50, Math.max(1, parseInt(limit as string, 10)));
    const skip = (pageNum - 1) * limitNum;

    // Build filter object
    const filter: Record<string, unknown> = {};

    if (category) {
      filter.category = (category as string).toLowerCase();
    }

    if (subcategory) {
      filter.subcategory = (subcategory as string).toLowerCase();
    }

    if (minPrice || maxPrice) {
      const priceFilter: Record<string, number> = {};
      if (minPrice) priceFilter.$gte = parseFloat(minPrice as string);
      if (maxPrice) priceFilter.$lte = parseFloat(maxPrice as string);
      filter.price = priceFilter;
    }

    if (sizes) {
      const sizeArray = (sizes as string).split(',').map((s) => s.trim());
      filter.sizes = { $in: sizeArray };
    }

    if (colors) {
      const colorArray = (colors as string).split(',').map((c) => c.trim());
      filter.colors = { $in: colorArray };
    }

    if (featured === 'true') {
      filter.featured = true;
    }

    if (isNew === 'true') {
      filter.isNew = true;
    }

    if (search) {
      filter.$text = { $search: search as string };
    }

    // Build sort object
    let sortObj: Record<string, 1 | -1 | { $meta: 'textScore' }> = { createdAt: -1 };

    switch (sort) {
      case 'price_asc':
        sortObj = { price: 1 };
        break;
      case 'price_desc':
        sortObj = { price: -1 };
        break;
      case 'newest':
        sortObj = { createdAt: -1 };
        break;
      case 'rating':
        sortObj = { rating: -1 };
        break;
      case 'discount':
        sortObj = { discount: -1 };
        break;
      default:
        if (search) {
          sortObj = { score: { $meta: 'textScore' } };
        }
        break;
    }

    const [products, total] = await Promise.all([
      Product.find(filter)
        .sort(sortObj)
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Product.countDocuments(filter),
    ]);

    res.status(200).json({
      success: true,
      products,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getProduct = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;

    const product = await Product.findById(id).lean();

    if (!product) {
      res.status(404).json({ success: false, message: 'Product not found.' });
      return;
    }

    res.status(200).json({
      success: true,
      product,
    });
  } catch (error) {
    next(error);
  }
};

export const getFeaturedProducts = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const products = await Product.find({ featured: true })
      .sort({ rating: -1 })
      .limit(8)
      .lean();

    res.status(200).json({
      success: true,
      products,
    });
  } catch (error) {
    next(error);
  }
};

export const getCategories = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const categories = await Product.aggregate([
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 },
          subcategories: { $addToSet: '$subcategory' },
        },
      },
      {
        $project: {
          _id: 0,
          category: '$_id',
          count: 1,
          subcategories: 1,
        },
      },
      { $sort: { category: 1 } },
    ]);

    res.status(200).json({
      success: true,
      categories,
    });
  } catch (error) {
    next(error);
  }
};

export const getNewArrivals = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const products = await Product.find({ isNew: true })
      .sort({ createdAt: -1 })
      .limit(8)
      .lean();

    res.status(200).json({
      success: true,
      products,
    });
  } catch (error) {
    next(error);
  }
};

export const searchSuggestions = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { q } = req.query;

    if (!q || (q as string).trim().length < 2) {
      res.status(200).json({ success: true, suggestions: [] });
      return;
    }

    const searchTerm = (q as string).trim();

    const products = await Product.find(
      { $text: { $search: searchTerm } },
      { score: { $meta: 'textScore' }, name: 1, category: 1 }
    )
      .sort({ score: { $meta: 'textScore' } })
      .limit(5)
      .lean();

    // Also do a regex search on name for partial matching
    const regexProducts = await Product.find({
      name: { $regex: searchTerm, $options: 'i' },
    })
      .select('name category')
      .limit(5)
      .lean();

    // Merge and deduplicate
    const allProducts = [...products, ...regexProducts];
    const seen = new Set<string>();
    const suggestions = allProducts
      .filter((p) => {
        const id = p._id.toString();
        if (seen.has(id)) return false;
        seen.add(id);
        return true;
      })
      .slice(0, 5)
      .map((p) => ({
        id: p._id,
        name: p.name,
        category: p.category,
      }));

    res.status(200).json({
      success: true,
      suggestions,
    });
  } catch (error) {
    next(error);
  }
};
