import mongoose from "mongoose";

import Booking from "../models/bookingModel.js";
import Accommodation from "../models/accommodationModel.js";
import User from "../models/userModel.js";

// Get the logged-in user's ID from the JWT payload
function getUserId(req) {
    return req.user?.id || req.user?._id || req.user?.userId;
}


// Deduct rooms when a booking is confirmed
async function deductRooms(accommodationId, numberOfRooms) {
    const accommodation = await Accommodation.findOneAndUpdate(
        {
            _id: accommodationId,
            availableRooms: { $gte: numberOfRooms }
        },
        [
            {
                $set: {
                    availableRooms: {
                        $subtract: ["$availableRooms", numberOfRooms]
                    }
                }
            },
            {
                $set: {
                    isAvailable: {
                        $gt: ["$availableRooms", 0]
                    }
                }
            }
        ],
        { new: true }
    );

    return accommodation;
}


// Return rooms when a student leaves or a confirmed booking is cancelled
async function returnRooms(accommodationId, numberOfRooms) {
    const accommodation = await Accommodation.findOneAndUpdate(
        {
            _id: accommodationId,
            $expr: {
                $lte: [
                    { $add: ["$availableRooms", numberOfRooms] },
                    "$totalRooms"
                ]
            }
        },
        [
            {
                $set: {
                    availableRooms: {
                        $add: ["$availableRooms", numberOfRooms]
                    }
                }
            },
            {
                $set: {
                    isAvailable: {
                        $gt: ["$availableRooms", 0]
                    }
                }
            }
        ],
        { new: true }
    );

    return accommodation;
}


// Student: create a booking request
export const createBooking = async (req, res) => {
    try {
        const {
            accommodation,
            moveInDate,
            numberOfRooms = 1,
            numberOfStudents = 1,
            message = ""
        } = req.body;

        if (!accommodation || !moveInDate) {
            return res.status(400).json({
                message: "Accommodation and move-in date are required"
            });
        }

        if (!mongoose.Types.ObjectId.isValid(accommodation)) {
            return res.status(400).json({
                message: "Invalid accommodation ID"
            });
        }

        const rooms = Number(numberOfRooms);
        const students = Number(numberOfStudents);

        if (!Number.isInteger(rooms) || rooms < 1) {
            return res.status(400).json({
                message: "Number of rooms must be at least 1"
            });
        }

        if (!Number.isInteger(students) || students < 1) {
            return res.status(400).json({
                message: "Number of students must be at least 1"
            });
        }

        const startDate = new Date(moveInDate);

        if (Number.isNaN(startDate.getTime())) {
            return res.status(400).json({
                message: "Invalid move-in date"
            });
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const requestedDate = new Date(startDate);
        requestedDate.setHours(0, 0, 0, 0);

        if (requestedDate < today) {
            return res.status(400).json({
                message: "Move-in date cannot be in the past"
            });
        }

        if (
            typeof message !== "string" ||
            message.trim().length > 500
        ) {
            return res.status(400).json({
                message: "Message must not exceed 500 characters"
            });
        }

        const student = await User.findById(getUserId(req));

        if (!student) {
            return res.status(404).json({
                message: "Student account not found"
            });
        }

        if (!student.phone || !student.phone.trim()) {
            return res.status(400).json({
                message: "Please add your phone number to your profile before booking"
            });
        }

        const accommodationExists = await Accommodation.findById(accommodation);

        if (!accommodationExists || !accommodationExists.isAvailable) {
            return res.status(404).json({
                message: "Accommodation is not available"
            });
        }

        if (accommodationExists.availableRooms < rooms) {
            return res.status(400).json({
                message: "Not enough rooms are currently available"
            });
        }

        const booking = await Booking.create({
            accommodation,
            student: student._id,
            studentName: `${student.firstName} ${student.lastName}`.trim(),
            studentEmail: student.email,
            studentPhone: student.phone,
            university: student.university || "",
            moveInDate: startDate,
            numberOfRooms: rooms,
            numberOfStudents: students,
            message: message.trim(),
            status: "Pending"
        });

        return res.status(201).json({
            message: "Booking request submitted successfully. Waiting for admin approval.",
            booking
        });

    } catch (error) {
        console.log("Create booking error:", error);

        return res.status(500).json({
            message: "Failed to create booking"
        });
    }
};


// Student: view only their own bookings
export const getMyBookings = async (req, res) => {
    try {
        const bookings = await Booking.find({
            student: getUserId(req)
        })
            .populate(
                "accommodation",
                "accommodationId title type location monthlyRent images"
            )
            .sort({ createdAt: -1 });

        return res.status(200).json({
            totalBookings: bookings.length,
            bookings
        });

    } catch (error) {
        console.log("Get my bookings error:", error);

        return res.status(500).json({
            message: "Failed to get your bookings"
        });
    }
};


// Student: cancel their own pending booking
export const cancelMyBooking = async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                message: "Invalid booking ID"
            });
        }

        const booking = await Booking.findOneAndUpdate(
            {
                _id: id,
                student: getUserId(req),
                status: "Pending"
            },
            {
                $set: { status: "Cancelled" }
            },
            { new: true }
        );

        if (!booking) {
            return res.status(400).json({
                message: "Booking not found or it cannot be cancelled by you. Contact the admin if it is already confirmed."
            });
        }

        return res.status(200).json({
            message: "Booking cancelled successfully",
            booking
        });

    } catch (error) {
        console.log("Cancel booking error:", error);

        return res.status(500).json({
            message: "Failed to cancel booking"
        });
    }
};


