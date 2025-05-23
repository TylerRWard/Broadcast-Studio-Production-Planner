require('dotenv').config(); // This will automatically look for a `.env` file in the root.
const express = require("express");
const fs = require("fs").promises;
const path = require("path");
const { Pool } = require("pg");
const bcrypt = require("bcryptjs");
const session = require("express-session");
const { isatty } = require("tty");
const PDFDocument = require('pdfkit');
const pgSession = require("connect-pg-simple")(session);

const app = express();
const port = 3005;

const pool = new Pool({
        user: process.env.DB_USER,
        host: process.env.DB_HOST,
        database: process.env.DB_NAME,
        password: process.env.DB_PASSWORD,
        port: process.env.DB_PORT,
        ssl: { rejectUnauthorized: false }
});

pool.connect()
    .then(() => { console.log("Connected!!"); })
    .catch(() => { console.log("Not Connected"); });

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Use session with PostgreSQL store
app.use(session({
    store: new pgSession({
        pool: pool,                  // Reuse the same connection pool
        tableName: 'user_sessions',   // Optional: custom session table name
        createTableIfMissing: true,    // Optional: automatically create table if it doesn't exist
        cleanupInterval: 60 * 60 // Every hour, clean expired sessions
    }),
    secret: process.env.SESSION_SECRET, // Replace with process.env.SESSION_SECRET in production
    resave: false,
    saveUninitialized: false,
    cookie: {
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
        secure: false,                    // Set to true in production with HTTPS
        httpOnly: true,                   // Helps prevent XSS
        sameSite: 'strict'                // Helps prevent CSRF
    }
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
    const { username, password } = req.body;
    try {
        const query = "SELECT * FROM users_t5 WHERE username = $1";
        const result = await pool.query(query, [username]);
        if (result.rows.length === 0) {
            return res.status(401).json({ message: "Invalid credentials" });
        }
        const user = result.rows[0];
        const match = await bcrypt.compare(password, user.password);
        if (match) {
            req.session.isAuthenticated = true;
            req.session.user = { name: user.name, username: user.username, adminLevel: user.admin_level };
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
    const { name, username, password, adminLevel } = req.body;
    const saltRounds = 10;
    try {
        if (!name || !password || !adminLevel) {
            return res.status(400).json({ message: "Missing required fields" });
        }
        const passwordHash = await bcrypt.hash(password, saltRounds);
        const insertQuery = `
            INSERT INTO users_t5 (name, password, username, admin_level)
            VALUES ($1::varchar, $2::varchar, $3::varchar, $4::varchar)
            RETURNING name, username, admin_level
        `;
        const result = await pool.query(insertQuery, [name, passwordHash, username, adminLevel]);
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
    const { username } = req.body;
    console.log("Delete request received for:", username);
    try {
        const query = "DELETE FROM users_t5 WHERE username = $1 RETURNING username";
        const result = await pool.query(query, [username]);
        if (result.rowCount === 0) {
            console.log("No user found with username:", username);
            return res.status(404).json({ message: "User not found" });
        }
        console.log("User deleted:", username);
        res.status(200).json({ message: "User deleted successfully" });
    } catch (err) {
        console.error("Error deleting user:", err.message);
        res.status(500).json({ message: "Failed to delete user" });
    }
});
//change password
app.put("/change-password", isAuthenticated, async (req, res) => {
    const { username, newPassword } = req.body;
    const saltRounds = 10;
    console.log("Change password request received for:", username);
    try {
        if (!username || !newPassword) {
            return res.status(400).json({ message: "username and new password are required" });
        }
        const passwordHash = await bcrypt.hash(newPassword, saltRounds);
        const query = `
            UPDATE users_t5
            SET password = $1 
            WHERE username = $2 
            RETURNING username, name
        `;
        const result = await pool.query(query, [passwordHash, username]);
        if (result.rowCount === 0) {
            console.log("No user found with username:", username);
            return res.status(404).json({ message: "User not found" });
        }
        console.log("Password updated for:", username);
        res.status(200).json({ message: "Password changed successfully" });
    } catch (err) {
        console.error("Error changing password:", err.message);
        res.status(500).json({ message: "Failed to change password" });
    }
});


// Get all users
app.get("/get-users", isAuthenticated, async (req, res) => {
    try {
        const query = "SELECT name, username, admin_level FROM users_t5 ORDER BY name";
        const result = await pool.query(query);
        res.status(200).json({ users: result.rows });
    } catch (err) {
        console.error("Error fetching users:", err.message);
        res.status(500).json({ message: "Failed to fetch users" });
    }
});



//serve landing page as root
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname,"public", "landingPage.html"));
});


/***********************************Export Functions**************************************************************** */

