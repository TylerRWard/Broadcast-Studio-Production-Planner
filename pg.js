
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


async function getData() {
    try {
      const res = await client.query("SELECT * FROM scripts_t");
      return res.rows;
    } catch (error) {
      console.error("Erro ao buscar dados do banco:", error);
      throw error; // repassa o erro para quem chamou a função
    }
  }

data = getData();

console.log(data) // this is not working

__dirname = '/Users/renatofilho/Desktop/Broadcast-Studio-Production-Planner/'

const fs = require('fs');
const path = require('path');

// Convertemos os valores para uma linha do CSV
const values = Object.values(data).join(',');

// Juntamos tudo
const csvContent = `${values}`;

// Caminho e nome do arquivo
const filePath = path.join(__dirname, 'saida.csv');

// Salvamos o CSV
fs.writeFileSync(filePath, csvContent, 'utf8');

console.log('Arquivo CSV salvo em:', filePath);

