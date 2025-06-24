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
import formidable from "express-formidable";
import fs from "fs";

dotenv.config();
connectDb();

const app = express();

app.use(
  cors({
    origin: "https://urbanknit-f.onrender.com",
    credentials: true,
  })
)
app.use(express.json());
app.use(morgan("dev"));

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Serve static files from uploads directory
app.use("/uploads", express.static(uploadsDir));

// Configure formidable middleware
app.use(
  formidable({
    uploadDir: uploadsDir,
    keepExtensions: true,
    multiples: false,
    maxFileSize: 2 * 1024 * 1024, // 2MB
    filter: function ({ name, originalFilename, mimetype }) {
      // Accept only images
      return mimetype && mimetype.includes("image");
    },
  })
);

const port = process.env.PORT;

app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/category", categoryRoutes);
app.use("/api/v1/product", productRoutes);
app.use("/api/visual-search", visualSearchRoutes);
app.use("/api/user-listings", userListingRoutes);

app.get("/", (req, res) => {
  res.send("<h1>hey there,Welcome</h1>");
});

app.listen(port, () => {
  console.log(`server running on ${port}`);
});
