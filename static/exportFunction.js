
const exportButton = document.getElementById('exportButton');
const exportBox = document.getElementById('exportBox');
const exportTableButton = document.getElementById('export-table-row');
const exportScriptsButton = document.getElementById('export-scripts-row');


exportButton.addEventListener('click', () => {
    const rect = exportButton.getBoundingClientRect();
    exportBox.style.display = exportBox.style.display === 'block' ? 'none' : 'block';
    exportBox.style.top = `${rect.bottom + window.scrollY + 5}px`;
    exportBox.style.left = `${rect.left + window.scrollX}px`;
});

// Close if clicked outside either box
document.addEventListener('click', (e) => {
    if (
        !exportBox.contains(e.target) && e.target !== exportButton
    ) {
        exportBox.style.display = 'none';
    }
});

exportTableButton.addEventListener('click', async () => {
    if (!selectedRundown.show_name) {
        alert("No Show Selected")
        return
    }

    const scripts = await fetchScripts(selectedRundown.show_name, selectedRundown.show_date)
    if (scripts) await generateRundownPDF(scripts)
});

exportScriptsButton.addEventListener('click', async () => {
    if (!selectedRundown.show_name) {
        alert("No Show Selected")
        return
    }

    const scripts = await fetchScripts(selectedRundown.show_name, selectedRundown.show_date)
    if (scripts) await generateScriptsPDF(scripts)
});

async function fetchScripts(show_name, show_date) {
    try {
        const url = `http://localhost:3000/get-scripts-data/${show_name}/${show_date}`
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

async function generateScriptsPDF(scripts) {
    try {
        const show_name = selectedRundown.show_name;
        const safeShowName = show_name.replace(/[\\/:*?"<>|]/g, '_');

        const doc = new PDFDocument({ margin: 50 });

        // Create blobStream to simulate node filestream
        const stream = doc.pipe(blobStream());
        // doc.pipe(fs.createWriteStream(`${safeShowName}_Script.pdf`));

        const currentDate = new Date();
        const formattedDate = currentDate.toLocaleString();

        // Header: Show name and date
        doc.fontSize(10).text(`Show: ${show_name}`, 50, 30, { align: 'left' });
        doc.fontSize(10).text(formattedDate, { align: 'right' });

        doc.moveDown(2);

        doc.fontSize(20).text('Script File', { align: 'center' });
        doc.moveDown(1);

        // Script lines
        scripts.forEach((row, index) => {
            const scriptLine = row.speaking_line || '[Empty Line]';
            doc.fontSize(12)
                .text(`${index + 1}. ${scriptLine}`, {
                    align: 'left',
                    indent: 20
                });
            doc.moveDown(0.3);
        });

        doc.end();

        stream.on('finish', function () {
            const blob = stream.toBlob('application/pdf');
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${safeShowName}_Script.pdf`;
            a.click();
            URL.revokeObjectURL(url);
        });
        console.log("PDF generated!");
    } catch (err) {
        console.error("Error generating PDF:", err);
    }
}

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

        stream.on('finish', function () {
            const blob = stream.toBlob('application/pdf');
            const url = URL.createObjectURL(blob);
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
