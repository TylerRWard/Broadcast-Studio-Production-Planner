
const exportButton = document.getElementById('exportButton');
const exportBox = document.getElementById('exportBox');
const exportTableButton = document.getElementById('export-table-row');
const exportScriptsButton = document.getElementById('export-scripts-row');


// When you click the "Export" button, show or hide the dropdown menu
exportButton.addEventListener('click', () => {
    const rect = exportButton.getBoundingClientRect();
    exportBox.style.display = exportBox.style.display === 'block' ? 'none' : 'block';
    exportBox.style.top = `${rect.bottom + window.scrollY + 5}px`;
    exportBox.style.left = `${rect.left + window.scrollX}px`;
});

// If you click outside the export menu, hide it
document.addEventListener('click', (e) => {
    if (
        !exportBox.contains(e.target) && e.target !== exportButton
    ) {
        exportBox.style.display = 'none';
    }
});
// When you click "Export Rundown Table", start the process
exportTableButton.addEventListener('click', async () => {
    if (!selectedRundown.show_name) {
        alert("No Show Selected")
        return
    }
// Get data for this show, then create the PDF if it worked
    const scripts = await fetchScripts(selectedRundown.show_name, selectedRundown.show_date)
    if (scripts) await generateRundownPDF(scripts)
});
// When you click "Export Scripts", start the process
exportScriptsButton.addEventListener('click', async () => {
    if (!selectedRundown.show_name) {
        alert("No Show Selected")
        return
    }
// Get script data and turn it into a script-style PDF
    const scripts = await fetchScripts(selectedRundown.show_name, selectedRundown.show_date)
    if (scripts) await generateScriptsPDF(scripts)
});
// This gets the script data from the backend API
async function fetchScripts(show_name, show_date) {
    try {
        const url = `/get-scripts-data/${show_name}/${show_date}`
        const response = await fetch(url, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
            },
        });

        return await response.json();
    } catch (error) {
        console.error("Error fetching scripts:", error);
    }
}
// This makes a clean, simple PDF that shows each speaking line
async function generateScriptsPDF(scripts) {
    try {
        const show_name = selectedRundown.show_name;
        const safeShowName = show_name.replace(/[\\/:*?"<>|]/g, '_');// Clean up filename

        const doc = new PDFDocument({ margin: 50 });// Start a new PDF

        
        // Pipe the PDF data into a blobStream — this lets us treat the PDF like a downloadable file in the browser
        const stream = doc.pipe(blobStream());// Set it up for download
        // doc.pipe(fs.createWriteStream(`${safeShowName}_Script.pdf`));

        const currentDate = new Date();
        const formattedDate = currentDate.toLocaleString();

        // Header: Show name and date
        doc.fontSize(10).text(`Show: ${show_name}`, 50, 30, { align: 'left' });
        doc.fontSize(10).text(formattedDate, { align: 'right' });

        doc.moveDown(2);

        doc.fontSize(20).text('Script File', { align: 'center' });
        doc.moveDown(1);

  // Loop through each line in the script and add it to the PDF
        scripts.forEach((row, index) => {
            const scriptLine = row.speaking_line || '[Empty Line]';
            doc.fontSize(12)
                .text(`${row.block} ${row.item_num} . ${scriptLine}`, {
                    align: 'left',
                    indent: 20
                });
            doc.moveDown(0.3);
        });

        doc.end();
 // Once it's done, trigger the download
        stream.on('finish', function () {
            const blob = stream.toBlob('application/pdf');// Turn the finished PDF stream into a Blob (basically a file object)
            const url = URL.createObjectURL(blob);// Create a temporary URL to let the browser download the blob
            const a = document.createElement('a');
            a.href = url;
            a.download = `${safeShowName}_Script.pdf`;
            a.click();
            URL.revokeObjectURL(url);// Clean up the temporary URL
        });
        console.log("PDF generated!");
    } catch (err) {
        console.error("Error generating PDF:", err);
    }
}
// This one makes a table-style PDF with all the rundown info
async function generateRundownPDF(scripts) {
    try {
        const show_name = selectedRundown.show_name;
        const show_date = selectedRundown.show_date;

        const safeShowName = show_name.replace(/[\\/:*?"<>|]/g, '_');
        const doc = new PDFDocument({ margin: 40, size: 'A4', layout: 'landscape' });

        // Create blobStream to simulate node filestream
        const stream = doc.pipe(blobStream());
        
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

     // Add each row of data
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
     // Download the finished file
        stream.on('finish', function () {
            const blob = stream.toBlob('application/pdf');// Convert the stream into a Blob object so it can be treated like a file
            const url = URL.createObjectURL(blob); // Make a temporary link to the file so we can download it
            const a = document.createElement('a');
            a.href = url;
            a.download = `${safeShowName}_Table_Rundown.pdf`;
            a.click();
            URL.revokeObjectURL(url);
        });
        console.log("PDF rundown table generated!");
    } catch (err) {
        console.error("Error generating PDF:", err);
    }
}
