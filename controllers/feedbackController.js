import mongoose from "mongoose";

import Feedback from "../models/feedbackModel.js";
import Accommodation from "../models/accommodationModel.js";
import User from "../models/userModel.js";

// Get the logged-in user's ID from the JWT payload
function getUserId(req) {
    return req.user?.id || req.user?._id || req.user?.userId;
}

// Create a new feedback
export const addFeedback = async (req, res) => {
    try {
        const { accommodation, rating, comment } = req.body;

        if (!accommodation || !rating || !comment) {
            return res.status(400).json({
                message: "Accommodation, rating and comment are required"
            });
        }

        if (!mongoose.Types.ObjectId.isValid(accommodation)) {
            return res.status(400).json({
                message: "Invalid accommodation ID"
            });
        }

        if (!Number.isInteger(Number(rating)) || rating < 1 || rating > 5) {
            return res.status(400).json({
                message: "Rating must be between 1 and 5"
            });
        }

        if (typeof comment !== "string" || comment.trim().length < 3 || comment.trim().length > 1000) {
            return res.status(400).json({
                message: "Comment must contain between 3 and 1000 characters"
            });
        }

        const userId = getUserId(req);

        const student = await User.findById(userId);

        if (!student) {
            return res.status(404).json({
                message: "Student account not found"
            });
        }

        const accommodationExists = await Accommodation.findById(accommodation);

        if (!accommodationExists) {
            return res.status(404).json({
                message: "Accommodation not found"
            });
        }

        const feedback = await Feedback.create({
            accommodation,
            student: student._id,
            studentName: `${student.firstName} ${student.lastName}`.trim(),
            studentEmail: student.email,
            university: student.university || "",
            rating: Number(rating),
            comment: comment.trim()
        });

        return res.status(201).json({
            message: "Feedback submitted successfully",
            feedback
        });

    } catch (error) {
        if (error.code === 11000) {
            return res.status(409).json({
                message: "You have already submitted feedback for this accommodation"
            });
        }

        console.log("Add feedback error:", error);

        return res.status(500).json({
            message: "Failed to submit feedback"
        });
    }
};


// Get all feedback for one accommodation
export const getAccommodationFeedback = async (req, res) => {
    try {
        const { accommodationId } = req.params;
        const { university, sort = "newest" } = req.query;

        if (!mongoose.Types.ObjectId.isValid(accommodationId)) {
            return res.status(400).json({
                message: "Invalid accommodation ID"
            });
        }

        const accommodationExists = await Accommodation.findById(accommodationId);

        if (!accommodationExists) {
            return res.status(404).json({
                message: "Accommodation not found"
            });
        }

        const filter = {
            accommodation: accommodationId
        };

        // Search reviews by the reviewer's university
        if (university && university.trim()) {
            filter.university = {
                $regex: university.trim(),
                $options: "i"
            };
        }

        // Sort reviews based on the selected option
        let sortOption = { createdAt: -1 };

        if (sort === "lowest") {
            sortOption = { rating: 1, createdAt: -1 };
        } else if (sort === "highest") {
            sortOption = { rating: -1, createdAt: -1 };
        }

        const feedbacks = await Feedback.find(filter)
            .sort(sortOption);

        return res.status(200).json({
            totalFeedbacks: feedbacks.length,
            feedbacks
        });

    } catch (error) {
        console.log("Get accommodation feedback error:", error);

        return res.status(500).json({
            message: "Failed to get accommodation feedback"
        });
    }
};


// Get only the logged-in student's feedback
export const getMyFeedback = async (req, res) => {
    try {
        const userId = getUserId(req);

        const feedbacks = await Feedback.find({
            student: userId
        })
            .populate("accommodation", "accommodationId title type location university")
            .sort({ createdAt: -1 });

        return res.status(200).json({
            totalFeedbacks: feedbacks.length,
            feedbacks
        });

    } catch (error) {
        console.log("Get my feedback error:", error);

        return res.status(500).json({
            message: "Failed to get your feedback"
        });
    }
};


// Update the logged-in student's own feedback
export const updateMyFeedback = async (req, res) => {
    try {
        const { id } = req.params;
        const { rating, comment } = req.body;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                message: "Invalid feedback ID"
            });
        }

        if (rating === undefined && comment === undefined) {
            return res.status(400).json({
                message: "Please provide rating or comment to update"
            });
        }

        const feedback = await Feedback.findOne({
            _id: id,
            student: getUserId(req)
        });

        if (!feedback) {
            return res.status(404).json({
                message: "Feedback not found or you are not allowed to update it"
            });
        }

        if (rating !== undefined) {
            if (!Number.isInteger(Number(rating)) || rating < 1 || rating > 5) {
                return res.status(400).json({
                    message: "Rating must be between 1 and 5"
                });
            }

            feedback.rating = Number(rating);
        }

        if (comment !== undefined) {
            if (typeof comment !== "string" || comment.trim().length < 3 || comment.trim().length > 1000) {
                return res.status(400).json({
                    message: "Comment must contain between 3 and 1000 characters"
                });
            }

            feedback.comment = comment.trim();
        }

        await feedback.save();

        return res.status(200).json({
            message: "Your feedback updated successfully",
            feedback
        });

    } catch (error) {
        console.log("Update feedback error:", error);

        return res.status(500).json({
            message: "Failed to update feedback"
        });
    }
};


