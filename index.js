
import express from "express";
import dotenv from "dotenv";
import mongoose from "mongoose";
import userRouter from "./routes/userRoutes.js";
import accommodationRouter from "./routes/accommodationRoutes.js";
import cors from "cors";
import feedbackRouter from "./routes/feedbackRoutes.js";

// reads .env file and loads values into process.env
dotenv.config()

// MongoDB URI
const mongoURI = process.env.MONGO_URI

// connect our backend with the MongoDB
mongoose.connect(mongoURI).then(
    ()=>{
        console.log("Connected to MongoDB")
    }
).catch(
    ()=>{
        console.log("Error connecting to MongoDB")
    }
)

// Assign the express backend to a variable 
const app = express()

// Body Parser (middleware)
app.use(express.json())

// cors middleware
app.use(cors())

// Connect the user router
app.use("/api/users", userRouter);

// Connect accommodation router
app.use("/api/accommodations", accommodationRouter);

// Connect feedback router
app.use("/api/feedback", feedbackRouter);

// Start the server and make it listed for incoming requests on a specified port
app.listen(process.env.PORT,
    // Arrow function
    ()=>{
        console.log("Server is running perfectly")
    }
)