import mongoose from "mongoose";

const feedbackSchema = new mongoose.Schema(
    {
        // Connect the feedback to an accommodation
        accommodation: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Accommodation",
            required: true
        },

        // Store the student who submitted the feedback
        student: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },

        // Store student details for displaying the review
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

        university: {
            type: String,
            default: "",
            trim: true
        },

        // Allow ratings from 1 to 5
        rating: {
            type: Number,
            required: true,
            min: 1,
            max: 5
        },

        // Student's written feedback
        comment: {
            type: String,
            required: true,
            trim: true,
            minlength: 3,
            maxlength: 1000
        },

        // Admin's optional reply
        adminReply: {
            type: String,
            default: "",
            trim: true,
            maxlength: 1000
        },

        repliedAt: {
            type: Date,
            default: null
        }
    },
    {
        timestamps: true
    }
);

// Allow only one review per student for each accommodation
feedbackSchema.index(
    { accommodation: 1, student: 1 },
    { unique: true }
);

const Feedback = mongoose.model("Feedback", feedbackSchema);

export default Feedback;