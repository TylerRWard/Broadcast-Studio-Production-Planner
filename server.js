const express = require("express");
const fs = require("fs").promises;
const path = require("path");
const { Pool } = require("pg");
const bcrypt = require("bcryptjs");
const session = require("express-session");
const { isatty } = require("tty");

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
    res.redirect("/login.html");
};

//Serve static files from /public
app.use("/public", express.static(path.join(__dirname, "public")));
app.use("/static", isAuthenticated, express.static(path.join(__dirname,"static" )));


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

//serve landing page as root
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname,"public", "landingPage.html"));
});




// ************************************DIRECTORY************************************************************************ //

app.get("/directory", async (req, res) => {
    const select_query = `
        SELECT 
            ft.folder AS folder_topic,
            r.show_name
        FROM 
            folder_topics_t5 ft
        LEFT JOIN 
            rundown_t5 r ON ft.folder = r.folder
        WHERE 
            ft.folder IS NOT NULL AND ft.folder != ''
        ORDER BY 
            ft.folder, r.show_name;
    `;
    try {
        const result = await pool.query(select_query);
        console.log("Server: Directory Data:", result.rows);
        res.status(200).json(result.rows);
    } catch (err) {
        console.error("Error fetching data:", err.message);
        res.status(500).send("Failed to fetch data.");
    }
});

app.post("/add-folder", async (req, res) => {
    const { folder } = req.body;
  
    if (!folder || folder.trim() === "") {
      return res.status(400).json({ error: "Folder name required." });
    }
  
    const insert_query = `INSERT INTO folder_topics_t5 (folder) VALUES ($1)`;
  
    try {
      await pool.query(insert_query, [folder.trim()]);
      console.log(`Server: Added folder "${folder}"`);
      res.status(201).json({ message: "Folder added successfully." });
    } catch (err) {
      console.error("Error adding folder:", err.message);
      res.status(500).json({ error: "Failed to add folder." });
    }
  });

// ******************************************************************************************************************** //

app.get("/get-details-rundown", isAuthenticated, async (req, res) => {
    const { show_name, folder, active, template_version } = req.query;
    //console.log("Query values:", show_name, folder, active, template_version);

    const select_query = `
        SELECT rt.show_date, tt.needed_columns 
        FROM rundown_t5 rt
        JOIN template_t5 tt ON rt.template_version = tt.template_version
        WHERE rt.show_name = $1 
          AND rt.folder = $2 
          AND rt.active = $3 
          AND rt.template_version = $4
    `;

    try {
        const result = await pool.query(select_query, [show_name, folder, active, template_version]);
        res.status(200).json(result.rows);
        console.log("Result rows:", result.rows);
    } catch (err) {
        console.error("Error fetching data:", err.message);
        res.status(500).send("Failed to fetch data.");
    }
});



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

    // Check 1: Prevent duplicate block + item_num within same show
    const checkDuplicateQuery = `
        SELECT 1 FROM scripts_t5
        WHERE show_name = $1 AND show_date = $2 AND block = $3 AND item_num = $4
        LIMIT 1
    `;

    // Check 2: Does a row already exist at this row_num?
    const checkExistingRowQuery = `
        SELECT 1 FROM scripts_t5
        WHERE show_name = $1 AND show_date = $2 AND row_num = $3
        LIMIT 1
    `;

    try {
        const duplicateCheck = await pool.query(checkDuplicateQuery, [show_name, show_date, block, item_num]);

        if (duplicateCheck.rowCount > 0) {
            return res.status(400).send("Duplicate: this block and item_num already exist for this show.");
        }

        const existingRowCheck = await pool.query(checkExistingRowQuery, [show_name, show_date, row_num]);

        if (existingRowCheck.rowCount > 0) {
            // Row already exists → update it
            const updateQuery = `
                UPDATE scripts_t5
                SET block = $1, item_num = $2, modified = now() AT TIME ZONE 'America/Chicago'
                WHERE show_name = $3 AND show_date = $4 AND row_num = $5
            `;
            await pool.query(updateQuery, [block, item_num, show_name, show_date, row_num]);
            return res.status(200).send("Data updated successfully.");
        } else {
            // Row doesn't exist → insert it
            const insertQuery = `
                INSERT INTO scripts_t5 (show_name, show_date, row_num, block, item_num, modified)
                VALUES ($1, $2, $3, $4, $5, now() AT TIME ZONE 'America/Chicago')
            `;
            await pool.query(insertQuery, [show_name, show_date, row_num, block, item_num]);
            return res.status(200).send("Data inserted successfully!");
        }
    } catch (err) {
        console.error("Error inserting/updating data:", err.message);
        res.status(500).send("Failed to insert or update data.");
    }
});




