// Import required packages and files
import bcrypt from "bcrypt";
import dotenv from "dotenv";
import jwt from "jsonwebtoken";
import User from "../models/userModel.js";
import { validatePassword } from "../utils/validatePassword.js";
import nodemailer from "nodemailer";
import OTP from "../models/otpModel.js";
import { randomInt, randomBytes } from "crypto";
import axios from "axios";

dotenv.config();

// Configure email transporter
const transporter = nodemailer.createTransport({
    service: "gmail",
    host: "smtp.gmail.com",
    port: 587,
    secure: false,
    auth: {
        user: "ug.maleesha.shanari@gmail.com",
        pass: process.env.GMAIL_APP_PASSWORD
    }
});

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

// Send OTP for password reset
export async function sendOTP(req, res) {
    try {

        // Get and normalize email
        const email = req.body.email?.trim().toLowerCase();

        // Check email
        if (!email) {
            return res.status(400).json({
                message: "Email is required"
            });
        }

        // Find registered user
        const user = await User.findOne({ email });

        if (!user) {
            return res.status(404).json({
                message: "User with given email not found"
            });
        }

        // Check whether the account is blocked
        if (user.isBlocked) {
            return res.status(403).json({
                message: "Your account is blocked. Please contact the administrator."
            });
        }

        // Check email configuration
        if (!process.env.GMAIL_APP_PASSWORD) {
            return res.status(500).json({
                message: "Email configuration is missing"
            });
        }

        // Generate a five-digit OTP
        const otp = randomInt(10000, 100000).toString();

        // Hash the OTP before storing it
        const otpHash = await bcrypt.hash(otp, 10);

        // Delete any previous OTP for this email
        await OTP.deleteOne({ email });

        // Create a new OTP record
        const newOTP = new OTP({
            email,
            otpHash,
            expiresAt: new Date(Date.now() + 10 * 60 * 1000)
        });

        // Save OTP to MongoDB
        await newOTP.save();

        // Prepare OTP email
        const message = {
            from: "ug.maleesha.shanari@gmail.com",
            to: email,
            subject: "UniNest - Password Reset OTP",
            text: `Your UniNest password reset OTP is ${otp}. It is valid for 10 minutes. Do not share this OTP with anyone.`
        };

        // Send OTP email
        await transporter.sendMail(message);

        return res.status(200).json({
            message: "OTP sent successfully"
        });

    } catch (error) {

        // Delete OTP if email sending fails
        if (req.body.email) {
            await OTP.deleteOne({
                email: req.body.email.trim().toLowerCase()
            }).catch(() => {});
        }

        console.error("Send OTP error:", error);

        return res.status(500).json({
            message: "Error sending OTP"
        });
    }
}

// Verify OTP and reset student password
export async function verifyOTP(req, res) {
    try {

        // Get reset password details
        const email = req.body.email?.trim().toLowerCase();
        const otpCode = req.body.otp?.toString().trim();
        const { newPassword, confirmPassword } = req.body;

        // Check required fields
        if (!email || !otpCode || !newPassword || !confirmPassword) {
            return res.status(400).json({
                message: "All fields are required"
            });
        }

        // Validate OTP format
        if (!/^\d{5}$/.test(otpCode)) {
            return res.status(400).json({
                message: "Invalid OTP format"
            });
        }

        // Check password confirmation
        if (newPassword !== confirmPassword) {
            return res.status(400).json({
                message: "Passwords do not match"
            });
        }

        // Validate password strength
        const passwordErrors = validatePassword(newPassword);

        if (passwordErrors.length > 0) {
            return res.status(400).json({
                message: `Password must contain ${passwordErrors.join(", ")}.`
            });
        }

        // Check PEPPER configuration
        if (!process.env.PEPPER) {
            return res.status(500).json({
                message: "Password security configuration is missing"
            });
        }

        // Find OTP record
        const otpRecord = await OTP.findOne({ email });

        if (!otpRecord) {
            return res.status(404).json({
                message: "OTP not found. Please request a new OTP."
            });
        }

        // Check OTP expiration
        if (otpRecord.expiresAt <= new Date()) {
            await OTP.deleteOne({ email });

            return res.status(400).json({
                message: "OTP has expired. Please request a new OTP."
            });
        }

        // Verify OTP
        const isOTPValid = await bcrypt.compare(
            otpCode,
            otpRecord.otpHash
        );

        if (!isOTPValid) {
            return res.status(400).json({
                message: "Invalid OTP"
            });
        }

        // Find registered user
        const user = await User.findOne({ email });

        if (!user) {
            return res.status(404).json({
                message: "User not found"
            });
        }

        // Check whether the account is blocked
        if (user.isBlocked) {
            return res.status(403).json({
                message: "Your account is blocked. Please contact the administrator."
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

        // Delete used OTP
        await OTP.deleteOne({ email });

        return res.status(200).json({
            message: "Password reset successfully"
        });

    } catch (error) {

        console.error("Verify OTP error:", error);

        return res.status(500).json({
            message: "Error resetting password"
        });
    }
}


// Google login
export async function googleLogin(req, res) {
    try {
        // Get the Google access token from the frontend
        const { token: googleToken } = req.body;

        if (!googleToken) {
            return res.status(400).json({
                message: "Google token is required"
            });
        }

        // Get the Google user's information
        const googleResponse = await axios.get(
            "https://www.googleapis.com/oauth2/v3/userinfo",
            {
                headers: {
                    Authorization: `Bearer ${googleToken}`
                }
            }
        );

        const googleUser = googleResponse.data;

        // Check whether Google has verified the email
        if (!googleUser.email || !googleUser.email_verified) {
            return res.status(400).json({
                message: "Google email is not verified"
            });
        }

        // Find an existing UniNest account
        let user = await User.findOne({
            email: googleUser.email.toLowerCase()
        });

        // Check whether the account is blocked
        if (user && user.isBlocked) {
            return res.status(403).json({
                message: "Your account is blocked. Please contact support."
            });
        }

        // Create a new student account if the user does not exist
        if (!user) {
            const randomPassword = randomBytes(32).toString("hex");

            const hashedPassword = await bcrypt.hash(
                randomPassword + process.env.PEPPER,
                10
            );

            user = new User({
                firstName: googleUser.given_name || "Student",
                lastName: googleUser.family_name || "",
                email: googleUser.email.toLowerCase(),
                password: hashedPassword,
                image: googleUser.picture || "/images/default-profile.png",
                role: "student"
            });

            await user.save();
        }

        // Generate the UniNest JWT token
        const token = jwt.sign(
            {
                id: user._id.toString(),
                email: user.email,
                role: user.role
            },
            process.env.JWT_SECRET,
            { expiresIn: "48h" }
        );

        // Update the user's last login time
        user.lastLogin = new Date();
        await user.save();

        // Return the authenticated user information
        res.status(200).json({
            message: "Google login successful",
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
        console.log("Google login error:", error.response?.data || error.message);

        res.status(500).json({
            message: "Error logging in with Google"
        });
    }
}