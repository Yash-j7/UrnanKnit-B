import express from "express";
import dotenv from "dotenv";
import connectDb from "./config/db.js";
import morgan from "morgan";
import authRoutes from "./routes/authRoute.js";
import cors from "cors";
import categoryRoutes from "./routes/categoryRoutes.js";
import productRoutes from "./routes/productRoute.js";
import visualSearchRoutes from "./routes/visualSearch.js";
import userListingRoutes from "./routes/userListingRoutes.js";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

dotenv.config();

const app = express();

// CORS (you can tighten this later)
app.use(cors({
  origin: (origin, cb) => cb(null, origin || "*"),
  methods: "GET,POST,PUT,DELETE,OPTIONS",
  credentials: true,
}));

app.use(express.json());
app.use(morgan("dev"));

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ensure uploads dir exists
const uploadsDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
app.use("/uploads", express.static(uploadsDir));

// routes
app.use("/auth", authRoutes);
app.use("/api/v1/category", categoryRoutes);
app.use("/api/v1/product", productRoutes);
app.use("/api/visual-search", visualSearchRoutes);
app.use("/api/user-listings", userListingRoutes);

app.get("/", (req, res) => res.status(200).send("OK"));

const PORT = process.env.PORT || 8080;   // <- Cloud Run sets this to 8080
const HOST = "0.0.0.0";                   // <- bind on all interfaces

// connect DB, then start server (log failures)
connectDb()
  .then(() => {
    app.listen(PORT, HOST, () => {
      console.log(`Server listening on http://${HOST}:${PORT}`);
    });
  })
  .catch(err => {
    console.error("DB connection failed:", err);
    // still start to satisfy health check if you want:
    app.listen(PORT, HOST, () => {
      console.log(`Server listening (DB failed) on http://${HOST}:${PORT}`);
    });
  });
