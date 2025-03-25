
//this is connected to database now
//need to connect this to server.js
//need to implement

const {Client} = require("pg")

const client = new Client({
    user: "postgres",
    host: "news-team-db1.cdm082ocayd0.us-east-2.rds.amazonaws.com", // RDS Endpoint
    database: "studio_db",
    password: "stuP455W0RD!",
    port: 5432,
    ssl: {
        rejectUnauthorized: false // Use this for testing; see note below
    }
})  

client.connect()
    .then(() => console.log("connected to pg"))
    .catch(err => console.error("can't connect to pg", err))

module.exports = {client}

async function getData(){
    const res = await client.query("Select * from scripts_t")
    console.log(res.rows)
    console.log("Happy Days")
    console.log("")
}

getData();