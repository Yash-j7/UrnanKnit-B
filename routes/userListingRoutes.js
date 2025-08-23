import express from "express";
import {
  createUserListing,
  getAllListings,
  getSingleListing,
  getListingPhoto,
  updateListing,
  deleteListing,
  markAsSold,
  getUserListings,
} from "../controller/userListingController.js";
import { requireSignIn } from "../middleware/authMiddleware.js";
import formidable from "express-formidable";
const router = express.Router();

// Public routes
router.get("/", getAllListings);
router.get("/:slug", getSingleListing);
router.get("/photo/:listingId", getListingPhoto);
router.get("/user/:userId", getUserListings);

// Protected routes
router.post(
  "/",
  requireSignIn,
  formidable({ multiples: false }), // only here
  createUserListing
);router.put("/:slug", requireSignIn, updateListing);
router.delete("/:slug", requireSignIn, deleteListing);
router.put("/:slug/sold", requireSignIn, markAsSold);

export default router;
