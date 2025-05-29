import express from "express";
import {
  forgotPasswordController,
  loginController,
  orderController,
  allOrderController,
  registerController,
  testController,
  updateProfileController,
  orderStatusController,
} from "../controller/authController.js";
import { isAdmin, requireSignIn } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/register", registerController);

router.post("/login", loginController);

router.post("/forgotPassword", forgotPasswordController);

router.get("/user-auth", requireSignIn, (req, res) => {
  res.status(200).send({ ok: true });
});

router.get("/admin-auth", requireSignIn, isAdmin, (req, res) => {
  res.status(200).send({
    ok: true,
  });
});

router.put("/profile", requireSignIn, updateProfileController);

router.get("/order", requireSignIn, orderController);
router.get("/all-order", requireSignIn, isAdmin, allOrderController);
router.put(
  "/order-status/:orderId",
  requireSignIn,
  isAdmin,
  orderStatusController
);

router.get("/test", requireSignIn, isAdmin, testController);

export default router;