//////Get the data of relevant rundown from scripts_t4
app.get("/get-scripts-data/:show_name/:show_date", isAuthenticated, async (req, res) => {
   
    const { show_name, show_date } = req.params;

    const select_query = `select block, item_num, row_num, cam, shot, tal, slug, format, read, ok, channel, writer, editor, modified, sot, total from scripts_t5
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


app.delete("/delete-a-row", isAuthenticated, async (req, res) => {
    const { row_num, show_name, show_date } = req.body;

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // Step 1: Check if this row_num exists
        const existsCheck = await client.query(
            `SELECT 1 FROM scripts_t5
             WHERE row_num = $1 
             AND show_name = $2 
             AND show_date = $3;`,
            [row_num, show_name, show_date]
        );

        if (existsCheck.rowCount > 0) {
            // It exists: Delete and then update the rest
            await client.query(
                `DELETE FROM scripts_t5 
                 WHERE row_num = $1 
                 AND show_name = $2 
                 AND show_date = $3;`,
                [row_num, show_name, show_date]
            );

            await client.query(
                `UPDATE scripts_t5  
                 SET row_num = row_num - 1
                 WHERE row_num > $1
                   AND show_name = $2
                   AND show_date = $3;`,
                [row_num, show_name, show_date]
            );

            await client.query('COMMIT');
            return res.status(200).send("Row deleted and others shifted.");
        } else {
            // It doesn't exist: Only update the row_nums (shift up)
            await client.query(
                `UPDATE scripts_t5  
                 SET row_num = row_num - 1
                 WHERE row_num > $1
                   AND show_name = $2
                   AND show_date = $3;`,
                [row_num, show_name, show_date]
            );

            await client.query('COMMIT');
            return res.status(200).send("No row deleted, but row numbers updated.");
        }
    } catch (err) {
        await client.query('ROLLBACK');
        console.error("Error in conditional delete:", err.message);
        res.status(500).send("Failed to process delete/update.");
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
    const { show_name, show_date } = req.body;

    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        // Step 1: Check if start row already exists
        const checkStartRow = await client.query(`
            SELECT 1 FROM scripts_t5
            WHERE show_name = $1 AND show_date = $2 AND block = 'A' AND item_num = 0
            LIMIT 1;
        `, [show_name, show_date]);

        if (checkStartRow.rowCount > 0) {
            await client.query('ROLLBACK');
            return res.status(400).send("Start row already exists. No insert performed.");
        }

        // Step 2: Shift existing row numbers down
        await client.query(`
            UPDATE scripts_t5  
            SET row_num = row_num + 1
            WHERE show_name = $1 
              AND show_date = $2;
        `, [show_name, show_date]);

        // Step 3: Insert start row at row_num = 1
        await client.query(`
            INSERT INTO scripts_t5 (show_name, show_date, row_num, block, item_num, modified)
            VALUES ($1, $2, 1, 'A', 0, now() AT TIME ZONE 'America/Chicago');
        `, [show_name, show_date]);

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


//update-after-dragNdrop
app.post("/update-after-dragNdrop", isAuthenticated, async (req, res) => {
    const { show_name, show_date, draggedIndx, targetIndx, tempID } = req.body;

    const tempUpdate = `
            UPDATE scripts_t5  
            SET row_num = $4
            WHERE row_num = $3
              AND show_name = $1 
              AND show_date = $2;
    `;

    const ifTargetLower = `
            UPDATE scripts_t5  
            SET row_num = row_num + 1
            WHERE row_num >= $4 and row_num < $3
              AND show_name = $1 
              AND show_date = $2;
    `;

    const ifTargetHigher = `
            UPDATE scripts_t5  
            SET row_num = row_num - 1
            WHERE row_num > $3 and row_num <= $4
              AND show_name = $1 
              AND show_date = $2;
    `;

    const updateTarget = `
            UPDATE scripts_t5  
            SET row_num = $3
            WHERE row_num = $4
              AND show_name = $1 
              AND show_date = $2;
    ;`

    const client = await pool.connect();

    try{

        await client.query('BEGIN');

        await pool.query(tempUpdate, [show_name, show_date, draggedIndx, tempID]);

        if(draggedIndx > targetIndx)
        {
            await pool.query(ifTargetLower, [show_name, show_date, draggedIndx, targetIndx]);
        }
        else if(draggedIndx < targetIndx)
        {
            await pool.query(ifTargetHigher, [show_name, show_date, draggedIndx, targetIndx]);
        }

        await pool.query(updateTarget, [show_name, show_date, targetIndx, tempID]);

        await client.query('COMMIT');

        res.status(200).send("Dragged and dropped successfully!");
    } catch (err) {
        console.error("Error dropping data:", err.message);
        res.status(500).send("Failed to drop data.");
    }
});


app.post("/add-show", async (req, res) => {
    const { show_name, show_date, folder, template_version } = req.body;
  
    // Validate inputs
    if (!show_name || !show_date || !folder || !template_version) {
      return res.status(400).json({ error: "Show name, date, folder, and template version are required." });
    }
  
    try {
      // Confirm that the selected template version exists
      const checkTemplate = await pool.query(
        "SELECT * FROM template_t5 WHERE template_version = $1",
        [template_version]
      );
  
      if (checkTemplate.rows.length === 0) {
        return res.status(400).json({ error: `Template version "${template_version}" does not exist.` });
      }
  
      // Insert the show into rundown_t5
      const insert_query = `
        INSERT INTO rundown_t5 (show_name, show_date, folder, active, template_version)
        VALUES ($1, $2, $3, true, $4)
      `;
  
      await pool.query(insert_query, [
        show_name.trim(),
        show_date,
        folder.trim(),
        template_version.trim()
      ]);
  
      console.log(`✅ Server: Added show "${show_name}" with template "${template_version}"`);
      res.status(201).json({ message: "Show added successfully." });
  
    } catch (err) {
      console.error("❌ Error adding show:", err.message);
      res.status(500).json({ error: "Failed to add show." });
    }
  });




//catch invalid routs
app.use((req, res) => {
    res.redirect("/");
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});