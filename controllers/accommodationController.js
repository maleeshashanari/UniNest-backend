import mongoose from "mongoose";
import Accommodation from "../models/accommodationModel.js";

// Add accommodation - Admin only
export async function addAccommodation(req, res) {
    try {

        // Get accommodation details
        const {
            accommodationId,
            title,
            description,
            type,
            suitableFor,
            monthlyRent,
            securityDeposit,
            location,
            university,
            totalRooms,
            availableRooms,
            amenities,
            images,
            contactNumber
        } = req.body;

        // Check required fields
        const missingFields = [];

        if (typeof accommodationId !== "string" || !accommodationId.trim())
            missingFields.push("accommodationId");

        if (typeof title !== "string" || !title.trim())
            missingFields.push("title");

        if (typeof description !== "string" || !description.trim())
            missingFields.push("description");

        if (!type)
            missingFields.push("type");

        if (monthlyRent === undefined || monthlyRent === "")
            missingFields.push("monthlyRent");

        if (!location?.address?.trim())
            missingFields.push("location.address");

        if (!location?.city?.trim())
            missingFields.push("location.city");

        if (typeof contactNumber !== "string" || !contactNumber.trim())
            missingFields.push("contactNumber");

        if (missingFields.length > 0) {
            return res.status(400).json({
                message: "Missing required fields",
                missing: missingFields
            });
        }

        // Validate accommodation type
        const validTypes = [
            "Hostel",
            "Boarding",
            "Apartment",
            "Annex",
            "House"
        ];

        if (!validTypes.includes(type)) {
            return res.status(400).json({
                message: "Invalid accommodation type"
            });
        }

        // Validate suitableFor
        const validSuitableFor = ["Boys", "Girls", "Any"];

        const genderPreference = suitableFor || "Any";

        if (!validSuitableFor.includes(genderPreference)) {
            return res.status(400).json({
                message: "Suitable for must be Boys, Girls or Any"
            });
        }

        // Validate monthly rent
        const rent = Number(monthlyRent);

        if (!Number.isFinite(rent) || rent <= 0) {
            return res.status(400).json({
                message: "Monthly rent must be greater than zero"
            });
        }

        // Validate security deposit
        const deposit =
            securityDeposit === undefined || securityDeposit === ""
                ? 0
                : Number(securityDeposit);

        if (!Number.isFinite(deposit) || deposit < 0) {
            return res.status(400).json({
                message: "Invalid security deposit"
            });
        }

        // Validate room numbers
        const rooms = totalRooms === undefined ? 1 : Number(totalRooms);

        const available =
            availableRooms === undefined ? rooms : Number(availableRooms);

        if (
            !Number.isInteger(rooms) ||
            !Number.isInteger(available) ||
            rooms < 1 ||
            available < 0 ||
            available > rooms
        ) {
            return res.status(400).json({
                message: "Invalid room information"
            });
        }

        // Check duplicate accommodation ID
        const existingAccommodation = await Accommodation.findOne({
            accommodationId: accommodationId.trim()
        });

        if (existingAccommodation) {
            return res.status(409).json({
                message: "Accommodation ID already exists"
            });
        }

        // Prepare accommodation data
        const accommodationData = {
            accommodationId: accommodationId.trim(),
            title: title.trim(),
            description: description.trim(),
            type,
            suitableFor: genderPreference,
            monthlyRent: rent,
            securityDeposit: deposit,

            location: {
                address: location.address.trim(),
                city: location.city.trim(),
                district: location.district?.trim() || ""
            },

            university: university?.trim() || "",
            totalRooms: rooms,
            availableRooms: available,

            amenities: Array.isArray(amenities) ? amenities : [],

            images: Array.isArray(images) && images.length > 0
                ? images
                : ["/images/default-accommodation.png"],

            contactNumber: contactNumber.trim(),

            isAvailable: available > 0
        };

        // Save accommodation
        const newAccommodation = await Accommodation.create(
            accommodationData
        );

        return res.status(201).json({
            message: "Accommodation added successfully",
            accommodation: newAccommodation
        });

    } catch (error) {

        console.error("Add accommodation error:", error);

        if (error.code === 11000) {
            return res.status(409).json({
                message: "Accommodation ID already exists"
            });
        }

        if (error.name === "ValidationError") {
            return res.status(400).json({
                message: error.message
            });
        }

        return res.status(500).json({
            message: "Error adding accommodation"
        });
    }
}


