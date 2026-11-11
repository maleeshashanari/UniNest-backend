// Import express
import express from "express";
// Import user controller functions
import { registerUser, loginUser, updateUserProfile, changeUserPassword } from "../controllers/userController.js";
import { authorizeRoles } from "../middleware/authorizeRoleMiddleware.js";
import authorizeUser from "../middleware/jwtMiddleware.js";

// Create a router object
const userRouter = express.Router();

// User registration
userRouter.post("/register", registerUser);
// User login
userRouter.post("/login", loginUser);

// Update user profile
userRouter.put(
    "/profile",
    authorizeUser,
    authorizeRoles("student", "admin"),
    updateUserProfile
);

// Change user password
userRouter.put(
    "/change-password",
    authorizeUser,
    authorizeRoles("student", "admin"),
    changeUserPassword
);

// Export router
export default userRouter;
