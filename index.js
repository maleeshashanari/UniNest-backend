import express from 'express'
import dotenv from 'dotenv'
import mongoose from 'mongoose'

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

const app = express()

// Body Parser (middleware)
app.use(express.json())

app.listen(process.env.PORT,
    // Arrow function
    ()=>{
        console.log("Server is running perfectly")
    }
)