
import express from "express";
import dotenv from "dotenv";
import mongoose from "mongoose";
import userRouter from "./routes/userRoutes.js";

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

// Connect the user router
app.use("/api/users", userRouter);

// Start the server and make it listed for incoming requests on a specified port
app.listen(process.env.PORT,
    // Arrow function
    ()=>{
        console.log("Server is running perfectly")
    }
)