// View all accommodations - Admin only
export async function getAllAccommodations(req, res) {
    try {

        // Get all accommodations
        const accommodations = await Accommodation.find()
            .sort({ createdAt: -1 });

        return res.status(200).json({
            count: accommodations.length,
            accommodations
        });

    } catch (error) {

        console.error("Get all accommodations error:", error);

        return res.status(500).json({
            message: "Error retrieving accommodations"
        });
    }
}


// View available accommodations for admin and students
export async function getPublicAccommodations(req, res) {
    try {

        // Get available accommodations
        const accommodations = await Accommodation.find({
            isAvailable: true,
            availableRooms: { $gt: 0 }
        }).sort({ createdAt: -1 });

        return res.status(200).json({
            count: accommodations.length,
            accommodations
        });

    } catch (error) {

        console.error("Get public accommodations error:", error);

        return res.status(500).json({
            message: "Error retrieving accommodations"
        });
    }
}


// view a single accommodation by ID for admin and students
export async function getSingleAccommodation(req, res) {
    try {

        const { id } = req.params;

        // Validate accommodation ID
        if (!mongoose.isValidObjectId(id)) {
            return res.status(400).json({
                message: "Invalid accommodation ID"
            });
        }

        // Find accommodation
        const accommodation = await Accommodation.findById(id);

        if (!accommodation) {
            return res.status(404).json({
                message: "Accommodation not found"
            });
        }

        return res.status(200).json({
            accommodation
        });

    } catch (error) {

        console.error("Get single accommodation error:", error);

        return res.status(500).json({
            message: "Error retrieving accommodation"
        });
    }
}