// Delete the logged-in student's own feedback
export const deleteMyFeedback = async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                message: "Invalid feedback ID"
            });
        }

        const feedback = await Feedback.findOneAndDelete({
            _id: id,
            student: getUserId(req)
        });

        if (!feedback) {
            return res.status(404).json({
                message: "Feedback not found or you are not allowed to delete it"
            });
        }

        return res.status(200).json({
            message: "Your feedback deleted successfully"
        });

    } catch (error) {
        console.log("Delete feedback error:", error);

        return res.status(500).json({
            message: "Failed to delete feedback"
        });
    }
};


// Admin: view all feedback
export const getAllFeedback = async (req, res) => {
    try {
        const { university, sort = "newest" } = req.query;

        const filter = {};

        if (university && university.trim()) {
            filter.university = {
                $regex: university.trim(),
                $options: "i"
            };
        }

        let sortOption = { createdAt: -1 };

        if (sort === "lowest") {
            sortOption = { rating: 1, createdAt: -1 };
        } else if (sort === "highest") {
            sortOption = { rating: -1, createdAt: -1 };
        }

        const feedbacks = await Feedback.find(filter)
            .populate("accommodation", "accommodationId title")
            .sort(sortOption);

        return res.status(200).json({
            totalFeedbacks: feedbacks.length,
            feedbacks
        });

    } catch (error) {
        console.log("Get all feedback error:", error);

        return res.status(500).json({
            message: "Failed to get all feedback"
        });
    }
};


// Admin: update any feedback
export const adminUpdateFeedback = async (req, res) => {
    try {
        const { id } = req.params;
        const { rating, comment } = req.body;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                message: "Invalid feedback ID"
            });
        }

        if (rating === undefined && comment === undefined) {
            return res.status(400).json({
                message: "Please provide rating or comment to update"
            });
        }

        const feedback = await Feedback.findById(id);

        if (!feedback) {
            return res.status(404).json({
                message: "Feedback not found"
            });
        }

        if (rating !== undefined) {
            if (!Number.isInteger(Number(rating)) || rating < 1 || rating > 5) {
                return res.status(400).json({
                    message: "Rating must be between 1 and 5"
                });
            }

            feedback.rating = Number(rating);
        }

        if (comment !== undefined) {
            if (typeof comment !== "string" || comment.trim().length < 3 || comment.trim().length > 1000) {
                return res.status(400).json({
                    message: "Comment must contain between 3 and 1000 characters"
                });
            }

            feedback.comment = comment.trim();
        }

        await feedback.save();

        return res.status(200).json({
            message: "Feedback updated successfully by admin",
            feedback
        });

    } catch (error) {
        console.log("Admin update feedback error:", error);

        return res.status(500).json({
            message: "Failed to update feedback"
        });
    }
};


// Admin: delete any feedback
export const adminDeleteFeedback = async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                message: "Invalid feedback ID"
            });
        }

        const feedback = await Feedback.findByIdAndDelete(id);

        if (!feedback) {
            return res.status(404).json({
                message: "Feedback not found"
            });
        }

        return res.status(200).json({
            message: "Feedback deleted successfully by admin"
        });

    } catch (error) {
        console.log("Admin delete feedback error:", error);

        return res.status(500).json({
            message: "Failed to delete feedback"
        });
    }
};


// Admin: reply to a feedback
export const adminReplyFeedback = async (req, res) => {
    try {
        const { id } = req.params;
        const { adminReply } = req.body;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                message: "Invalid feedback ID"
            });
        }

        if (typeof adminReply !== "string" || !adminReply.trim() || adminReply.trim().length > 1000) {
            return res.status(400).json({
                message: "Reply is required and must not exceed 1000 characters"
            });
        }

        const feedback = await Feedback.findById(id);

        if (!feedback) {
            return res.status(404).json({
                message: "Feedback not found"
            });
        }

        feedback.adminReply = adminReply.trim();
        feedback.repliedAt = new Date();

        await feedback.save();

        return res.status(200).json({
            message: "Admin reply added successfully",
            feedback
        });

    } catch (error) {
        console.log("Admin reply feedback error:", error);

        return res.status(500).json({
            message: "Failed to reply to feedback"
        });
    }
};