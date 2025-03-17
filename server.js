const express = require("express");
const fs = require("fs").promises;
const path = require("path");
const {Pool} = require("pg");

const app = express();
const port = 3000;

// Specify the directory to browse (change this to your desired path)
const directoryPath = path.join(__dirname); // Example: a "files" folder in your project

const pool = new Pool({
    user: "postgres",           // Replace with your PostgreSQL username
    host: "3.14.212.108",          // Replace with your host (e.g., 'localhost' or a remote IP)
    database: "studio_db",        // Replace with your database name
    password: "stuP455WORD!",  // Replace with your password
    port: 5432,                 // Default PostgreSQL port
});

pool.on("connect", () => {
    console.log("Connected to PostgreSQL database");
});


// Serve static files (HTML, CSS, JS)
app.use(express.static(__dirname));

// API endpoint to list files in the directory
app.get("/directory", async (req, res) => {
    try {
        const files = await fs.readdir(directoryPath);
        res.json({ files, path: directoryPath });
    } catch (error) {
        res.status(500).json({ error: "Failed to read directory" });
    }
});

// New /news endpoint for PostgreSQL table
app.get("/news", async (req, res) => {
    try {
        const result = await pool.query("SELECT * FROM news");
        res.json(result.rows);
    } catch (error) {
        console.error("Database Error:", error.message);
        res.status(500).json({ error: "Failed to fetch news", details: error.message });
    }
});

// Start the server
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});