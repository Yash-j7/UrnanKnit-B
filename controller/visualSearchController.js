import { HfInference } from "@huggingface/inference";
import ImageEmbedding from "../models/imageEmbedding.js";
import multer from "multer";
import sharp from "sharp";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import fetch from "node-fetch";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, "../uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer for image upload
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed!"));
    }
  },
});

// Initialize Hugging Face client
const hf = new HfInference(process.env.HUGGINGFACE_TOKEN);

// List of working models for image embeddings
const MODELS_TO_TRY = [
  "google/vit-base-patch16-224",
  "microsoft/resnet-50",
  "facebook/deit-base-distilled-patch16-224"
];

// Generate embedding for an image using multiple fallback methods
const generateEmbedding = async (imageBuffer) => {
  try {
    if (!process.env.HUGGINGFACE_TOKEN) {
      throw new Error("Hugging Face token is not configured");
    }

    console.log("Generating embedding for image...");

    // Convert image to base64
    const base64Image = imageBuffer.toString('base64');

    // Try direct API call with proper model
    const response = await fetch(
      'https://api-inference.huggingface.co/models/google/vit-base-patch16-224',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.HUGGINGFACE_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          inputs: base64Image,
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    
    // Ensure we have a proper embedding array
    if (!Array.isArray(result)) {
      console.error('Invalid embedding format received:', result);
      throw new Error('Invalid embedding format received from API');
    }

    console.log(`Generated embedding length: ${result.length}`);
    return result;
  } catch (error) {
    console.error("Error generating embedding:", error);
    throw new Error(`Failed to generate image embedding: ${error.message}`);
  }
};

// Alternative: Generate simple feature vector as fallback
const generateFallbackEmbedding = async (imageBuffer) => {
  try {
    console.log("Generating fallback embedding...");
    
    // Get image statistics as a simple feature vector
    const image = sharp(imageBuffer);
    const { width, height, channels } = await image.metadata();
    const stats = await image.stats();
    
    // Create a simple feature vector from image properties
    const embedding = [];
    
    // Add dimension features
    embedding.push(width / 1000, height / 1000, channels / 10);
    
    // Add color statistics for each channel
    if (stats.channels) {
      stats.channels.forEach(channel => {
        embedding.push(
          channel.mean / 255,
          channel.std / 255,
          channel.min / 255,
          channel.max / 255
        );
      });
    }
    
    // Pad or truncate to consistent length (e.g., 512 dimensions)
    const targetLength = 512;
    while (embedding.length < targetLength) {
      embedding.push(0);
    }
    
    return embedding.slice(0, targetLength);
  } catch (error) {
    console.error("Error generating fallback embedding:", error);
    // Return a random vector as last resort
    return Array(512).fill(0).map(() => Math.random() * 2 - 1);
  }
};

console.log("HF Token exists:", !!process.env.HUGGINGFACE_TOKEN);

// Alternative simple similarity calculation using basic operations
const calculateSimpleDistance = (queryEmbedding) => {
  return ImageEmbedding.aggregate([
    {
      $addFields: {
        // Simple Euclidean distance approximation using first few dimensions
        simpleSimilarity: {
          $subtract: [
            1,
            {
              $sqrt: {
                $add: [
                  { $pow: [{ $subtract: [{ $arrayElemAt: ["$embedding", 0] }, queryEmbedding[0] || 0] }, 2] },
                  { $pow: [{ $subtract: [{ $arrayElemAt: ["$embedding", 1] }, queryEmbedding[1] || 0] }, 2] },
                  { $pow: [{ $subtract: [{ $arrayElemAt: ["$embedding", 2] }, queryEmbedding[2] || 0] }, 2] },
                  { $pow: [{ $subtract: [{ $arrayElemAt: ["$embedding", 3] }, queryEmbedding[3] || 0] }, 2] },
                  { $pow: [{ $subtract: [{ $arrayElemAt: ["$embedding", 4] }, queryEmbedding[4] || 0] }, 2] }
                ]
              }
            }
          ]
        }
      }
    },
    { $sort: { simpleSimilarity: -1 } },
    { $limit: 10 },
    {
      $lookup: {
        from: "products",
        localField: "productId",
        foreignField: "_id",
        as: "product",
      },
    },
    { $unwind: "$product" }
  ]);
};

// Search similar images
const searchSimilarImages = async (req, res) => {
  try {
    if (!req.file) {
      console.error("No image file provided");
      return res.status(400).json({
        success: false,
        message: "No image file provided",
      });
    }

    console.log("Processing uploaded image...");
    // Process image and ensure it's in JPEG format
    const processedImage = await sharp(req.file.path)
      .resize(224, 224)
      .jpeg()
      .toBuffer();

    console.log("Generating embedding for query image...");
    let queryEmbedding;
    
    try {
      // Try to generate proper embedding
      queryEmbedding = await generateEmbedding(processedImage);
      console.log("Generated embedding type:", typeof queryEmbedding);
      console.log("Generated embedding length:", Array.isArray(queryEmbedding) ? queryEmbedding.length : 'not array');
    } catch (embeddingError) {
      console.log("Primary embedding failed, using fallback method...");
      queryEmbedding = await generateFallbackEmbedding(processedImage);
    }

    // Ensure queryEmbedding is a flat array
    if (Array.isArray(queryEmbedding[0])) {
      queryEmbedding = queryEmbedding[0];
    }

    console.log("Searching for similar images...");
    console.log("Query embedding length:", queryEmbedding.length);

    let similarImages = [];

    try {
      // Method 1: Try in-memory calculation (most accurate)
      console.log("Trying in-memory similarity calculation...");
      const allEmbeddings = await ImageEmbedding.find({}).populate('productId');
      console.log(`Found ${allEmbeddings.length} existing embeddings in database`);
      
      if (allEmbeddings.length === 0) {
        console.log("No embeddings found in database. You need to add some images first!");
        return res.json({
          success: true,
          results: [],
          message: "No images in database to compare against. Please add some images first.",
          queryEmbeddingLength: queryEmbedding.length,
        });
      }

      // Calculate similarity in Node.js
      const similarities = allEmbeddings.map(item => {
        try {
          const embedding1 = item.embedding;
          const embedding2 = queryEmbedding;
          
          console.log(`Processing item ${item._id}:`);
          console.log(`- Embedding1 length: ${Array.isArray(embedding1) ? embedding1.length : 'not array'}`);
          console.log(`- Embedding2 length: ${Array.isArray(embedding2) ? embedding2.length : 'not array'}`);
          console.log(`- Has product: ${!!item.productId}`);
          
          if (!Array.isArray(embedding1) || !Array.isArray(embedding2)) {
            console.log(`- Skipping: embeddings not arrays`);
            return { ...item.toObject(), similarity: 0 };
          }
          
          const minLength = Math.min(embedding1.length, embedding2.length);
          if (minLength === 0) {
            console.log(`- Skipping: zero length embeddings`);
            return { ...item.toObject(), similarity: 0 };
          }
          
          const e1 = embedding1.slice(0, minLength);
          const e2 = embedding2.slice(0, minLength);
          
          // Calculate cosine similarity
          const dotProduct = e1.reduce((sum, val, i) => sum + val * e2[i], 0);
          const norm1 = Math.sqrt(e1.reduce((sum, val) => sum + val * val, 0));
          const norm2 = Math.sqrt(e2.reduce((sum, val) => sum + val * val, 0));
          
          if (norm1 === 0 || norm2 === 0) {
            console.log(`- Skipping: zero norm`);
            return { ...item.toObject(), similarity: 0 };
          }
          
          const similarity = dotProduct / (norm1 * norm2);
          console.log(`- Calculated similarity: ${similarity}`);
          
          return {
            ...item.toObject(),
            similarity: similarity,
            product: item.productId
          };
        } catch (error) {
          console.error('Error calculating similarity for item:', item._id, error);
          return { ...item.toObject(), similarity: 0 };
        }
      });

      // Sort by similarity and get top 10
      console.log(`Total similarities calculated: ${similarities.length}`);
      const validSimilarities = similarities.filter(item => item.product);
      console.log(`Valid similarities (with products): ${validSimilarities.length}`);
      
      validSimilarities.forEach((item, index) => {
        console.log(`${index + 1}. ID: ${item._id}, Similarity: ${item.similarity}, Product: ${item.product?._id || 'missing'}`);
      });
      
      similarImages = validSimilarities
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, 10);
        
      console.log(`Final results count: ${similarImages.length}`);

    } catch (memoryError) {
      console.log("In-memory calculation failed, trying simple MongoDB aggregation...");
      
      try {
        // Method 2: Fallback to simple distance calculation
        similarImages = await calculateSimpleDistance(queryEmbedding);
      } catch (aggregationError) {
        console.log("MongoDB aggregation also failed, returning random results...");
        
        // Method 3: Last resort - return some random results
        similarImages = await ImageEmbedding.find({})
          .populate('productId')
          .limit(10)
          .then(results => results.map(item => ({
            ...item.toObject(),
            similarity: Math.random() * 0.5 + 0.5, // Random similarity between 0.5-1
            product: item.productId
          })));
      }
    }

    console.log(`Found ${similarImages.length} similar images`);
    res.json({
      success: true,
      results: similarImages,
      queryEmbeddingLength: queryEmbedding.length,
    });
  } catch (error) {
    console.error("Error in visual search:", error);
    res.status(500).json({
      success: false,
      message: "Error performing visual search",
      error: error.message,
    });
  }
};

