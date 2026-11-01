// Import mongoose
import mongoose from "mongoose";

// Creating a User Schema
const userSchema = new mongoose.Schema(
    {
        firstName: {
            type: String,
            required: true,
            trim: true
        },

        lastName: {
            type: String,
            required: true,
            trim: true
        },

        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true
        },

        password: {
            type: String,
            required: true,
            minlength: 8
        },

        phone: {
            type: String,
            required: true,
            trim: true
        },

        university: {
            type: String,
            default: "",
            trim: true
        },

        image: {
            type: String,
            default: "/images/default-profile.png"
        },

        role: {
            type: String,
            required: true,
            enum: ["student", "admin"],
            default: "student"
        },

        isBlocked: {
            type: Boolean,
            default: false
        },

        lastLogin: {
            type: Date,
            default: null
        }
    },
    {
        timestamps: true
    }
);

// Creating a model from the schema
const User = mongoose.model("User", userSchema);

// Exporting the model
export default User;