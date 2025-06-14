import mongoose from "mongoose";

const userListingSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "users", // reference to the user model
    required: true,
  },
  slug: {
    type: String,
    required: true,
  },
  title: {
    type: String,
    required: true,
    trim: true,
  },
  description: {
    type: String,
    required: true,
    maxlength: 2000,
  },
  category: {
    type: String,
    enum: ["Boots", "Jersey", "Accessories", "Signed Memorabilia", "Other"],
    required: true,
  },
  condition: {
    type: String,
    enum: ["New", "Used", "Signed"],
    required: true,
  },
  price: {
    type: Number,
    required: true,
    min: 0,
  },
  photo: {
    data: Buffer,
    contentType: String,
  },
  isSold: {
    type: Boolean,
    default: false,
  },

  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const UserListing = mongoose.model("UserListing", userListingSchema);

export default UserListing;
