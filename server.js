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

pool.connect() 
    .then(() =>{console.log("Connected!!")})
    .catch(()=>{
        console.log("Not Connected")
    })
module.exports={pool}

app.use(express.json())
app.use(express.urlencoded({extended:false}))



//Directory code
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

//
app.get("/", (req, res) => {
    res.send("Hello from backend")
});

//querry database
async function getData(){
    const res=await pool.query("select * from users;")
    console.log(res.rows)
}

getData();

// Start the server
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});