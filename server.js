const express = require("express");
const fs = require("fs").promises;
const path = require("path");
const {Pool} = require("pg");

const app = express();
const port = 3000;

// Specify the directory to browse (change this to your desired path)
const directoryPath = path.join(__dirname); // Example: a "files" folder in your project

const pool = new Pool({
    user: "postgres",
    host: "news-team-db1.cdm082ocayd0.us-east-2.rds.amazonaws.com", // RDS Endpoint
    database: "studio_db",
    password: "stuP455W0RD!",
    port: 5432, 
    ssl: {
        rejectUnauthorized: false // Use this for testing; see note below
    }                 
});

pool.connect() 
    .then(() =>{console.log("Connected!!")})
    .catch(()=>{
        console.log("Not Connected")
    })
module.exports={pool}

app.use(express.json())
app.use(express.urlencoded({extended:false}))

// Start the server
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});



// API endpoint to get data from the database
app.get("/getData", async (req, res) => {
  const select_query = "SELECT * FROM scripts_t";

  try {
      const result = await pool.query(select_query);
      res.status(200).json(result.rows);
      console.log(result);
  } catch (err) {
      console.error("Error fetching data:", err.message);
      res.status(500).send("Failed to fetch data.");
  }
});



// API endpoint to push data to the database
app.post("/addRowData", async (req, res) => {
  console.log("Received Data:", req.body);
  const {ITEMNUM, BLOCK, SHOWDATE, CAM, SHOT, TAL, SLUG, FORMAT, READ, BACKTIME, OK, CH, WR, ED, MODIFIED} = req.body;
  console.log("item_num:", ITEMNUM);
  const insert_query = "INSERT INTO scripts_t ( item_num, block, show_date, cam, shot, tal, slug, format, read, backtime, ok, channel, writer, editor, modified) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)";

  try {
    const result = await pool.query(insert_query, [ITEMNUM, BLOCK, SHOWDATE, CAM, SHOT, TAL, SLUG, FORMAT, READ, BACKTIME, OK, CH, WR, ED, MODIFIED]);
    console.log(result);
    res.status(200).send("Data inserted successfully!");
  } catch (err) {
    console.error("Error inserting data:", err.message);
    res.status(500).send("Failed to insert data.");
}
});














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
/*
async function getData(){
    const res=await pool.query("select * from demo_table;")
    console.log(res.rows)
}
*/




