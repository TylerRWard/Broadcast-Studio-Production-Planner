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

/*
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

*/
////// Add Template

app.post("/add-template", isAuthenticated, async(req, res) => {
    const {templateName, columnNames} = req.body;
    const insert_query = "insert into template_t5 (template_version, needed_columns) values ($1, $2)";
    try{
        const result = await pool.query(insert_query, [templateName, columnNames]);
        //console.log(result);
        res.status(200).send("Data inserted successfully!");
    } catch (err) {
        console.error("Error inserting data:", err.message);
        res.status(500).send("Failed to insert data.");
    }
});


//////// Get Templates
app.get("/get-templates", isAuthenticated, async (req, res) => {
    const select_query = "select template_version from template_t5";
    try {
        const result = await pool.query(select_query);
        res.status(200).json(result);
        //console.log(result);
    } catch (err) {
        console.error("Error fetching data:", err.message);
        res.status(500).send("Failed to fetch data.");
    }
});


/////////Get Column Names
app.get("/get-column-names/:version", isAuthenticated, async (req, res) => {
    const { version } = req.params;  // Extract version from the request URL
    const select_query = "SELECT needed_columns FROM template_t5 WHERE template_version = $1";
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

    const delete_query = "DELETE FROM template_t4 WHERE template_version = $1";
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
    const { show_name, show_date, folder, active, template_version } = req.body;

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        await client.query(
            'INSERT INTO folder_topics_t5 (folder) VALUES ($1)',
            [folder]
        );

        await client.query(
            'INSERT INTO rundown_t5 (show_name, show_date, folder, active, template_version) VALUES ($1, $2, $3, $4, $5)',
            [show_name, show_date, folder, active, template_version]
        );

        await client.query('COMMIT');
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
                    select tt.needed_columns from template_t5 tt 
                    join rundown_t5 rt on rt.template_version = tt.template_version
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
                    select show_name, show_date from rundown_t5
                    `;
    try {
        const result = await pool.query(select_query);
        res.status(200).json(result);
    } catch (err) {
        console.error("Error fetching data:", err.message);
        res.status(500).send("Failed to fetch data.");
    }
});


app.post("/add-row-scripts_t5", isAuthenticated, async (req, res) => {
    const { item_num, block, show_date, show_name, row_num } = req.body;

    const insert_query = "insert into scripts_t5 (show_name, show_date, row_num, block, item_num, modified) values ($1, $2, $3, $4, $5, now() AT TIME ZONE 'America/Chicago')";
    try{
        const result = await pool.query(insert_query, [show_name, show_date, row_num, block, item_num]);
        //console.log(result);
        res.status(200).send("Data inserted successfully!");
    } catch (err) {
        console.error("Error inserting data:", err.message);
        res.status(500).send("Failed to insert data.");
    }
});


//////Get the data of relevant rundown from scripts_t4
app.get("/get-scripts-data/:show_name/:show_date", isAuthenticated, async (req, res) => {
   
    const { show_name, show_date } = req.params;

    const select_query = `select block, item_num, row_num, cam, shot, tal, slug, format, read, ok, channel,editor, modified, sot, total from scripts_t5
                    where show_name = $1 and show_date = $2
                    order by row_num`;
    try {
        const result = await pool.query(select_query, [show_name, show_date]);
        //console.log(result);
        res.status(200).json(result.rows);
    } catch (err) {
        console.error("Error fetching data:", err.message);
        res.status(500).send("Failed to fetch data.");
    }
});


//update-data-in-rundown
app.post("/update-data-in-rundown", isAuthenticated, async (req, res) => {
    const { show_name, show_date, row_number, block, item_num, column_name, data } = req.body;

    const update_query = `
                UPDATE scripts_t5
                SET ${column_name} = $6, modified = now() AT TIME ZONE 'America/Chicago'
                WHERE show_name = $1 and show_date = $2 and row_num=$3 and block=$4 and item_num=$5 ;
    `;
    try{
        const result = await pool.query(update_query, [show_name, show_date, row_number, block, item_num, data]);
        //console.log(result);
        res.status(200).send("Data inserted successfully!");
    } catch (err) {
        console.error("Error inserting data:", err.message);
        res.status(500).send("Failed to insert data.");
    }
});


//show-just-update-data
app.post("/show-just-update-data", isAuthenticated, async (req, res) => {
    const { show_name, show_date, row_number, column_name } = req.body;

    const select_query = `
                select ${column_name}, modified, row_num from scripts_t5
                where show_name = $1 and show_date = $2 and row_num = $3 ;
    `;
    try{
        const result = await pool.query(select_query, [show_name, show_date, row_number]);
        //console.log(result);
        res.status(200).json(result.rows);
    } catch (err) {
        console.error("Error fetching data:", err.message);
        res.status(500).send("Failed to fetch data.");
    }
});


///Delete a selected row
app.delete("/delete-a-row", isAuthenticated, async (req, res) => {
    const { row_num, show_name, show_date } = req.body;

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const deleteResult = await client.query(
            `DELETE FROM scripts_t5 
             WHERE row_num = $1 
             AND show_name = $2 
             AND show_date = $3;`,
            [row_num, show_name, show_date]
        );

        if (deleteResult.rowCount === 0) {
            await client.query('ROLLBACK');
            return res.status(404).send("RowID not found.");
        }

        await client.query(
            `UPDATE scripts_t5  
             SET row_num = row_num - 1
             WHERE row_num > $1
               AND show_name =  $2
               AND show_date = $3;`,
            [row_num, show_name, show_date]
        );

        await client.query('COMMIT');
        res.status(200).send("Row deleted successfully.");
    } catch (err) {
        await client.query('ROLLBACK');
        console.error("Error deleting rowID:", err.message);
        res.status(500).send("Failed to delete rowID.");
    } finally {
        client.release();
    }
});


// shift existing rows down
app.post("/shift-rows-down", isAuthenticated, async (req, res) => {
    const { row_num, show_name, show_date } = req.body;

    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        await client.query(`
            UPDATE scripts_t5  
            SET row_num = row_num + 1
            WHERE row_num > $1
              AND show_name = $2 
              AND show_date = $3;
        `, [row_num, show_name, show_date]);

        await client.query('COMMIT');
        res.status(200).send("Row space reserved successfully!");
    } catch (err) {
        await client.query('ROLLBACK');
        console.error("Error shifting rows:", err.message);
        res.status(500).send("Failed to shift rows.");
    } finally {
        client.release();
    }
});


///Insert a start row
app.post("/insert-start-row", isAuthenticated, async (req, res) => {
    const {show_name, show_date } = req.body;

    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        await client.query(`
            UPDATE scripts_t5  
            SET row_num = row_num + 1
            WHERE show_name = $1 
              AND show_date = $2;
        `, [show_name, show_date]);

        await client.query(`
            insert into scripts_t5 (show_name, show_date, row_num, block, item_num, modified)
            values ($1, $2, 1, 'A', 0, now() AT TIME ZONE 'America/Chicago')
        `, [ show_name, show_date]);

        await client.query('COMMIT');
        res.status(200).send("Inserted Start Row successfully!");
    } catch (err) {
        await client.query('ROLLBACK');
        console.error("Error inserting start row:", err.message);
        res.status(500).send("Failed to insert start row.");
    } finally {
        client.release();
    }
});
