import mongoose from 'mongoose';
import dotenv from 'dotenv';
import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import ImageEmbedding from '../models/imageEmbedding.js';
import Product from '../models/product.js';
import sharp from 'sharp';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Hugging Face client
const hf = new HfInference(process.env.HUGGINGFACE_TOKEN);

// Function to download image
async function downloadImage(url, filename) {
  const response = await fetch(url);
  const buffer = await response.buffer();
  fs.writeFileSync(filename, buffer);
  return buffer;
}

// Function to generate embedding
async function generateEmbedding(imageBuffer) {
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
}

// Main function to process all products
async function processProducts() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Get all products with images
    const products = await Product.find({ image: { $exists: true, $ne: null } });
    console.log(`Found ${products.length} products with images`);

    // Create temp directory if it doesn't exist
    const tempDir = path.join(__dirname, '../temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir);
    }

    // Process each product
    for (const product of products) {
      try {
        console.log(`Processing product: ${product.name} (${product._id})`);

        // Check if embedding already exists
        const existingEmbedding = await ImageEmbedding.findOne({ productId: product._id });
        if (existingEmbedding) {
          console.log(`Embedding already exists for product ${product._id}`);
          continue;
        }

        // Download image
        const imageUrl = product.image;
        const tempFile = path.join(tempDir, `${product._id}.jpg`);
        const imageBuffer = await downloadImage(imageUrl, tempFile);

        // Process image with sharp before generating embedding
        const processedImage = await sharp(imageBuffer)
          .resize(224, 224)
          .jpeg()
          .toBuffer();

        // Generate embedding
        const embedding = await generateEmbedding(processedImage);

        // Save embedding
        const imageEmbedding = new ImageEmbedding({
          productId: product._id,
          embedding: embedding,
          imageUrl: imageUrl
        });

        await imageEmbedding.save();
        console.log(`Successfully added embedding for product ${product._id}`);

        // Clean up temp file
        fs.unlinkSync(tempFile);
      } catch (error) {
        console.error(`Error processing product ${product._id}:`, error);
      }
    }

    console.log('Finished processing all products');
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

// Run the script
processProducts(); 