const express = require("express");
const fs = require("fs").promises;
const path = require("path");
const pgp = require('pg-promise')();

const app = express();
const port = 3000;

const directoryPath = __dirname;
app.use(express.urlencoded({extended:false}))

app.get("/", (req, res) => {
    res.sendFile(path.join(directoryPath, 'home.html'), (err) => {
        if(err){
            res.status(500).send('Error loading home');
        }
    });
});

const client = require("./pg");




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

