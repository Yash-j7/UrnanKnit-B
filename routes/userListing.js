import express from "express";
import { isAdmin, requireSignIn } from "./../middleware/authMiddleware.js";
import { createUserListing } from "./../controller/userListingController.js";

const router = express.Router();

router.post("/userListing", requireSignIn, isAdmin, createUserListing);
// router.put(
//   "/update-userListing/:id",
//   requireSignIn,
//   isAdmin,
//   updateUserListingController
// );
// router.get("/get-UserListing", getUserListingController);
// router.get("/single-UserListing/:UserListing", getSingleUserListingController);
// router.delete(
//   "/delete-UserListing/:id",
//   requireSignIn,
//   isAdmin,
//   deleteUserListingController
// );

export default router;
