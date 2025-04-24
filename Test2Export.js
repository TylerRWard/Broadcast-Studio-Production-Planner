const { Pool } = require('pg');
const PDFDocument = require('pdfkit');
const fs = require('fs');

const pool = new Pool({
    user: "postgres",
    host: "news-team-db1.cdm082ocayd0.us-east-2.rds.amazonaws.com",
    database: "studio_db",
    password: "stuP455W0RD!",
    port: 5432,
    ssl: { rejectUnauthorized: false }
});

// Query to get show_name and show_date
const show_info_query = "SELECT show_name, show_date FROM rundown_t5 LIMIT 1";

// Query to get scripts for the show ordered by row_num
const select_query = `
    SELECT row_num, speaking_line 
    FROM scripts_t5 
    WHERE show_date = $1 
    AND show_name = $2
    ORDER BY row_num ASC
`;

async function checkData() {
    try {
        const showInfoResult = await pool.query(show_info_query);
        const showRow = showInfoResult.rows[0];

        if (!showRow) {
            throw new Error("No show info found in rundown_t5");
        }

        const { show_name, show_date } = showRow;

        const result = await pool.query(select_query, [show_date, show_name]);

        return { data: result.rows, showName: show_name };
    } catch (err) {
        console.error("Error checking:", err);
    } finally {
        await pool.end(); // Always close pool when done
    }
}

async function generatePDF() {
    try {
        const { data, showName } = await checkData();
        const safeShowName = showName.replace(/[\\/:*?"<>|]/g, '_');

        const doc = new PDFDocument({ margin: 50 });
        doc.pipe(fs.createWriteStream(`${safeShowName}_Script.pdf`));

        const currentDate = new Date();
        const formattedDate = currentDate.toLocaleString();

        // Header: Show name and date
        doc.fontSize(10).text(`Show: ${showName}`, 50, 30, { align: 'left' });
        doc.fontSize(10).text(formattedDate, { align: 'right' });

        doc.moveDown(2);

        doc.fontSize(20).text('Script File', { align: 'center' });
        doc.moveDown(1);

        // Script lines
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
}

generatePDF();