// Update accommodation details - Admin only
export async function updateAccommodation(req, res) {
    try {

        const { id } = req.params;

        // Validate accommodation ID
        if (!mongoose.isValidObjectId(id)) {
            return res.status(400).json({
                message: "Invalid accommodation ID"
            });
        }

        // Find accommodation
        const accommodation = await Accommodation.findById(id);

        if (!accommodation) {
            return res.status(404).json({
                message: "Accommodation not found"
            });
        }

        // Fields that admin can update
        const allowedFields = [
            "title",
            "description",
            "type",
            "suitableFor",
            "monthlyRent",
            "securityDeposit",
            "location",
            "university",
            "totalRooms",
            "availableRooms",
            "amenities",
            "images",
            "contactNumber",
            "isAvailable"
        ];

        // Collect submitted changes
        const updates = {};

        for (const field of allowedFields) {
            if (Object.prototype.hasOwnProperty.call(req.body, field)) {
                updates[field] = req.body[field];
            }
        }

        if (Object.keys(updates).length === 0) {
            return res.status(400).json({
                message: "No valid fields provided for update"
            });
        }

        // Validate text fields
        for (const field of ["title", "description", "contactNumber"]) {
            if (field in updates) {
                if (
                    typeof updates[field] !== "string" ||
                    !updates[field].trim()
                ) {
                    return res.status(400).json({
                        message: `${field} must be a non-empty string`
                    });
                }

                updates[field] = updates[field].trim();
            }
        }

        // Validate university
        if ("university" in updates) {
            if (typeof updates.university !== "string") {
                return res.status(400).json({
                    message: "University must be a string"
                });
            }

            updates.university = updates.university.trim();
        }

        // Validate accommodation type
        if ("type" in updates) {
            const validTypes = [
                "Hostel",
                "Boarding",
                "Apartment",
                "Annex",
                "House"
            ];

            if (!validTypes.includes(updates.type)) {
                return res.status(400).json({
                    message: "Invalid accommodation type"
                });
            }
        }

        // Validate suitableFor
        if ("suitableFor" in updates) {
            if (!["Boys", "Girls", "Any"].includes(updates.suitableFor)) {
                return res.status(400).json({
                    message: "Suitable for must be Boys, Girls or Any"
                });
            }
        }

        // Validate prices
        for (const field of ["monthlyRent", "securityDeposit"]) {
            if (field in updates) {
                const value = Number(updates[field]);

                if (
                    updates[field] === "" ||
                    !Number.isFinite(value) ||
                    value < 0 ||
                    (field === "monthlyRent" && value === 0)
                ) {
                    return res.status(400).json({
                        message: `Invalid ${field}`
                    });
                }

                updates[field] = value;
            }
        }

        // Validate room numbers
        for (const field of ["totalRooms", "availableRooms"]) {
            if (field in updates) {
                const value = Number(updates[field]);

                if (!Number.isInteger(value) || value < 0) {
                    return res.status(400).json({
                        message: `Invalid ${field}`
                    });
                }

                updates[field] = value;
            }
        }

        // Validate total and available rooms together
        const newTotal = updates.totalRooms ?? accommodation.totalRooms;

        const newAvailable =
            updates.availableRooms ?? accommodation.availableRooms;

        if (newTotal < 1 || newAvailable > newTotal) {
            return res.status(400).json({
                message: "Available rooms cannot exceed total rooms"
            });
        }

        // Validate location
        if ("location" in updates) {
            const location = updates.location;

            if (
                !location ||
                typeof location !== "object" ||
                typeof location.address !== "string" ||
                !location.address.trim() ||
                typeof location.city !== "string" ||
                !location.city.trim()
            ) {
                return res.status(400).json({
                    message: "Valid address and city are required"
                });
            }

            updates.location = {
                address: location.address.trim(),
                city: location.city.trim(),
                district: location.district?.trim() || ""
            };
        }

        // Validate amenities
        if ("amenities" in updates) {
            if (
                !Array.isArray(updates.amenities) ||
                !updates.amenities.every(item => typeof item === "string")
            ) {
                return res.status(400).json({
                    message: "Amenities must be an array of strings"
                });
            }

            updates.amenities = updates.amenities
                .map(item => item.trim())
                .filter(Boolean);
        }

        // Validate images
        if ("images" in updates) {
            if (
                !Array.isArray(updates.images) ||
                !updates.images.every(
                    image => typeof image === "string" && image.trim()
                )
            ) {
                return res.status(400).json({
                    message: "Images must be an array of valid strings"
                });
            }

            updates.images = updates.images.map(image => image.trim());
        }

        // Validate availability
        if (
            "isAvailable" in updates &&
            typeof updates.isAvailable !== "boolean"
        ) {
            return res.status(400).json({
                message: "isAvailable must be true or false"
            });
        }

        // Update availability based on available rooms
        if (newAvailable === 0) {
            updates.isAvailable = false;
        } else if ("availableRooms" in updates && !("isAvailable" in updates)) {
            updates.isAvailable = true;
        }

        // Apply updates
        Object.assign(accommodation, updates);

        await accommodation.save();

        return res.status(200).json({
            message: "Accommodation updated successfully",
            accommodation
        });

    } catch (error) {

        console.error("Update accommodation error:", error);

        if (error.name === "ValidationError") {
            return res.status(400).json({
                message: error.message
            });
        }

        return res.status(500).json({
            message: "Error updating accommodation"
        });
    }
}


// Delete accommodation by ID - Admin only
export async function deleteAccommodation(req, res) {
    try {

        const { id } = req.params;

        // Validate accommodation ID
        if (!mongoose.isValidObjectId(id)) {
            return res.status(400).json({
                message: "Invalid accommodation ID"
            });
        }

        // Find and delete accommodation
        const accommodation = await Accommodation.findByIdAndDelete(id);

        if (!accommodation) {
            return res.status(404).json({
                message: "Accommodation not found"
            });
        }

        return res.status(200).json({
            message: "Accommodation deleted successfully"
        });

    } catch (error) {

        console.error("Delete accommodation error:", error);

        return res.status(500).json({
            message: "Error deleting accommodation"
        });
    }
}