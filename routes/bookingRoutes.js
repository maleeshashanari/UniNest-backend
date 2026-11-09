import express from "express";

import authorizeUser from "../middleware/jwtMiddleware.js";
import { authorizeRoles } from "../middleware/authorizeRoleMiddleware.js";

import {
    createBooking,
    getMyBookings,
    cancelMyBooking,
    getAllBookings,
    getAccommodationBookings,
    updateBookingStatus
} from "../controllers/bookingController.js";

const bookingRouter = express.Router();

// Student routes
bookingRouter.post(
    "/",
    authorizeUser,
    authorizeRoles("student"),
    createBooking
);

bookingRouter.get(
    "/my",
    authorizeUser,
    authorizeRoles("student"),
    getMyBookings
);

bookingRouter.put(
    "/my/:id/cancel",
    authorizeUser,
    authorizeRoles("student"),
    cancelMyBooking
);

// Admin routes
bookingRouter.get(
    "/admin/all",
    authorizeUser,
    authorizeRoles("admin"),
    getAllBookings
);

bookingRouter.get(
    "/admin/accommodation/:accommodationId",
    authorizeUser,
    authorizeRoles("admin"),
    getAccommodationBookings
);

bookingRouter.put(
    "/admin/:id/status",
    authorizeUser,
    authorizeRoles("admin"),
    updateBookingStatus
);

export default bookingRouter;