const express = require("express");
const fs = require("fs").promises;
const path = require("path");
const { Pool } = require("pg");
const bcrypt = require("bcrypt");
const session = require("express-session");

const app = express();
const port = 3000;

const pool = new Pool({
    user: "postgres",
    host: "news-team-db1.cdm082ocayd0.us-east-2.rds.amazonaws.com",
    database: "studio_db",
    password: "stuP455W0RD!",
    port: 5432,
    ssl: { rejectUnauthorized: false }
});

pool.connect()
    .then(() => { console.log("Connected!!"); })
    .catch(() => { console.log("Not Connected"); });

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use(session({
    secret: "your-secret-key",
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false }
}));

const isAuthenticated = (req, res, next) => {
    if (req.session.isAuthenticated) {
        return next();
    }
    res.redirect("/login.html");
};

app.use("/public", express.static(path.join(__dirname, "public")));

app.get("/", (req, res) => {
    res.redirect("/login.html");
});

app.get("/login.html", (req, res) => {
    res.sendFile(path.join(__dirname, "login.html"));
});

app.use("/static", isAuthenticated, express.static(__dirname));

app.get("/home.html", isAuthenticated, (req, res) => {
    res.sendFile(path.join(__dirname, "home.html"));
});

app.get("/user-management.html", isAuthenticated, (req, res) => {
    res.sendFile(path.join(__dirname, "user-management.html"));
});

app.post("/login", async (req, res) => {
    const { email, password } = req.body;
    try {
        const query = "SELECT * FROM users_t WHERE email = $1";
        const result = await pool.query(query, [email]);
        if (result.rows.length === 0) {
            return res.status(401).json({ message: "Invalid credentials" });
        }
        const user = result.rows[0];
        const match = await bcrypt.compare(password, user.password);
        if (match) {
            req.session.isAuthenticated = true;
            req.session.user = { name: user.name, email: user.email, userLevel: user.user_level };
            res.status(200).json({
                message: "Login successful",
                user: req.session.user
            });
        } else {
            res.status(401).json({ message: "Invalid credentials" });
        }
    } catch (err) {
        console.error("Error during login:", err.message);
        res.status(500).send("Login failed");
    }
});

app.post("/logout", (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return res.status(500).send("Logout failed");
        }
        res.status(200).json({ message: "Logged out successfully" });
    });
});

app.post("/register", isAuthenticated, async (req, res) => {
    const { name, email, password, userLevel } = req.body;
    const saltRounds = 10;
    try {
        if (!name || !password || !userLevel) {
            return res.status(400).json({ message: "Missing required fields" });
        }
        const passwordHash = await bcrypt.hash(password, saltRounds);
        const insertQuery = `
            INSERT INTO users_t (name, password, email, user_level)
            VALUES ($1::varchar, $2::varchar, $3::varchar, $4::varchar)
            RETURNING name, email, user_level
        `;
        const result = await pool.query(insertQuery, [name, passwordHash, email, userLevel]);
        res.status(201).json({
            message: "User registered successfully",
            user: result.rows[0]
        });
    } catch (err) {
        console.error("Error registering user:", err.message);
        res.status(500).send("Failed to register user");
    }
});

app.delete("/delete-user", isAuthenticated, async (req, res) => {
    const { email } = req.body;
    console.log("Delete request received for:", email);
    try {
        const query = "DELETE FROM users_t WHERE email = $1 RETURNING email";
        const result = await pool.query(query, [email]);
        if (result.rowCount === 0) {
            console.log("No user found with email:", email);
            return res.status(404).json({ message: "User not found" });
        }
        console.log("User deleted:", email);
        res.status(200).json({ message: "User deleted successfully" });
    } catch (err) {
        console.error("Error deleting user:", err.message);
        res.status(500).json({ message: "Failed to delete user" });
    }
});

app.put("/change-password", isAuthenticated, async (req, res) => {
    const { email, newPassword } = req.body;
    const saltRounds = 10;
    console.log("Change password request received for:", email);
    try {
        if (!email || !newPassword) {
            return res.status(400).json({ message: "Email and new password are required" });
        }
        const passwordHash = await bcrypt.hash(newPassword, saltRounds);
        const query = `
            UPDATE users_t 
            SET password = $1 
            WHERE email = $2 
            RETURNING email, name
        `;
        const result = await pool.query(query, [passwordHash, email]);
        if (result.rowCount === 0) {
            console.log("No user found with email:", email);
            return res.status(404).json({ message: "User not found" });
        }
        console.log("Password updated for:", email);
        res.status(200).json({ message: "Password changed successfully" });
    } catch (err) {
        console.error("Error changing password:", err.message);
        res.status(500).json({ message: "Failed to change password" });
    }
});

app.get("/getData", isAuthenticated, async (req, res) => {
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

app.post("/addRowData", isAuthenticated, async (req, res) => {
    console.log("Received Data:", req.body);
    const { ITEMNUM, BLOCK, SHOWDATE, CAM, SHOT, TAL, SLUG, FORMAT, READ, BACKTIME, OK, CH, WR, ED, MODIFIED } = req.body;
    const insert_query = "INSERT INTO scripts_t (item_num, block, show_date, cam, shot, tal, slug, format, read, backtime, ok, channel, writer, editor, modified) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)";
    try {
        const result = await pool.query(insert_query, [ITEMNUM, BLOCK, SHOWDATE, CAM, SHOT, TAL, SLUG, FORMAT, READ, BACKTIME, OK, CH, WR, ED, MODIFIED]);
        console.log(result);
        res.status(200).send("Data inserted successfully!");
    } catch (err) {
        console.error("Error inserting data:", err.message);
        res.status(500).send("Failed to insert data.");
    }
});

app.get("/directory", isAuthenticated, async (req, res) => {
    try {
        const files = await fs.readdir(path.join(__dirname));
        res.json({ files, path: __dirname });
    } catch (error) {
        res.status(500).json({ error: "Failed to read directory" });
    }
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});