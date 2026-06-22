import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import rateLimit from "express-rate-limit";

import connectDB from "./config/database";
import authRoutes from "./routes/auth";
import productRoutes from "./routes/products";
import cartRoutes from "./routes/cart";
import orderRoutes from "./routes/orders";
import { errorHandler, notFound } from "./middleware/errorHandler";

const app = express();
const PORT = process.env.PORT || 5175;

// ─── Security & Utility Middleware ───────────────────────────────────────────
app.use(helmet());

// ALLOWED_ORIGINS env var accepts a comma-separated list of extra production URLs
// e.g. ALLOWED_ORIGINS=https://mycustomdomain.com,https://staging.example.com
const extraOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(",").map((o) => o.trim())
  : [];

const ALLOWED_ORIGINS = [
  process.env.CLIENT_URL,
  ...extraOrigins,
  // Production deployments
  "https://fz-khatri.vercel.app",
  "https://fz-frontend.vercel.app",
  // Local development
  "http://localhost:3000",
  "http://localhost:3001",
  "http://localhost:5173",
  "http://localhost:5174",
  "http://localhost:5175",
].filter(Boolean) as string[];

// Pattern for Vercel preview deployment URLs (fz-frontend-git-*.vercel.app)
const VERCEL_PREVIEW_RE = /^https:\/\/fz-(?:frontend|khatri)[a-z0-9-]*\.vercel\.app$/;

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (curl, Postman, server-to-server)
      if (!origin) return callback(null, true);
      if (ALLOWED_ORIGINS.includes(origin)) return callback(null, true);
      // Allow any Vercel preview URL for this project
      if (VERCEL_PREVIEW_RE.test(origin)) return callback(null, true);
      callback(new Error(`CORS: origin ${origin} not allowed`));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

if (process.env.NODE_ENV !== "test") {
  app.use(morgan(process.env.NODE_ENV === "development" ? "dev" : "combined"));
}

// ─── Rate Limiting ───────────────────────────────────────────────────────────
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many requests, please try again later.",
  },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message:
      "Too many authentication attempts, please try again in 15 minutes.",
  },
});

app.use("/api", globalLimiter);
app.use("/api/auth/login", authLimiter);
app.use("/api/auth/register", authLimiter);
app.use("/api/auth/resend-otp", authLimiter);

// ─── Health Check ────────────────────────────────────────────────────────────
app.get("/health", (_req, res) => {
  res.status(200).json({
    success: true,
    message: "Poshak Kart API is running",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "development",
  });
});

app.get("/", (_req, res) => {
  res.status(200).json({
    success: true,
    message: "Welcome to Poshak Kart API",
    version: "1.0.0",
    docs: "/health",
  });
});

// ─── Routes ──────────────────────────────────────────────────────────────────
app.use("/api/auth", authRoutes);
app.use("/api/products", productRoutes);
app.use("/api/cart", cartRoutes);
app.use("/api/orders", orderRoutes);

// ─── 404 Handler ─────────────────────────────────────────────────────────────
app.use(notFound);

// ─── Global Error Handler ─────────────────────────────────────────────────────
app.use(errorHandler);

// ─── Database ─────────────────────────────────────────────────────────────────
// Connect at module load time — works for both long-running servers and
// serverless functions (Vercel reuses the cached promise on warm invocations).
connectDB().catch((err) => console.error('DB connection error:', err));

// ─── Start HTTP Server (local / non-Vercel only) ──────────────────────────────
if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`\n🚀 Poshak Kart server is running`);
    console.log(`   Environment: ${process.env.NODE_ENV || "development"}`);
    console.log(`   Port:        ${PORT}`);
    console.log(`   URL:         http://localhost:${PORT}`);
    console.log(`   API Base:    http://localhost:${PORT}/api\n`);
  });
}

// Vercel imports this module and uses `app` directly as the request handler
export default app;
