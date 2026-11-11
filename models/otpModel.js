import mongoose from "mongoose";

// Creating an OTP Schema
const otpSchema = new mongoose.Schema(
    {
        email: {
            type: String,
            required: true,
            lowercase: true,
            trim: true,
            unique: true
        },

        otpHash: {
            type: String,
            required: true
        },

        expiresAt: {
            type: Date,
            required: true,
            expires: 0
        }
    },
    {
        timestamps: true
    }
);

// Creating a model from the schema
const OTP = mongoose.model("OTP", otpSchema);

// Exporting the model
export default OTP;