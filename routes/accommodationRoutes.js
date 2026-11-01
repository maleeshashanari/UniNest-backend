import express from "express";

import authorizeUser from "../middleware/jwtMiddleware.js";
import { authorizeRoles } from "../middleware/authorizeRoleMiddleware.js";

import {
    addAccommodation,
    getAllAccommodations,
    getPublicAccommodations,
    getSingleAccommodation,
    updateAccommodation,
    deleteAccommodation
} from "../controllers/accommodationController.js";

const accommodationRouter = express.Router();

// Public: view available accommodations
accommodationRouter.get(
    "/public",
    getPublicAccommodations
);

// Admin: view all accommodations
accommodationRouter.get(
    "/all",
    authorizeUser,
    authorizeRoles("admin"),
    getAllAccommodations
);

// Admin: add accommodation
accommodationRouter.post(
    "/add",
    authorizeUser,
    authorizeRoles("admin"),
    addAccommodation
);

// Admin: update accommodation
accommodationRouter.put(
    "/:id/update",
    authorizeUser,
    authorizeRoles("admin"),
    updateAccommodation
);

// Admin: delete accommodation
accommodationRouter.delete(
    "/:id/delete",
    authorizeUser,
    authorizeRoles("admin"),
    deleteAccommodation
);

// Public: view single accommodation
accommodationRouter.get(
    "/:id",
    getSingleAccommodation
);

export default accommodationRouter;