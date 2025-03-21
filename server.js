const express = require("express");
const fs = require("fs").promises;
const path = require("path");
const pgp = require('pg-promise')();

const app = express();
const port = 3000;

app.use(express.urlencoded({extended:false}))

app.get("/", (req, res) => {
    res.send("hello from backend")
})

const client = require("./pg")
async function getData(){
    const res = await client.query("Select * from users_t")
    console.log(res.rows)
    console.log("Happy Days")
    console.log("")
}


getData()


//folder directory 
app.get("/directory", async (req, res) => {
  try {
    const files = await fs.readdir(directoryPath);
    res.json({ files, path: directoryPath });
  } catch (error) {
    res.status(500).json({ error: "Failed to read directory" });
  }
});


// Start server
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});

