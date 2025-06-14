import mongoose from 'mongoose';

const imageEmbeddingSchema = new mongoose.Schema({
    productId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
        required: true
    },
    embedding: {
        type: [Number],
        required: true
    },
    imageUrl: {
        type: String,
        required: true
    }
}, { timestamps: true });

// Index for faster similarity search
imageEmbeddingSchema.index({ embedding: '2dsphere' });

const ImageEmbedding = mongoose.model('ImageEmbedding', imageEmbeddingSchema);
export default ImageEmbedding; 