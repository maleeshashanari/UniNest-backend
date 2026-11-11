// Import required packages and files
import bcrypt from "bcrypt";
import dotenv from "dotenv";
import jwt from "jsonwebtoken";
import User from "../models/userModel.js";
import { validatePassword } from "../utils/validatePassword.js";

dotenv.config();

// Register User
export async function registerUser(req, res) {
    try {

        // Get registration details
        let {
            firstName,
            lastName,
            email,
            password,
            confirmPassword,
            phone,
            university
        } = req.body;

        // Trim and normalize inputs
        firstName = firstName?.trim();
        lastName = lastName?.trim();
        email = email?.trim().toLowerCase();
        phone = phone?.trim();
        university = university?.trim();

        // Check required fields
        if (!firstName || !lastName || !email || !password || !confirmPassword || !phone) {
            return res.status(400).json({
                message: "All required fields must be filled"
            });
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if (!emailRegex.test(email)) {
            return res.status(400).json({
                message: "Invalid email format"
            });
        }

        // Check password confirmation
        if (password !== confirmPassword) {
            return res.status(400).json({
                message: "Passwords do not match"
            });
        }

        // Validate password strength
        const passwordErrors = validatePassword(password);

        if (passwordErrors.length > 0) {
            return res.status(400).json({
                message: `Password must contain ${passwordErrors.join(", ")}.`
            });
        }

        // Validate phone number
        if (!/^\d{10,15}$/.test(phone)) {
            return res.status(400).json({
                message: "Invalid phone number"
            });
        }

        // Check whether the user already exists
        const existingUser = await User.findOne({ email });

        if (existingUser) {
            return res.status(409).json({
                message: "User already exists"
            });
        }

        // Check PEPPER configuration
        if (!process.env.PEPPER) {
            return res.status(500).json({
                message: "Password security configuration is missing"
            });
        }

        // Hash the password with PEPPER
        const hashedPassword = await bcrypt.hash(
            password + process.env.PEPPER,
            10
        );

        // Create a new student account
        const user = new User({
            firstName,
            lastName,
            email,
            password: hashedPassword,
            phone,
            university,
            role: "student"
        });

        // Save the user to MongoDB
        await user.save();

        // Return success response
        return res.status(201).json({
            message: "Registration successful",
            user: {
                id: user._id,
                firstName: user.firstName,
                lastName: user.lastName,
                email: user.email,
                role: user.role
            }
        });

    } catch (error) {

        // Handle registration errors
        if (error.code === 11000) {
            return res.status(409).json({
                message: "User already exists"
            });
        }

        console.error("Registration error:", error);

        return res.status(500).json({
            message: "Registration failed"
        });
    }
}

// Login User
export async function loginUser(req, res) {
    try {

        // Get login details
        let { email, password } = req.body;

        // Normalize email
        email = email?.trim().toLowerCase();

        // Check required fields
        if (!email || !password) {
            return res.status(400).json({
                message: "Email and password are required"
            });
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if (!emailRegex.test(email)) {
            return res.status(400).json({
                message: "Invalid email format"
            });
        }

        // Find user by email
        const user = await User.findOne({ email });

        if (!user) {
            return res.status(401).json({
                message: "Invalid email or password"
            });
        }

        // Check whether the account is blocked
        if (user.isBlocked) {
            return res.status(403).json({
                message: "Your account is blocked. Please contact the administrator."
            });
        }

        // Check PEPPER configuration
        if (!process.env.PEPPER) {
            return res.status(500).json({
                message: "Password security configuration is missing"
            });
        }

        // Compare the password with PEPPER
        const isPasswordValid = await bcrypt.compare(
            password + process.env.PEPPER,
            user.password
        );

        if (!isPasswordValid) {
            return res.status(401).json({
                message: "Invalid email or password"
            });
        }

        // Generate JWT token
        const token = jwt.sign(
            {
                id: user._id.toString(),
                email: user.email,
                role: user.role
            },
            process.env.JWT_SECRET,
            {
                expiresIn: "48h"
            }
        );

        // Update last login time
        user.lastLogin = new Date();
        await user.save();

        // Return success response
        return res.status(200).json({
            message: "Login successful",
            token,
            user: {
                id: user._id,
                firstName: user.firstName,
                lastName: user.lastName,
                email: user.email,
                phone: user.phone,
                university: user.university,
                role: user.role,
                image: user.image
            }
        });

    } catch (error) {

        console.error("Login error:", error);

        return res.status(500).json({
            message: "Login failed"
        });
    }
}

// Update student profile
export async function updateUserProfile(req, res) {

    // Check user authentication
    if (!req.user) {
        return res.status(401).json({
            message: "Unauthorized"
        });
    }

    try {

        // Get updated profile details
        const { firstName, lastName, phone, university, image } = req.body;

        // Find logged-in user
        const user = await User.findOne({ email: req.user.email });

        if (!user) {
            return res.status(404).json({
                message: "User not found"
            });
        }

        // Validate required profile fields
        if (
            typeof firstName !== "string" || !firstName.trim() ||
            typeof lastName !== "string" || !lastName.trim() ||
            typeof phone !== "string" || !phone.trim()
        ) {
            return res.status(400).json({
                message: "First name, last name and phone are required"
            });
        }

        // Validate phone number
        if (!/^\d{10,15}$/.test(phone.trim())) {
            return res.status(400).json({
                message: "Invalid phone number"
            });
        }

        // Update profile information
        user.firstName = firstName.trim();
        user.lastName = lastName.trim();
        user.phone = phone.trim();

        // Update university if provided
        if (university !== undefined) {
            if (typeof university !== "string") {
                return res.status(400).json({
                    message: "Invalid university"
                });
            }

            user.university = university.trim();
        }

        // Update profile image if provided
        if (image !== undefined) {
            if (typeof image !== "string") {
                return res.status(400).json({
                    message: "Invalid profile image"
                });
            }

            user.image = image;
        }

        // Save updated user details
        await user.save();

        // Generate updated JWT token
        const token = jwt.sign(
            {
                id: user._id.toString(),
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName,
                phone: user.phone,
                university: user.university,
                image: user.image,
                role: user.role
            },
            process.env.JWT_SECRET,
            { expiresIn: "48h" }
        );

        // Return updated profile
        return res.status(200).json({
            message: "Profile updated successfully",
            token: token,
            user: {
                id: user._id,
                firstName: user.firstName,
                lastName: user.lastName,
                email: user.email,
                phone: user.phone,
                university: user.university,
                image: user.image,
                role: user.role
            }
        });

    } catch (error) {

        console.error("Update profile error:", error);

        return res.status(500).json({
            message: "Error updating profile"
        });
    }
}

// Change student password after login
export async function changeUserPassword(req, res) {

    // Check user authentication
    if (!req.user) {
        return res.status(401).json({
            message: "Unauthorized"
        });
    }

    try {

        // Get current and new passwords
        const { currentPassword, newPassword } = req.body;

        // Validate password fields
        if (!currentPassword || !newPassword) {
            return res.status(400).json({
                message: "Current password and new password are required"
            });
        }

        // Check new password length
        if (newPassword.length < 8) {
            return res.status(400).json({
                message: "New password must contain at least 8 characters"
            });
        }

        // Validate new password strength
        const passwordErrors = validatePassword(newPassword);

        if (passwordErrors.length > 0) {
            return res.status(400).json({
                message: `New password must contain ${passwordErrors.join(", ")}.`
            });
        }

        // Check PEPPER configuration
        if (!process.env.PEPPER) {
            return res.status(500).json({
                message: "Password security configuration is missing"
            });
        }

        // Find logged-in user
        const user = await User.findOne({ email: req.user.email });

        if (!user) {
            return res.status(404).json({
                message: "User not found"
            });
        }

        // Compare current password with PEPPER
        const isPasswordCorrect = await bcrypt.compare(
            currentPassword + process.env.PEPPER,
            user.password
        );

        if (!isPasswordCorrect) {
            return res.status(400).json({
                message: "Current password is incorrect"
            });
        }

        // Hash new password with PEPPER
        const hashedPassword = await bcrypt.hash(
            newPassword + process.env.PEPPER,
            10
        );

        // Update user password
        user.password = hashedPassword;

        // Save updated password
        await user.save();

        return res.status(200).json({
            message: "Password changed successfully"
        });

    } catch (error) {

        console.error("Change password error:", error);

        return res.status(500).json({
            message: "Error changing password"
        });
    }
}