// Admin: view all bookings
export const getAllBookings = async (req, res) => {
    try {
        const bookings = await Booking.find()
            .populate(
                "accommodation",
                "accommodationId title type location monthlyRent"
            )
            .populate(
                "student",
                "firstName lastName email phone university"
            )
            .sort({ createdAt: -1 });

        return res.status(200).json({
            totalBookings: bookings.length,
            bookings
        });

    } catch (error) {
        console.log("Get all bookings error:", error);

        return res.status(500).json({
            message: "Failed to get all bookings"
        });
    }
};


// Admin: view bookings for one accommodation
export const getAccommodationBookings = async (req, res) => {
    try {
        const { accommodationId } = req.params;

        if (!mongoose.Types.ObjectId.isValid(accommodationId)) {
            return res.status(400).json({
                message: "Invalid accommodation ID"
            });
        }

        const bookings = await Booking.find({
            accommodation: accommodationId
        })
            .populate(
                "student",
                "firstName lastName email phone university"
            )
            .populate(
                "accommodation",
                "accommodationId title type location monthlyRent"
            )
            .sort({ createdAt: -1 });

        return res.status(200).json({
            totalBookings: bookings.length,
            bookings
        });

    } catch (error) {
        console.log("Get accommodation bookings error:", error);

        return res.status(500).json({
            message: "Failed to get accommodation bookings"
        });
    }
};


// Admin: update booking status and note
export const updateBookingStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status, adminNote = "" } = req.body;

        const allowedTransitions = {
            Pending: ["Confirmed", "Rejected", "Cancelled"],
            Confirmed: ["Occupied", "Cancelled"],
            Occupied: ["Completed"]
        };

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                message: "Invalid booking ID"
            });
        }

        if (typeof adminNote !== "string" || adminNote.trim().length > 500) {
            return res.status(400).json({
                message: "Admin note must not exceed 500 characters"
            });
        }

        const booking = await Booking.findById(id);

        if (!booking) {
            return res.status(404).json({
                message: "Booking not found"
            });
        }

        const oldStatus = booking.status;

        if (!allowedTransitions[oldStatus]?.includes(status)) {
            return res.status(400).json({
                message: `Cannot change booking from ${oldStatus} to ${status}`
            });
        }

        // Change status only if it still has the expected previous status
        const updatedBooking = await Booking.findOneAndUpdate(
            {
                _id: id,
                status: oldStatus
            },
            {
                $set: {
                    status,
                    adminNote: adminNote.trim(),
                    ...(status === "Completed" ? { completedAt: new Date() } : {})
                }
            },
            { new: true }
        );

        if (!updatedBooking) {
            return res.status(409).json({
                message: "This booking was updated by another request. Please refresh and try again."
            });
        }

        // Deduct rooms when admin confirms the booking
        if (status === "Confirmed") {
            const accommodation = await deductRooms(
                booking.accommodation,
                booking.numberOfRooms
            );

            if (!accommodation) {
                await Booking.findOneAndUpdate(
                    { _id: id, status: "Confirmed" },
                    { $set: { status: oldStatus, adminNote: booking.adminNote } }
                );

                return res.status(400).json({
                    message: "Not enough rooms are available to confirm this booking"
                });
            }
        }

        // Return rooms when a confirmed booking is cancelled
        // or when an occupied booking is completed
        if (
            (oldStatus === "Confirmed" && status === "Cancelled") ||
            (oldStatus === "Occupied" && status === "Completed")
        ) {
            const accommodation = await returnRooms(
                booking.accommodation,
                booking.numberOfRooms
            );

            if (!accommodation) {
                await Booking.findOneAndUpdate(
                    { _id: id, status },
                    {
                        $set: {
                            status: oldStatus,
                            adminNote: booking.adminNote,
                            completedAt: null
                        }
                    }
                );

                return res.status(409).json({
                    message: "Could not return the rooms. Please check the accommodation room counts."
                });
            }
        }

        return res.status(200).json({
            message: "Booking status updated successfully",
            booking: updatedBooking
        });

    } catch (error) {
        console.log("Update booking status error:", error);

        return res.status(500).json({
            message: "Failed to update booking status"
        });
    }
};