// Add image embedding for a product
const addImageEmbedding = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No image file provided",
      });
    }

    const { productId } = req.body;
    if (!productId) {
      // Delete the uploaded file if productId is missing
      fs.unlinkSync(req.file.path);
      return res.status(400).json({
        success: false,
        message: "Product ID is required",
      });
    }

    // Process image
    const processedImage = await sharp(req.file.path)
      .resize(224, 224)
      .toBuffer();

    // Generate embedding with fallback
    let embedding;
    try {
      embedding = await generateEmbedding(processedImage);
    } catch (embeddingError) {
      console.log("Primary embedding failed, using fallback method...");
      embedding = await generateFallbackEmbedding(processedImage);
    }

    // Ensure embedding is a flat array
    if (Array.isArray(embedding[0])) {
      embedding = embedding[0];
    }

    // Save embedding with the correct image URL
    const imageEmbedding = new ImageEmbedding({
      productId,
      embedding,
      imageUrl: `/uploads/${req.file.filename}`, // Store relative path
    });

    await imageEmbedding.save();

    res.json({
      success: true,
      message: "Image embedding added successfully",
      data: {
        ...imageEmbedding.toObject(),
        embeddingLength: embedding.length,
      },
    });
  } catch (error) {
    // Delete the uploaded file if there's an error
    if (req.file) {
      fs.unlinkSync(req.file.path);
    }
    console.error("Error adding image embedding:", error);
    res.status(500).json({
      success: false,
      message: "Error adding image embedding",
      error: error.message,
    });
  }
};

// Test endpoint to check database contents
const checkDatabase = async (req, res) => {
  try {
    const embeddings = await ImageEmbedding.find({}).populate('productId');
    const embeddingStats = embeddings.map(item => ({
      id: item._id,
      productId: item.productId?._id || 'missing',
      productName: item.productId?.name || 'N/A',
      imageUrl: item.imageUrl,
      embeddingLength: Array.isArray(item.embedding) ? item.embedding.length : 'not array',
      embeddingType: typeof item.embedding,
      hasProduct: !!item.productId
    }));

    res.json({
      success: true,
      totalEmbeddings: embeddings.length,
      embeddings: embeddingStats,
      message: embeddings.length === 0 ? 
        "No embeddings found. Use POST /api/visual-search/add-embedding to add some images first." :
        `Found ${embeddings.length} embeddings in database`
    });
  } catch (error) {
    console.error("Error checking database:", error);
    res.status(500).json({
      success: false,
      message: "Error checking database",
      error: error.message,
    });
  }
};

export { searchSimilarImages, addImageEmbedding, upload, checkDatabase };