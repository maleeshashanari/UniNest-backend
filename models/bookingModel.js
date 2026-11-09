import mongoose from "mongoose";

const bookingSchema = new mongoose.Schema(
    {
        // Connect the booking to an accommodation
        accommodation: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Accommodation",
            required: true
        },

        // Store the student who made the booking
        student: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },

        studentName: {
            type: String,
            required: true,
            trim: true
        },

        studentEmail: {
            type: String,
            required: true,
            lowercase: true,
            trim: true
        },

        studentPhone: {
            type: String,
            required: true,
            trim: true
        },

        university: {
            type: String,
            default: "",
            trim: true
        },

        // Date the student plans to move in
        moveInDate: {
            type: Date,
            required: true
        },

        numberOfRooms: {
            type: Number,
            required: true,
            default: 1,
            min: 1
        },

        numberOfStudents: {
            type: Number,
            required: true,
            default: 1,
            min: 1
        },

        message: {
            type: String,
            default: "",
            trim: true,
            maxlength: 500
        },

        // Admin manages the booking lifecycle
        status: {
            type: String,
            enum: [
                "Pending",
                "Confirmed",
                "Occupied",
                "Rejected",
                "Cancelled",
                "Completed"
            ],
            default: "Pending"
        },

        adminNote: {
            type: String,
            default: "",
            trim: true,
            maxlength: 500
        },

        // Record when the student leaves the accommodation
        completedAt: {
            type: Date,
            default: null
        }
    },
    {
        timestamps: true
    }
);

const Booking = mongoose.model("Booking", bookingSchema);

export default Booking;