import express from 'express';
import { searchSimilarImages, addImageEmbedding, upload, checkDatabase } from '../controller/visualSearchController.js';

const router = express.Router();

// Route to search similar images
router.post('/search', upload.single('image'), searchSimilarImages);

// Route to add image embedding for a product
router.post('/add-embedding', upload.single('image'), addImageEmbedding);

router.get('/check-database', checkDatabase);

export default router; 