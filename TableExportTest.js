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

const show_info_query = `
    SELECT show_name, show_date 
    FROM rundown_t5 
    WHERE active = true 
    LIMIT 1
`;

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

async function getRundownData() {
    try {
        const showInfo = await pool.query(show_info_query);
        const showRow = showInfo.rows[0];

        if (!showRow) throw new Error("No active rundown found.");

        const { show_name, show_date } = showRow;

        const scriptData = await pool.query(scripts_query, [show_name, show_date]);

        return { scripts: scriptData.rows, show_name, show_date };
    } catch (err) {
        console.error("Error fetching rundown:", err);
    } finally {
        await pool.end();
    }
}

async function generateRundownPDF() {
    try {
        const { scripts, show_name, show_date } = await getRundownData();

        const safeShowName = show_name.replace(/[\\/:*?"<>|]/g, '_');
        const doc = new PDFDocument({ margin: 40, size: 'A4', layout: 'landscape' });

        doc.pipe(fs.createWriteStream(`${safeShowName}_Table_Rundown.pdf`));

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

        y += 15;
        doc.moveTo(startX, y).lineTo(startX + columnWidths.reduce((a, b) => a + b), y).stroke();

        // Draw rows
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
}

generateRundownPDF();