//generateRundownPDF
app.get("/generate-rundownpdf/:show_name/:show_date", isAuthenticated, async (req, res) =>{
    const {show_name, show_date} = req.params;
// Query to retrieve basic show information if active
    const show_info_query = `
    SELECT show_name, show_date 
    FROM rundown_t5 
    WHERE active = true 
    AND show_name = $1 
    AND show_date = $2 
    LIMIT 1
`;
// Query to retrieve rundown script details for the specified show
    const scripts_query = `
        SELECT 
            cam, shot, tal, slug, format, 
            read, sot, total, ok, channel, 
            writer, editor, modified
        FROM scripts_t5 
        WHERE show_name = $1 
        AND show_date = $2 
        ORDER BY row_num ASC
    `;

    try {
// Run show info query
        const showInfo = await pool.query(show_info_query, [show_name, show_date]);

        console.log("Querying with:", showInfo);
        console.log("Query result:", showInfo.rows);
        const showRow = showInfo.rows[0];

        if (!showRow) throw new Error("No active rundown found.");

     // Fetch scripts
        const scriptData = await pool.query(scripts_query, [show_name, show_date]);
        const scripts = scriptData.rows;

        console.log(scripts);
 // Sanitize filename
        const safeShowName = show_name.replace(/[\\/:*?"<>|]/g, '_');
        // Create new landscape A4 PDF document
        const doc = new PDFDocument({ margin: 40, size: 'A4', layout: 'landscape' });

        res.setHeader('Content-Disposition', `attachment; filename=${safeShowName}_Rundown.pdf`);
        res.setHeader('Content-Type', 'application/pdf');
        doc.pipe(res);
// Format date for display
        const formattedDate = new Date(show_date).toLocaleDateString();

        // Header
        doc.fontSize(10).text(`Show: ${show_name}`, 40, 30, { align: 'left' });
        doc.fontSize(10).text(`Date: ${formattedDate}`, { align: 'right' });
        doc.moveDown(1);

        doc.fontSize(16).text('Rundown Table', { align: 'center' });
        doc.moveDown();

        // Define table headers and widths
        const headers = ['CAM', 'SHOT', 'TAL', 'SLUG', 'FORMAT', 'READ', 'SOT', 'TOTAL', 'OK', 'CH', 'WR', 'ED', 'LAST MODIFIED'];
        const columnWidths = [40, 60, 40, 90, 60, 40, 40, 40, 40, 40, 40, 40, 80];
        const startX = 40;
        let y = doc.y;

        // Draw header row
        headers.forEach((header, i) => {
            doc.fontSize(8).font('Helvetica-Bold').text(header, startX + columnWidths.slice(0, i).reduce((a, b) => a + b, 0), y, {
                width: columnWidths[i],
                align: 'left'
            });
        });
// Draw line under headers
        y += 15;
        doc.moveTo(startX, y).lineTo(startX + columnWidths.reduce((a, b) => a + b), y).stroke();

        // write rows
        scripts.forEach((row, index) => {
            y += 12;
            if (y > doc.page.height - 40) {
                doc.addPage();
                y = 40;
            }

            const values = [
                row.cam ?? '',
                row.shot ?? '',
                row.tal ?? '',
                row.slug ?? '',
                row.format ?? '',
                row.read ?? '00:00',
                row.sot ?? '00:00',
                row.total ?? '00:00',
                row.ok ?? '',
                row.channel ?? '',
                row.writer ?? '',
                row.editor ?? '',
                row.modified ? new Date(row.modified).toLocaleString() : '',
                
            ];

            values.forEach((val, i) => {
                doc.fontSize(7).font('Helvetica').text(val, startX + columnWidths.slice(0, i).reduce((a, b) => a + b, 0), y, {
                    width: columnWidths[i],
                    align: 'left'
                });
            });
        });

        doc.end();
        console.log("PDF rundown table generated!");
    } catch (err) {
        console.error("Error generating PDF:", err);
    }

});


/****************************generateScriptPDF*********************************/

app.get("/generate-scriptpdf/:show_name/:show_date", isAuthenticated, async (req, res) =>{
    const {show_name, show_date} = req.params;
// Query to verify show exists and is active
    const show_info_query = `
    SELECT show_name, show_date 
    FROM rundown_t5 
    WHERE active = true 
    AND show_name = $1 
    AND show_date = $2 
    LIMIT 1
`;

     // Query to retrieve script lines for the show
    const select_query = `
    SELECT row_num, speaking_line 
    FROM scripts_t5 
    WHERE show_date = $1 
    AND show_name = $2
    ORDER BY row_num ASC
`;

    try {
// Check if the show exists and is active
        const showInfo = await pool.query(show_info_query, [show_name, show_date]);
        const showRow = showInfo.rows[0];

        if (!showRow) {
            throw new Error("No show info found in rundown_t5");
        }

        const result = await pool.query(select_query, [show_date, show_name]);
        
        const data = result.rows;
        const showName = show_name;

        const safeShowName = show_name.replace(/[\\/:*?"<>|]/g, '_');
        const doc = new PDFDocument({ margin: 40, size: 'A4', layout: 'landscape' });

        res.setHeader('Content-Disposition', `attachment; filename=${safeShowName}_Script.pdf`);
        res.setHeader('Content-Type', 'application/pdf');
        doc.pipe(res);

        const currentDate = new Date();
        const formattedDate = currentDate.toLocaleString();

        // Header: Show name and date
        doc.fontSize(10).text(`Show: ${showName}`, 50, 30, { align: 'left' });
        doc.fontSize(10).text(formattedDate, { align: 'right' });

        doc.moveDown(2);

        doc.fontSize(20).text('Script File', { align: 'center' });
        doc.moveDown(1);

        // Render script lines in order
        data.forEach((row, index) => {
            const scriptLine = row.speaking_line || '[Empty Line]';
            doc.fontSize(12)
               .text(`${index + 1}. ${scriptLine}`, {
                   align: 'left',
                   indent: 20
               });
            doc.moveDown(0.3);
        });

        doc.end();
        console.log("PDF generated!");
    } catch (err) {
        console.error("Error generating PDF:", err);
    }

});


/*************************************************************************************************** */

// ************************************DIRECTORY************************************************************************ //

app.get("/rundowns", isAuthenticated, async (req, res) => {
    // parse active=true|false (default to true)
    const active = req.query.active === "false" ? false : true;
  
    const select_query = `
      SELECT
        ft.folder        AS folder_topic,
        r.show_name,
        r.show_date,
        r.template_version
      FROM
        folder_topics_t5 ft
      LEFT JOIN
        rundown_t5 r
          ON ft.folder = r.folder
         AND r.active = $1
      WHERE
        ft.folder IS NOT NULL
        AND ft.folder != ''
      ORDER BY
        ft.folder,
        r.show_date,
        r.show_name;
    `;
  
    try {
      const { rows } = await pool.query(select_query, [active]);
      res.json(rows);
    } catch (err) {
      console.error("Error fetching rundowns:", err);
      res.status(500).send("Failed to fetch rundowns.");
    }
  });

  app.patch("/update-show-active", isAuthenticated, async (req, res) => {
    const { show_name, show_date, folder, active } = req.body;
    if (typeof active !== "boolean" ||
        !show_name || !show_date || !folder) {
      return res.status(400).json({ error: "Missing or invalid parameters." });
    }
  
    try {
      await pool.query(
        `UPDATE rundown_t5
            SET active = $4
          WHERE show_name = $1
            AND show_date  = $2
            AND folder     = $3`,
        [show_name, show_date, folder, active]
      );
      res.sendStatus(204);
    } catch (err) {
      console.error("Error updating show active:", err);
      res.status(500).json({ error: "Failed to update show." });
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

// Retrieve show date and needed columns for a show name
app.get("/get-details-rundown", isAuthenticated, async (req, res) => {
    const { show_name, folder, active, template_version } = req.query;

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



// Add Template into templates_t5
app.post("/add-template", isAuthenticated, async(req, res) => {
    const {templateName, columnNames} = req.body;
    const insert_query = "insert into template_t5 (template_version, needed_columns) values ($1, $2)";
    try{
        const result = await pool.query(insert_query, [templateName, columnNames]);
        //console.log(result);
        //res.status(200).send("Data inserted successfully!");
    } catch (err) {
        console.error("Error inserting data:", err.message);
        res.status(500).send("Failed to insert data.");
    }
});


// Retrieve templates versions
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


// Retrieve columns names for selected template version
app.get("/get-column-names/:version", isAuthenticated, async (req, res) => {
    const { version } = req.params;  // Extract version from the request URL
    const select_query = "SELECT needed_columns FROM template_t5 WHERE template_version = $1";
    try {
        const result = await pool.query(select_query, [version]);

        const checkDate = str => !isNaN(new Date(str).getTime());
        const isDate = checkDate(result.rows[0].needed_columns.replace(/[{}"]/g, '').split(',')[0]);

        let show_name = null;
        let show_date = null;
        let columnNames;
        let isShowInTable = false;

        if(isDate)
        {
            show_date = result.rows[0].needed_columns.replace(/[{}"]/g, '').split(',')[0];
            show_name = result.rows[0].needed_columns.replace(/[{}"]/g, '').split(',')[1];
            const temp_name = result.rows[0].needed_columns.replace(/[{}"]/g, '').split(',')[2];

            const check_show = `SELECT 1 FROM rundown_t5 WHERE show_name = $1 AND show_date = $2
                                    LIMIT 1 `

            const check_show_result = await pool.query(check_show, [show_name.trim(), show_date.trim()]);
            if (check_show_result.rowCount > 0)
            {
                isShowInTable = true;
            }

            const check_query = `SELECT needed_columns FROM template_t5 WHERE template_version = $1`
            const check_result = await pool.query(check_query, [temp_name]);
            if(check_result.rowCount > 0 )
            {
                columnNames = check_result.rows[0].needed_columns.replace(/[{}"]/g, '').split(',');
            }
            else
            {
                const defaultColumnNames = await pool.query(`SELECT needed_columns FROM template_t5 WHERE template_version = 'Default'`);
                columnNames = defaultColumnNames.rows[0].needed_columns.replace(/[{}"]/g, '').split(',');
            }
        }
        else
        {
            columnNames = result.rows[0].needed_columns.replace(/[{}"]/g, '').split(',');
        } 

        console.log("column names; ",isDate );
        res.status(200).json({columnNames, show_name, show_date, isShowInTable});
    } catch (err) {
        console.error("Error fetching data:", err.message);
        res.status(500).send("Failed to fetch data.");
    }
});

// Delete a template version.
app.delete("/delete-template", isAuthenticated, async (req, res) => {
    const { template_version } = req.body;

    const delete_query = "DELETE FROM template_t5 WHERE template_version = $1";
    try {

        await pool.query(`
            UPDATE rundown_t5 
            SET template_version = 'Default'
            WHERE template_version = $1;
        `, [template_version]);  

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


// Add rundown into folder_topics_t5 table
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
        //res.status(200).send("Data inserted successfully!");
    } catch (err) {
        console.error("Error inserting data:", err.message);
        res.status(500).send("Failed to insert data.");
    }
});

// Move a show into a different folder
app.patch("/update-show-folder", isAuthenticated, async (req, res) => {
    const { show_name, show_date, old_folder, new_folder } = req.body;
  
    // Basic validation
    if (!show_name || !show_date || !old_folder || !new_folder) {
      return res
        .status(400)
        .json({ error: "show_name, show_date, old_folder and new_folder are required." });
    }
  
    try {
      const result = await pool.query(
        `UPDATE rundown_t5
           SET folder = $1
         WHERE show_name = $2
           AND show_date = $3
           AND folder    = $4`,
        [new_folder.trim(), show_name.trim(), show_date, old_folder.trim()]
      );
  
      if (result.rowCount === 0) {
        return res
          .status(404)
          .json({ error: "No matching show found in the specified folder." });
      }
  
      console.log(`➡️ Server: Moved "${show_name}" on ${show_date} from "${old_folder}" to "${new_folder}"`);
      res.json({ message: "Show folder updated." });
    } catch (err) {
      console.error("Error updating show folder:", err);
      res.status(500).json({ error: "Failed to update show folder." });
    }
  });

// Get rundown list 
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

// Retrieve relevant columns for specific show name and show date
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

// Insert a row into scripts_t5
app.post("/add-row-scripts_t5", isAuthenticated, async (req, res) => {
    const username = req.session.user.username;
    const { item_num, block, show_date, show_name, row_num } = req.body;

    //Prevent having two start rows
    if (block === "A" && item_num === "0") {
        // Check if start row already exists
        const checkStartRow = await pool.query(`
            SELECT 1 FROM scripts_t5
            WHERE show_name = $1 AND show_date = $2 AND block = 'A' AND item_num = 0
            LIMIT 1
        `, [show_name, show_date]);
    
        if (checkStartRow.rowCount > 0) {
            return res.status(400).send("Start row already exists. No insert performed.");
        }
    }

    // Does a row already exist at this row_num?
    const checkExistingRowQuery = `
        SELECT 1 FROM scripts_t5
        WHERE show_name = $1 AND show_date = $2 AND row_num = $3
        LIMIT 1
    `;

    // Row already exists → update it
    const updateQuery = `
    UPDATE scripts_t5
    SET block = $1, item_num = $2, modified = now() AT TIME ZONE 'America/Chicago', mod_by = $6
    WHERE show_name = $3 AND show_date = $4 AND row_num = $5
`;

    // Row doesn't exist → insert it
    const insertQuery = `
    INSERT INTO scripts_t5 (show_name, show_date, row_num, block, item_num, read, sot, total, modified, mod_by)
    VALUES ($1, $2, $3, $4, $5, '00:00', '00:00', '00:00', now() AT TIME ZONE 'America/Chicago', $6)
`;
    
    // Get Just inserted data
    const getInsertedData = `
    select modified, mod_by, TO_CHAR(read, 'SS:MI')as read, TO_CHAR(sot, 'SS:MI')as sot, TO_CHAR(total, 'SS:MI')as total from scripts_t5
    where show_name = $1 and show_date = $2 and row_num = $3
`;

    try {
        const existingRowCheck = await pool.query(checkExistingRowQuery, [show_name, show_date, row_num]);

        if (existingRowCheck.rowCount > 0) {
            
            await pool.query(updateQuery, [block, item_num, show_name, show_date, row_num, username]);
            
            const result =await pool.query(getInsertedData, [show_name, show_date, row_num]);
            return res.status(200).json(result.rows[0]);

        } else {
            
            await pool.query(insertQuery, [show_name, show_date, row_num, block, item_num, username]);

            const result =await pool.query(getInsertedData, [show_name, show_date, row_num]);
            return res.status(200).json(result.rows[0]);
        }
    } catch (err) {
        console.error("Error inserting/updating data:", err.message);
        res.status(500).send("Failed to insert or update data.");
    }
});


// Get the last row_num of the relevant show to check how many rows should draw
app.get("/get-last-row_num", isAuthenticated, async (req, res) => {
    const { show_name, show_date } = req.query;
  
    try {
      const result = await pool.query(`
        SELECT MAX(row_num) AS last_row_num
        FROM scripts_t5
        WHERE show_name = $1 AND show_date = $2;
      `, [show_name, show_date]);
  
      res.status(200).json({ last_row_num: result.rows[0].last_row_num ?? 0 });
    } catch (err) {
      console.error("Error fetching data:", err.message);
      res.status(500).send("Failed to fetch data.");
    }
  });

  
// Get the data of relevant rundown from scripts_t5
app.get("/get-scripts-data/:show_name/:show_date", isAuthenticated, async (req, res) => {
    
    const { show_name, show_date } = req.params;

    const select_query = `select block, item_num, row_num, cam, shot, tal, slug, format, TO_CHAR(read, 'SS:MI')as read, ok, channel, writer, editor, modified, TO_CHAR(sot, 'SS:MI')as sot, TO_CHAR(total, 'SS:MI')as total, mod_by, speaking_line from scripts_t5
                    where show_name = $1 and show_date = $2
                    order by row_num`;
    try {
        const result = await pool.query(select_query, [show_name.trim(), show_date.trim()]);
        //console.log(result);
        res.status(200).json(result.rows);
    } catch (err) {
        console.error("Error fetching data:", err.message);
        res.status(500).send("Failed to fetch data.");
    }
});

app.get("/formats", isAuthenticated, async (req, res) => {
    const { rows } = await pool.query(
      `SELECT format
         FROM format_t5
        ORDER BY format`
    );
    res.json(rows);
  });

  app.post("/formats", isAuthenticated, async (req, res) => {
    const { format } = req.body;
    if (!format) return res.status(400).send("Missing format.");
    try {
      await pool.query(
        `INSERT INTO format_t5 (format) VALUES ($1) ON CONFLICT (format) DO NOTHING`,
        [format]
      );
      res.sendStatus(200);
    } catch (err) {
      console.error("Insert error:", err);
      res.status(500).send("Failed to insert format.");
    }
  });
  
  app.delete("/formats/:name", isAuthenticated, async (req, res) => {
    const format = decodeURIComponent(req.params.name);
  
    try {
      // Step 1: Null out all usages in scripts_t5
      await pool.query(
        `UPDATE scripts_t5
         SET format = NULL
         WHERE format = $1`,
        [format]
      );
  
      // Step 2: Delete from format_t5
      await pool.query(
        `DELETE FROM format_t5 WHERE format = $1`,
        [format]
      );
  
      res.status(200).send("Format deleted and cleared from scripts.");
    } catch (err) {
      console.error("Error deleting format:", err.message);
      res.status(500).send("Failed to delete format.");
    }
  });
  
// Retrieve all available shots
app.get("/shots", isAuthenticated, async (req, res) => {
    try {
      const { rows } = await pool.query(
        `SELECT shot FROM shot_t5 ORDER BY shot`
      );
      res.json(rows);
    } catch (err) {
      console.error("Error fetching shots:", err);
      res.status(500).send("Failed to fetch shots.");
    }
  });

  // Add a shot
  app.post("/shots", isAuthenticated, async (req, res) => {
    const { shot } = req.body;
  
    if (!shot || shot.trim() === "") {
      return res.status(400).send("Shot is required.");
    }
  
    try {
      await pool.query(
        `INSERT INTO shot_t5 (shot)
         VALUES ($1)
         ON CONFLICT (shot) DO NOTHING`,
        [shot.trim()]
      );
      res.status(200).send("Shot added successfully.");
    } catch (err) {
      console.error("Error adding shot:", err);
      res.status(500).send("Failed to add shot.");
    }
  });

  // Delete a shot
  app.delete("/shots/:name", isAuthenticated, async (req, res) => {
    const shot = decodeURIComponent(req.params.name);
  
    try {
      // Step 1: Null out all usages in scripts_t5
      await pool.query(
        `UPDATE scripts_t5
         SET shot = NULL
         WHERE shot = $1`,
        [shot]
      );
  
      // Step 2: Delete from shot_t5
      await pool.query(
        `DELETE FROM shot_t5 WHERE shot = $1`,
        [shot]
      );
  
      res.status(200).send("Shot deleted and cleared from scripts.");
    } catch (err) {
      console.error("Error deleting shot:", err.message);
      res.status(500).send("Failed to delete shot.");
    }
  });
  
//update-data-in-rundown
app.post("/update-data-in-rundown", isAuthenticated, async (req, res) => {
    const username = req.session.user.username;
    const { show_name, show_date, row_number, block, item_num, column_name, data } = req.body;

    // 🔒 Validate column_name against allowed columns
    const allowedColumns = [
        "block", "item_num", "cam", "shot", "tal", "slug",
        "format", "read", "sot", "total", "ok", "channel",
        "writer", "editor"
    ];

    if (!allowedColumns.includes(column_name)) {
        return res.status(400).send("Invalid column name.");
    }

    // Prevent having two start rows
    if (block === 'A' && item_num === 0) {
        const checkStartRow = await pool.query(`
            SELECT 1 FROM scripts_t5
            WHERE show_name = $1 AND show_date = $2 AND block = 'A' AND item_num = 0
            LIMIT 1
        `, [show_name, show_date]);

        if (checkStartRow.rowCount > 0) {
            return res.status(400).send("Start row already exists. No insert performed.");
        }
    }

    // If inserting new format
    if (column_name === 'format') {
        await pool.query(
            `INSERT INTO format_t5 (format)
             VALUES ($1)
             ON CONFLICT (format) DO NOTHING;`,
            [data]
        );
    }

    // Conditionally include mod_by
    const mod_by_query = column_name === "ok" ? "" : ", mod_by = $7";

    const update_query = `
        UPDATE scripts_t5
        SET ${column_name} = $6,
            modified = now() AT TIME ZONE 'America/Chicago'${mod_by_query}
        WHERE show_name = $1 
          AND show_date = $2 
          AND row_num = $3 
          AND block = $4 
          AND item_num = $5;
    `;

    try {
        const values = [show_name, show_date, row_number, block, item_num, data];
        if (column_name !== "ok") values.push(username);

        await pool.query(update_query, values);
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
                select ${column_name}, modified, mod_by, row_num from scripts_t5
                where show_name = $1 and show_date = $2 and row_num = $3 ;
    `;

    const select_query2 = `
                select TO_CHAR(${column_name}, 'SS:MI')as ${column_name}, TO_CHAR(total, 'SS:MI')as total, modified, mod_by, row_num from scripts_t5
                where show_name = $1 and show_date = $2 and row_num = $3 ;
    `;

    const update_query2 = `
        UPDATE scripts_t5 
        SET total = read + sot
        WHERE show_name = $1 AND show_date = $2 AND row_num = $3  
    `;

    let result;

    try{

        if(column_name === "read" || column_name === "sot" ) // || column_name === "total"
        {
            await pool.query(update_query2, [show_name, show_date, row_number]);

            result = await pool.query(select_query2, [show_name, show_date, row_number]);
        }
        else
        {
            result = await pool.query(select_query, [show_name, show_date, row_number]);
        }
       
        console.log(result);
        res.status(200).json(result.rows);
    } catch (err) {
        console.error("Error fetching data:", err.message);
        res.status(500).send("Failed to fetch data.");
    }
});

// Detele a row in a rundown
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
        
        const select_query = `
            select modified
            from scripts_t5
            WHERE show_name = $1 AND show_date = $2 AND block = 'A' AND item_num = 0
        `;

        const result2 = await pool.query(select_query, [show_name, show_date]);
        res.status(200).json(result2.rows[0]);

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

//find-next-block-break
app.get("/find-next-block-break/:show_name/:show_date", isAuthenticated, async (req, res) => {
    const { show_name, show_date } = req.params;

    const select_query = `
        SELECT CHR(ASCII(block) + 1) AS next_block
        FROM scripts_t5
        WHERE show_name = $1 
          AND show_date = $2
          AND item_num = 0
        ORDER BY block DESC
        LIMIT 1;
    `;

    try {
        const result = await pool.query(select_query, [show_name, show_date]);

        let nextBlock;

        if (result.rows.length === 0) {
            nextBlock = 'B';  // Default if no item_num = 0 rows
        } else {
            nextBlock = result.rows[0].next_block;
        }

        res.status(200).json({ next_block: nextBlock });

    } catch (err) {
        console.error("Error fetching data:", err.message);
        res.status(500).send("Failed to fetch data.");
    }
});


//insert-a-break-row
app.post("/insert-a-break-row", isAuthenticated, async (req, res) => {
    const { show_name, show_date, breakBlock, row_num } = req.body;

    const insert_query = `
        INSERT INTO scripts_t5 (show_name, show_date, row_num, block, item_num, modified)
            VALUES ($1, $2, $4, $3, 0, now() AT TIME ZONE 'America/Chicago');
    `;

    try {

        // Step 1: Shift existing row numbers down
        await pool.query(`
            UPDATE scripts_t5  
            SET row_num = row_num + 1
            WHERE show_name = $1 
            AND show_date = $2
            AND row_num >= $3;
        `, [show_name, show_date, row_num]);

        // Step 2: insert a break row
        const result = await pool.query(insert_query, [show_name, show_date, breakBlock, row_num]);

        const select_query = `
            select modified
            from scripts_t5
            WHERE show_name = $1 AND show_date = $2 AND row_num = $3
        `;

        const result2 = await pool.query(select_query, [show_name, show_date, row_num]);
        res.status(200).json(result2.rows[0]);

    } catch (err) {
        console.error("Error inserting break row:", err.message);
        res.status(500).send("Failed to insert break row.");
    }

});

// add a show into rundown_t5
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

          const copy_rows = `
            INSERT INTO scripts_t5 (show_name, show_date, block, item_num, row_num, cam, shot, tal, slug, format, read, ok, channel, writer, editor, modified, speaking_line, sot, total, mod_by )
                SELECT 
                $1 AS show_name,
                $2 AS show_date,
                block, item_num, row_num, cam, shot, tal, slug, format, read, ok, channel, writer, editor, modified, speaking_line, sot, total, mod_by 
                FROM scripts_t5
            WHERE show_name = $3 AND show_date = $4
          `;
    

      // Check if the template has date in it. IF so it is a rundown template
      const select_query = "SELECT needed_columns FROM template_t5 WHERE template_version = $1";
      const result = await pool.query(select_query, [template_version]);

      const checkDate = str => !isNaN(new Date(str).getTime());
      const isDate = checkDate(result.rows[0].needed_columns.replace(/[{}"]/g, '').split(',')[0]);

      let template_show_name;
      let template_show_date;
      let template_template_version;

      if(isDate)
      {
            template_show_date = result.rows[0].needed_columns.replace(/[{}"]/g, '').split(',')[0];
            template_show_name = result.rows[0].needed_columns.replace(/[{}"]/g, '').split(',')[1];
            template_template_version = result.rows[0].needed_columns.replace(/[{}"]/g, '').split(',')[2];

            const check_show = `SELECT 1 FROM rundown_t5 WHERE show_name = $1 AND show_date = $2
                                    LIMIT 1 `

            const check_show_result = await pool.query(check_show, [template_show_name.trim(), template_show_date.trim()]);
            if (check_show_result.rowCount === 0)
            {
                return res.status(400).json({ error: `Original version-"${template_show_name}" of this template-"${template_version}" does not exist.` });
            }

            await pool.query(insert_query, [
                show_name.trim(),
                show_date,
                folder.trim(),
                template_template_version.trim()
              ]);

              await pool.query(copy_rows, [show_name.trim(), show_date.trim(), template_show_name.trim(), template_show_date.trim()]);
              
              
      }
      else
      {
        await pool.query(insert_query, [
            show_name.trim(),
            show_date,
            folder.trim(),
            template_version.trim()
          ]);
      }
  
      console.log(`✅ Server: Added show "${show_name}" with template "${template_version}"`);
      res.status(201).json({ message: "Show added successfully." });
  
    } catch (err) {
      console.error("❌ Error adding show:", err.message);
      res.status(500).json({ error: "Failed to add show." });
    }
  });

  app.get("/get-speaking-lines/:show_name/:show_date/:row_num", isAuthenticated, async (req, res) => {
    const { show_name, show_date, row_num } = req.params;

    const checkQuery = `
        SELECT 1 
        FROM scripts_t5 
        WHERE show_name = $1 
            AND show_date = $2 
            AND row_num = $3 
        LIMIT 1
    `;

    const select_query = `
        SELECT speaking_line 
        FROM scripts_t5
        WHERE show_name = $1 
        AND show_date = $2
        AND row_num = $3
    `;

    try {
        const result = await pool.query(checkQuery, [show_name, show_date, row_num]);

        if (result.rowCount === 1) {
            const result2 = await pool.query(select_query, [show_name, show_date, row_num]);
            return res.status(200).json(result2.rows[0]);  // send speaking_line only
        } else
        {
            return res.status(200).json({speaking_line: null});  // send speaking_line only 
        }

    } catch (err) {
        console.error("Error retrieving speaking lines:", err.message);
        res.status(500).send("Failed to get speaking lines.");
    }
});

//**************************Insert script text*****************************//
app.post("/insert-script-text", isAuthenticated, async (req, res) => {
    const { show_name, show_date, row_num, scriptText, readTime } = req.body;
// SQL query to update the speaking line and read time for a specific row in the scripts_t5 table
    const update_query = `
        UPDATE scripts_t5 
        SET speaking_line = $4, read = $5, modified = now() AT TIME ZONE 'America/Chicago'
        WHERE show_name = $1 AND show_date = $2 AND row_num = $3  
    `;

    try {// Execute the update query to modify the script line and read time
        const result = await pool.query(update_query, [show_name, show_date, row_num, scriptText, readTime]);
// Query to update the 'total' field by adding the 'read' and 'sot' values
        const update_query2 = `
        UPDATE scripts_t5 
        SET total = read + sot
        WHERE show_name = $1 AND show_date = $2 AND row_num = $3  
    `;
// Execute the second update query to update the 'total' field
    const update = await pool.query(update_query2, [show_name, show_date, row_num]);
// SQL query to select the updated read time, total time, and last modified timestamp for the row
        const select_query = `
            select TO_CHAR(read, 'SS:MI')as read, TO_CHAR(total, 'SS:MI')as total, modified
            from scripts_t5
            WHERE show_name = $1 AND show_date = $2 AND row_num = $3 
        `;

        const result2 = await pool.query(select_query, [show_name, show_date, row_num]);

// Send the updated script details back in the response
        res.status(200).json(result2.rows[0]);
    } catch (err) {// Log error and send response with a 500 status code if there's an issue
        console.error("Error inserting script text row:", err.message);
        res.status(500).send("Failed to insert script text row.");
    }

});

app.get("/get-tags", isAuthenticated, async (req, res) => {
    // SQL query to retrieve all tag options from the tags_t5 table
    const select_query = `
        SELECT tag_option 
        FROM tags_t5
    `;
    try {
        const result = await pool.query(select_query)
        return res.status(200).json(result.rows);
    } catch (err) {
        console.error("Error retrieving tags:", err.message);
        res.status(500).send("Failed to get tags.");
    }
});




// server.js
app.delete("/delete-show", isAuthenticated, async (req, res) => {
    const { show_name, show_date, folder } = req.query;
    if (!show_name || !show_date || !folder) {
      return res
        .status(400)
        .json({ error: "Missing show_name, show_date, or folder." });
    }
  
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
  
      // 1) delete all script rows for this show
      await client.query(
        `DELETE FROM scripts_t5
           WHERE show_name = $1
             AND show_date  = $2`,
        [show_name, show_date]
      );
  
      // 2) delete the rundown row itself
      const result = await client.query(
        `DELETE FROM rundown_t5
           WHERE show_name = $1
             AND show_date  = $2
             AND folder     = $3`,
        [show_name, show_date, folder]
      );
      if (result.rowCount === 0) {
        throw new Error("Show not found");
      }
  
      await client.query("COMMIT");
      console.log(
        `🗑️ Deleted show "${show_name}" on ${show_date} in folder "${folder}"`
      );
      res.json({ message: "Show deleted." });
    } catch (err) {
      await client.query("ROLLBACK");
      console.error("Delete failed:", err);
      res.status(500).json({ error: err.message });
    } finally {
      client.release();
    }
  });

  app.delete("/delete-show", isAuthenticated, async (req, res) => {
    const { show_name, show_date, folder } = req.query;
    if (!show_name || !show_date || !folder) {
      return res
        .status(400)
        .json({ error: "Missing show_name, show_date, or folder." });
    }
  
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
  
      // 1) delete all script rows for this show
      await client.query(
        `DELETE FROM scripts_t5
           WHERE show_name = $1
             AND show_date  = $2`,
        [show_name, show_date]
      );
  
      // 2) delete the rundown row itself
      const result = await client.query(
        `DELETE FROM rundown_t5
           WHERE show_name = $1
             AND show_date  = $2
             AND folder     = $3`,
        [show_name, show_date, folder]
      );
      if (result.rowCount === 0) {
        throw new Error("Show not found");
      }
  
      await client.query("COMMIT");
      console.log(
        `🗑️ Deleted show "${show_name}" on ${show_date} in folder "${folder}"`
      );
      res.json({ message: "Show deleted." });
    } catch (err) {
      await client.query("ROLLBACK");
      console.error("Delete failed:", err);
      res.status(500).json({ error: err.message });
    } finally {
      client.release();
    }
  });

  app.delete("/delete-folder/:folder", isAuthenticated, async (req, res) => {
    const { folder } = req.params;
    if (!folder) {
      return res.status(400).json({ error: "Folder parameter is required." });
    }
  
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
  
      // 1) delete all scripts for shows in this folder
      await client.query(
        `DELETE FROM scripts_t5
           WHERE (show_name, show_date) IN (
             SELECT show_name, show_date
               FROM rundown_t5
              WHERE folder = $1
           )`,
        [folder]
      );
  
      // 2) delete all rundown rows in the folder
      await client.query(
        `DELETE FROM rundown_t5
           WHERE folder = $1`,
        [folder]
      );
  
      // 3) delete the folder_topics row
      const result = await client.query(
        `DELETE FROM folder_topics_t5
           WHERE folder = $1`,
        [folder]
      );
      if (result.rowCount === 0) {
        throw new Error(`Folder "${folder}" not found.`);
      }
  
      await client.query("COMMIT");
      console.log(`🗑️ Deleted folder "${folder}" and all its content.`);
      res.status(200).json({ message: "Folder and its shows deleted." });
    } catch (err) {
      await client.query("ROLLBACK");
      console.error("Error deleting folder:", err);
      res.status(500).json({ error: err.message });
    } finally {
      client.release();
    }
  });


  // Save a rundown as a template
  app.post("/save-rundown-as-template", isAuthenticated, async (req, res) => {
    const { temp_name, originalData } = req.body;

    const check_query = `
        SELECT 1 
        FROM  template_t5
        WHERE template_version = $1
        LIMIT 1
    `;

    try {
        const result = await pool.query(check_query, [temp_name]);

        if(result.rowCount > 0)
        {
            return res.status(400).json({ error: `Template version "${temp_name}" already exist.` });
        }

        const insert_query = `
            INSERT INTO template_t5 (template_version, needed_columns)
            VALUES ($1, $2) 
    `;

    const insert = await pool.query(insert_query, [temp_name, originalData]);

        res.status(200).json({ message: "Template is successfully added." });
    } catch (err) {
        console.error("Error inserting template:", err.message);
        res.status(500).send("Failed to insert template.");
    }

});

// Regenerate item numbers
app.post("/regenerate-item-number", isAuthenticated, async (req, res) => {
    const { show_name, show_date } = req.body;

  if (!show_name || !show_date) {
    return res.status(400).json({ error: "show_name and show_date are required." });
  }

  try {
    const select_curr_order = `select block, item_num, row_num from scripts_t5 where show_name = $1 and show_date = $2 order by row_num asc;`
    let curr_order = await pool.query(select_curr_order, [show_name, show_date]);

    if(curr_order.rowCount = 0)
        {res.status(200).json({ message: "No rows!" });}
    
    curr_order = curr_order.rows;
    let curr_Block = 'A';
    let curr_item_num = curr_order[0].item_num;
    const len_curr_order = curr_order.length;

    // Update first object manually
    curr_order[0].block = curr_Block;
    curr_order[0].item_num = curr_item_num;
    curr_item_num++;

    for (let i = 1; i < len_curr_order; i++) {
        if(curr_order[i].item_num === 0)
        {
            curr_item_num = 0;
            curr_Block = String.fromCharCode(curr_Block.charCodeAt(0) + 1)
        }

        curr_order[i].block = curr_Block;
        curr_order[i].item_num = curr_item_num
        curr_item_num++;
      }

    // Batch update
    let caseBlock = '';
    let caseItemNum = '';
    let rowNums = [];

    for (let item of curr_order) {
    caseBlock += `WHEN ${item.row_num} THEN '${item.block}' `;
    caseItemNum += `WHEN ${item.row_num} THEN ${item.item_num} `;
    rowNums.push(item.row_num);
    }

    const updateQuery = `
    UPDATE scripts_t5
    SET 
        block = CASE row_num ${caseBlock} END,
        item_num = CASE row_num ${caseItemNum} END
    WHERE row_num IN (${rowNums.join(',')})
        AND show_name = $1
        AND show_date = $2;
    `;

    await pool.query(updateQuery, [show_name, show_date]);

    const updateRowNumQuery = `
    WITH ordered AS (
        SELECT row_num, ROW_NUMBER() OVER (ORDER BY row_num) AS new_row_num
        FROM scripts_t5
        WHERE show_name = $1 AND show_date = $2
    )
    UPDATE scripts_t5
    SET row_num = ordered.new_row_num
    FROM ordered
    WHERE scripts_t5.row_num = ordered.row_num
        AND show_name = $1 AND show_date = $2;
    `;

    await pool.query(updateRowNumQuery, [show_name, show_date]);

    
    res.status(200).json({ message: "Blocks and item numbers reset successfully." });
  } catch (err) {
    console.error("❌ Error calling reset_blocks:", err.message);
    res.status(500).json({ error: "Failed to reset blocks." });
  }

});

  

/**************************************************************************/

//catch invalid routs
app.use((req, res) => {
    res.redirect("/");
});
//Local hosting on port 3000. 
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`)});


