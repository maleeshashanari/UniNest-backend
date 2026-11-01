// Import express
import express from "express";
// Import user controller functions
import { registerUser, loginUser } from "../controllers/userController.js";

// Create a router object
const userRouter = express.Router();

// User registration
userRouter.post("/register", registerUser);
// User login
userRouter.post("/login", loginUser);

// Export router
export default userRouter;
