const express = require("express");
const fs = require("fs").promises;
const path = require("path");
const { Pool } = require("pg");
const bcrypt = require("bcryptjs");
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
//Middlewere to check authentication
const isAuthenticated = (req, res, next) => {
    if (req.session.isAuthenticated) {
        return next();
    }
    res.redirect("/");
};

//Serve static files from /public
app.use("/public", express.static(path.join(__dirname, "public")));
app.use("/static", isAuthenticated, express.static(path.join(__dirname,"static" )));
//serve landing page as root
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname,"public", "landingPage.html"));
});
//Serve login page
app.get("/login.html", (req,res)=>{
    res.sendFile(path.join(__dirname, "public", "login.html"));
});

//protect specific routs
app.get("/home.html", isAuthenticated, (req, res) => {
    res.sendFile(path.join(__dirname,"views", "home.html"));
});

app.get("/user-management.html", isAuthenticated, (req, res) => {
    res.sendFile(path.join(__dirname,"views", "user-management.html"));
});
//handle log in 
app.post("/login", async (req, res) => {
    const { email, password } = req.body;
    try {
        const query = "SELECT * FROM users_t2 WHERE email = $1";
        const result = await pool.query(query, [email]);
        if (result.rows.length === 0) {
            return res.status(401).json({ message: "Invalid credentials" });
        }
        const user = result.rows[0];
        const match = await bcrypt.compare(password, user.password);
        if (match) {
            req.session.isAuthenticated = true;
            req.session.user = { name: user.name, email: user.email, adminLevel: user.admin_level };
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
//handle log out
app.post("/logout", (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return res.status(500).send("Logout failed");
        }
        res.status(200).json({ message: "Logged out successfully" });
    });
});
//register user
app.post("/register", isAuthenticated, async (req, res) => {
    const { name, email, password, adminLevel } = req.body;
    const saltRounds = 10;
    try {
        if (!name || !password || !adminLevel) {
            return res.status(400).json({ message: "Missing required fields" });
        }
        const passwordHash = await bcrypt.hash(password, saltRounds);
        const insertQuery = `
            INSERT INTO users_t2 (name, password, email, admin_level)
            VALUES ($1::varchar, $2::varchar, $3::varchar, $4::varchar)
            RETURNING name, email, admin_level
        `;
        const result = await pool.query(insertQuery, [name, passwordHash, email, adminLevel]);
        res.status(201).json({
            message: "User registered successfully",
            user: result.rows[0]
        });
    } catch (err) {
        console.error("Error registering user:", err.message);
        res.status(500).send("Failed to register user");
    }
});
//delete user
app.delete("/delete-user", isAuthenticated, async (req, res) => {
    const { email } = req.body;
    console.log("Delete request received for:", email);
    try {
        const query = "DELETE FROM users_t2 WHERE email = $1 RETURNING email";
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
//change password
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
            UPDATE users_t2
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

//directory listing
app.get("/directory", isAuthenticated, async (req, res) => {
    try {
        const files = await fs.readdir(path.join(__dirname));
        res.json({ files, path: __dirname });
    } catch (error) {
        res.status(500).json({ error: "Failed to read directory" });
    }
});

//catch invalid routs
app.use((req, res) => {
    res.redirect("/");
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});

////// Add Template

app.post("/add-template", isAuthenticated, async(req, res) => {
    const {templateName, columnNames} = req.body;
    const insert_query = "insert into template_t2 (template_version, needed_columns) values ($1, $2)";
    try{
        const result = await pool.query(insert_query, [templateName, columnNames]);
        console.log(result);
        res.status(200).send("Data inserted successfully!");
    } catch (err) {
        console.error("Error inserting data:", err.message);
        res.status(500).send("Failed to insert data.");
    }
});


//////// Get Templates
app.get("/get-templates", isAuthenticated, async (req, res) => {
    const select_query = "select template_version from template_t2";
    try {
        const result = await pool.query(select_query);
        res.status(200).json(result);
        console.log(result);
    } catch (err) {
        console.error("Error fetching data:", err.message);
        res.status(500).send("Failed to fetch data.");
    }
});


/////////Get Column Names
app.get("/get-column-names/:version", isAuthenticated, async (req, res) => {
    const { version } = req.params;  // Extract version from the request URL
    const select_query = "SELECT needed_columns FROM template_t2 WHERE template_version = $1";
    try {
        const result = await pool.query(select_query, [version]);
        res.status(200).json(result);
    } catch (err) {
        console.error("Error fetching data:", err.message);
        res.status(500).send("Failed to fetch data.");
    }
});

////////////Delete a template version.
app.delete("/delete-template", isAuthenticated, async (req, res) => {
    const { template_version } = req.body;

    const delete_query = "DELETE FROM template_t2 WHERE template_version = $1";
    try {
        const result = await pool.query(delete_query, [template_version]);
        if (result.rowCount > 0) {
            res.status(200).send("Template deleted successfully!");
        } else {
            res.status(404).send("Template not found.");
        }
    } catch (err) {
        console.error("Error deleting template:", err.message);
        res.status(500).send("Failed to delete template.");
    }
});


//////Add rundown
app.post("/add-rundown", isAuthenticated, async(req, res) => {
    const {show_name, show_date, folder, active, template_version} = req.body;
    const insert_query = "insert into rundown_t2 (show_name, show_date, folder, active, template_version) values ($1, $2, $3, $4, $5)";
    try{
        const result = await pool.query(insert_query, [show_name, show_date, folder, active, template_version]);
        console.log(result);
        res.status(200).send("Data inserted successfully!");
    } catch (err) {
        console.error("Error inserting data:", err.message);
        res.status(500).send("Failed to insert data.");
    }
});


//////Get the relevant columns for specific show name and show date
app.get("/get-column-names/:show_name/:show_date", isAuthenticated, async (req, res) => {
    const { show_name, show_date } = req.params;

    const select_query = `
                    select tt.needed_columns from template_t2 tt 
                    join rundown_t2 rt on rt.template_version = tt.template_version
                    where rt.show_name = $1 
	                and rt.show_date = $2
                    `;
    try {
        const result = await pool.query(select_query, [show_name, show_date]);
        res.status(200).json(result);
    } catch (err) {
        console.error("Error fetching data:", err.message);
        res.status(500).send("Failed to fetch data.");
    }
});


//////Get rundown list 
app.get("/get-rundown-list", isAuthenticated, async (req, res) => {
    const select_query = `
                    select show_name, show_date from rundown_t2
                    `;
    try {
        const result = await pool.query(select_query);
        res.status(200).json(result);
    } catch (err) {
        console.error("Error fetching data:", err.message);
        res.status(500).send("Failed to fetch data.");
    }
});