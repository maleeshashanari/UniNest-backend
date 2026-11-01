
import mongoose from "mongoose";

// Accommodation Schema
const accommodationSchema = new mongoose.Schema(
    {
        // Public readable accommodation ID
        accommodationId: {
            type: String,
            required: true,
            unique: true,
            trim: true
        },

        // Accommodation name
        title: {
            type: String,
            required: true,
            trim: true
        },

        // Description
        description: {
            type: String,
            required: true,
            trim: true
        },

        // Accommodation type
        type: {
            type: String,
            enum: ["Hostel", "Boarding", "Apartment", "Annex", "House"],
            required: true
        },

        // Suitable for boys, girls or anyone
        suitableFor: {
            type: String,
            enum: ["Boys", "Girls", "Any"],
            default: "Any"
        },

        // Monthly rental price
        monthlyRent: {
            type: Number,
            required: true,
            min: 0
        },

        // Security deposit
        securityDeposit: {
            type: Number,
            default: 0,
            min: 0
        },

        // Location
        location: {
            address: {
                type: String,
                required: true,
                trim: true
            },
            city: {
                type: String,
                required: true,
                trim: true
            },
            district: {
                type: String,
                default: "",
                trim: true
            }
        },

        // Nearby university
        university: {
            type: String,
            default: "",
            trim: true
        },

        // Total number of rooms
        totalRooms: {
            type: Number,
            default: 1,
            min: 1
        },

        // Number of available rooms
        availableRooms: {
            type: Number,
            default: 1,
            min: 0
        },

        // Accommodation facilities
        amenities: {
            type: [String],
            default: []
        },

        // Accommodation images
        images: {
            type: [String],
            default: ["/images/default-accommodation.png"]
        },

        // Contact number
        contactNumber: {
            type: String,
            required: true,
            trim: true
        },

        // Accommodation availability
        isAvailable: {
            type: Boolean,
            default: true
        }
    },
    {
        timestamps: true
    }
);

// Create model
const Accommodation = mongoose.model(
    "Accommodation",
    accommodationSchema
);

export default Accommodation;