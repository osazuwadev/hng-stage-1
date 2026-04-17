import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors"
import profilesRoutes from "./routes/profiles.js";

const app = express();

app.use(cors({ origin: "*"}));
app.use(express.json());

app.get("/", (req, res) => {
    res.send("API is working")
})

app.use("/api", profilesRoutes)

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`server is running on port ${PORT}`)
});

