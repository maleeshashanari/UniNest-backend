import express from "express";

import authorizeUser from "../middleware/jwtMiddleware.js";
import { authorizeRoles } from "../middleware/authorizeRoleMiddleware.js";

import {
    addFeedback,
    getAccommodationFeedback,
    getMyFeedback,
    updateMyFeedback,
    deleteMyFeedback,
    getAllFeedback,
    adminUpdateFeedback,
    adminDeleteFeedback,
    adminReplyFeedback
} from "../controllers/feedbackController.js";

const feedbackRouter = express.Router();

// Student routes
feedbackRouter.post(
    "/add",
    authorizeUser,
    authorizeRoles("student"),
    addFeedback
);

feedbackRouter.get(
    "/my",
    authorizeUser,
    authorizeRoles("student"),
    getMyFeedback
);

feedbackRouter.put(
    "/my/:id",
    authorizeUser,
    authorizeRoles("student"),
    updateMyFeedback
);

feedbackRouter.delete(
    "/my/:id",
    authorizeUser,
    authorizeRoles("student"),
    deleteMyFeedback
);

// View reviews for a particular accommodation
feedbackRouter.get(
    "/accommodation/:accommodationId",
    authorizeUser,
    authorizeRoles("student"),
    getAccommodationFeedback
);

// Admin routes
feedbackRouter.get(
    "/all",
    authorizeUser,
    authorizeRoles("admin"),
    getAllFeedback
);

feedbackRouter.put(
    "/admin/:id",
    authorizeUser,
    authorizeRoles("admin"),
    adminUpdateFeedback
);

feedbackRouter.delete(
    "/admin/:id",
    authorizeUser,
    authorizeRoles("admin"),
    adminDeleteFeedback
);

feedbackRouter.put(
    "/admin/:id/reply",
    authorizeUser,
    authorizeRoles("admin"),
    adminReplyFeedback
);

export default feedbackRouter;