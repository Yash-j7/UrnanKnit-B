import userListingModel from "../models/UserListingModel.js";
import fs from "fs";
import slugify from "slugify";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// @desc    Create a new user listing
// @route   POST /api/user-listings
// @access  Private
export const createUserListing = async (req, res) => {
  try {
    console.log("Received request body:", req.fields);
    console.log("Received files:", req.files);

    const { title, description, category, condition, price } = req.fields;

    // Validate required fields
    if (!title || !description || !category || !condition || !price) {
      return res.status(400).json({ 
        error: "All fields are required",
        received: { title, description, category, condition, price }
      });
    }

    // Create slug from title
    const slug = slugify(title, { lower: true });

    const listing = new userListingModel({
      user: req.user._id,
      slug,
      title,
      description,
      category,
      condition,
      price,
    });

    // Handle photo upload
    if (req.files && req.files.photo) {
      console.log("Processing photo upload:", req.files.photo);
      
      if (req.files.photo.size > 2 * 1024 * 1024) {
        return res.status(400).json({ error: "Image should be under 2MB" });
      }

      try {
        const photoData = fs.readFileSync(req.files.photo.path);
        listing.photo = {
          data: photoData,
          contentType: req.files.photo.type
        };
        console.log("Photo processed successfully");
      } catch (photoError) {
        console.error("Error processing photo:", photoError);
        return res.status(500).json({ error: "Error processing photo upload" });
      }
    } else {
      console.log("No photo file received");
    }

    try {
      await listing.save();
      console.log("Listing saved successfully:", listing._id);
      res.status(201).json({ 
        message: "Listing created successfully", 
        listing: {
          ...listing.toObject(),
          photo: listing.photo ? { exists: true } : null
        }
      });
    } catch (saveError) {
      console.error("Error saving listing:", saveError);
      return res.status(500).json({ 
        error: "Error saving listing",
        details: saveError.message
      });
    }
  } catch (error) {
    console.error("Create listing error:", error);
    res.status(500).json({ 
      error: "Server error",
      details: error.message
    });
  }
};

// @desc    Get all user listings
// @route   GET /api/user-listings
// @access  Public
export const getAllListings = async (req, res) => {
  try {
    const listings = await userListingModel
      .find({ isSold: false })
      .select("-photo")
      .populate("user", "name email")
      .sort({ createdAt: -1 });
    res.json(listings);
  } catch (error) {
    console.error("Get listings error:", error);
    res.status(500).json({ error: "Server error" });
  }
};

// @desc    Get single user listing
// @route   GET /api/user-listings/:slug
// @access  Public
export const getSingleListing = async (req, res) => {
  try {
    const listing = await userListingModel
      .findOne({ slug: req.params.slug })
      .select("-photo")
      .populate("user", "name email");
    
    if (!listing) {
      return res.status(404).json({ error: "Listing not found" });
    }
    
    res.json(listing);
  } catch (error) {
    console.error("Get single listing error:", error);
    res.status(500).json({ error: "Server error" });
  }
};

// @desc    Get listing photo
// @route   GET /api/user-listings/photo/:listingId
// @access  Public
export const getListingPhoto = async (req, res) => {
  try {
    const listing = await userListingModel.findById(req.params.listingId).select("photo");
    if (!listing || !listing.photo.data) {
      return res.status(404).json({ error: "Photo not found" });
    }
    res.set("Content-Type", listing.photo.contentType);
    return res.send(listing.photo.data);
  } catch (error) {
    console.error("Get photo error:", error);
    res.status(500).json({ error: "Server error" });
  }
};

// @desc    Update user listing
// @route   PUT /api/user-listings/:slug
// @access  Private
export const updateListing = async (req, res) => {
  try {
    const { title, description, category, condition, price } = req.fields;
    const listing = await userListingModel.findOne({ slug: req.params.slug });

    if (!listing) {
      return res.status(404).json({ error: "Listing not found" });
    }

    // Check if user owns the listing
    if (listing.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: "Not authorized" });
    }

    // Update fields
    if (title) listing.title = title;
    if (description) listing.description = description;
    if (category) listing.category = category;
    if (condition) listing.condition = condition;
    if (price) listing.price = price;
    if (title) listing.slug = slugify(title, { lower: true });

    // Handle photo upload
    if (req.files.photo) {
      if (req.files.photo.size > 2 * 1024 * 1024) {
        return res.status(400).json({ error: "Image should be under 2MB" });
      }
      listing.photo.data = fs.readFileSync(req.files.photo.path);
      listing.photo.contentType = req.files.photo.type;
    }

    await listing.save();
    res.json({ message: "Listing updated successfully", listing });
  } catch (error) {
    console.error("Update listing error:", error);
    res.status(500).json({ error: "Server error" });
  }
};

// @desc    Delete user listing
// @route   DELETE /api/user-listings/:slug
// @access  Private
export const deleteListing = async (req, res) => {
  try {
    const listing = await userListingModel.findOne({ slug: req.params.slug });

    if (!listing) {
      return res.status(404).json({ error: "Listing not found" });
    }

    // Check if user owns the listing
    if (listing.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: "Not authorized" });
    }

    await listing.deleteOne();
    res.json({ message: "Listing deleted successfully" });
  } catch (error) {
    console.error("Delete listing error:", error);
    res.status(500).json({ error: "Server error" });
  }
};

// @desc    Mark listing as sold
// @route   PUT /api/user-listings/:slug/sold
// @access  Private
export const markAsSold = async (req, res) => {
  try {
    const listing = await userListingModel.findOne({ slug: req.params.slug });

    if (!listing) {
      return res.status(404).json({ error: "Listing not found" });
    }

    // Check if user owns the listing
    if (listing.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: "Not authorized" });
    }

    listing.isSold = true;
    await listing.save();
    res.json({ message: "Listing marked as sold" });
  } catch (error) {
    console.error("Mark as sold error:", error);
    res.status(500).json({ error: "Server error" });
  }
};

// @desc    Get user's listings
// @route   GET /api/user-listings/user/:userId
// @access  Public
export const getUserListings = async (req, res) => {
  try {
    const listings = await userListingModel
      .find({ user: req.params.userId })
      .select("-photo")
      .populate("user", "name email")
      .sort({ createdAt: -1 });
    res.json(listings);
  } catch (error) {
    console.error("Get user listings error:", error);
    res.status(500).json({ error: "Server error" });
  }
};
