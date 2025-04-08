//let infoOfScripts = [];

let active = true; ///////////////////// need to heck if the user in active or archive

async function addScript() {
    const show_name = document.querySelector('.js-script-name').value; 
    const show_date = document.querySelector('.js-show-date').value;
    const folder = document.querySelector('.js-folder-name'). value;
    const template_version = selectedTemplate;

    if (show_name==="" || show_date==="")
        alert("You have missing data.");
    else{
        const data = {show_name, show_date, folder, active, template_version};
        document.querySelector('.js-script-name').value = '';
        document.querySelector('.js-show-date').value = '';
        //drawActualTable(templateVersion, scriptName, showDate);
        //infoOfScripts.push(infoOfScript); 
        
        try{
            const response = await fetch("http://localhost:3000/add-rundown", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(data),
            });

            if (response.ok) {
                alert("Data inserted successfully!");
                getTemplates();
            } else {
                alert("Failed to insert data.", forMessage);
            }
        } catch (error) {
            console.error("Error:", error);
            alert("Error connecting to the server.");
        }
    }

    
}

/////// if someone clicks a file name, it should open its rundown

///// for now, let's assume file they click 

let selectedRundown = {
    show_name: 'Sports - Baseball',
    show_date: '2025-04-06',
    needed_columns: []
}

/////// Get the relevant columns for selectedRundown

async function getColumnNamesForShow(show_name, show_date) {
    try {
        const response = await fetch(`http://localhost:3000/get-column-names/${show_name}/${show_date}`);
        if (!response.ok) throw new Error("Failed to fetch data.");
        
        const data = await response.json();
        console.log("Column Names:", data);
        selectedRundown.needed_columns = data.rows[0].needed_columns.replace(/[{}"]/g, '').split(',');
        console.log(selectedRundown.needed_columns);
        drawActualTable(selectedRundown.needed_columns, selectedRundown.show_name, selectedRundown.show_date)
    } catch (error) {
        console.error("Fetch error:", error);
        alert("Error fetching data.");
    }
}

getColumnNamesForShow(selectedRundown.show_name, selectedRundown.show_date);





//// Draw a script with row IDs

function drawActualTable(columnNames, scriptName, showDate){
    document.querySelector('.js-create').innerHTML = `${scriptName} Rundown - ${showDate}`;

    let headHTML=``;
    let dataHTML=``;

    

    columnNames.forEach(function (column) {
        const rowHTML = `<th class="table-head-css ${column}">${column}</th>`
        headHTML += rowHTML;
    })

    
    for (let i = 0; i <50; i++)
        {
            let datarow =``;
            columnNames.forEach(function (column) {
                const datarowHTML = `<td data-column=${column} class="table-data-css ${column}">${createARowInput(column)}</td>`
                datarow += datarowHTML;
            })
            dataHTML += `<tr draggable="true" ondragstart="drag(event)" ondragover="allowDrop(event)" ondrop="drop(event)" >${datarow}</tr>`;
        }

    dataHTML = `<tbody id="data-table-actual">${dataHTML}</tbody>`;
    let headRowHTML = `<thead><tr class="head-row-css">${headHTML}</tr></thead>`;
    document.querySelector('#data-table').innerHTML = headRowHTML + dataHTML;
}

/////////////////Drag & Drop

let draggedRow = null;

function drag(event) {
    draggedRow = event.target.closest("tr"); // Get the dragged row
    console.log(draggedRow)
}

function allowDrop(event) {
    event.preventDefault(); // Necessary to allow dropping
}

function drop(event) {
    event.preventDefault();
    let targetRow = event.target.closest("tr"); // Get the dropped row

    if (draggedRow && targetRow && draggedRow !== targetRow) {
        let tableBody = document.querySelector("#data-table-actual"); // Explicitly get tbody

        console.log("Dragged row parent:", draggedRow.parentNode);
        console.log("Target row parent:", targetRow.parentNode);
        console.log("Table tbody:", tableBody);

        if (draggedRow.parentNode !== tableBody || targetRow.parentNode !== tableBody) {
            console.error("Dragged row and target row belong to different parents!");
            return; // Prevent incorrect row movement
        }

        // Move row within tbody
        let rows = Array.from(tableBody.children);
        let draggedIndex = rows.indexOf(draggedRow);
        console.log("draggedIndex: ",draggedIndex);
        let targetIndex = rows.indexOf(targetRow);
        console.log("targetIndex: ", targetIndex);

        if (draggedIndex > targetIndex) {
            tableBody.insertBefore(draggedRow, targetRow);
        } else {
            tableBody.insertBefore(draggedRow, targetRow.nextSibling);
        }

        console.log("Row moved successfully!");
    }
}



const tableActual = document.getElementById('data-table');

// Handle clicks on table (excluding selects)
tableActual.addEventListener('click', function(event) {
    if (event.target.tagName === 'SELECT') return;

    const target = event.target.closest('td');
    if (!target) return;

    const columnName = target.dataset.column;
    const row = target.closest('tr');
    const rowIndex = Array.from(tableActual.rows).indexOf(row);

    console.log(`Clicked column: ${columnName}, row: ${rowIndex}`);
});

// Handle dropdown changes using event delegation
tableActual.addEventListener('change', function(event) {
    if (event.target.matches('.okDropdown')) {
        const row = event.target.closest('tr');
        const rowIndex = Array.from(tableActual.rows).indexOf(row);
        console.log(`Selected "${event.target.value}" from "OK" in row ${rowIndex}`);
    }

    if (event.target.matches('.shotDropdown')) {
        const row = event.target.closest('tr');
        const rowIndex = Array.from(tableActual.rows).indexOf(row);
        console.log(`Selected "${event.target.value}" from "SHOT" in row ${rowIndex}`);
    }
});


// Track the currently focused row
let focusedRow = null;

// Listen for focus events in the table
tableActual.addEventListener('focusin', function(event) {
    const row = event.target.closest('tr');

    if (row && row.parentNode.tagName === 'TBODY') {
        focusedRow = row;

        // Get row index (relative to the table, excluding the header)
        const rowIndex = Array.from(tableActual.rows).indexOf(row);
        console.log(`Focused on row: ${rowIndex}`);
    }
});


// Listen for Insert key to duplicate row
document.addEventListener('keydown', function(event) {
    if (event.key === 'Enter' && focusedRow) {
        const newRow = focusedRow.cloneNode(true);

        // Clear inputs/selects in the new row
        Array.from(newRow.cells).forEach(cell => {
            const input = cell.querySelector('input, select');
            if (input) {
                if (input.tagName === 'SELECT') {
                    input.selectedIndex = 0;
                } else {
                    input.value = '';
                }
            }
        });

        focusedRow.parentNode.insertBefore(newRow, focusedRow.nextSibling);
        console.log('New row inserted with Insert key');
    }

    // Delete key logic (Delete = remove row)
    if (event.key === 'Delete' && focusedRow) {
        const rowIndex = Array.from(tableActual.rows).indexOf(focusedRow);
        console.log(`Deleting row with ID: ${rowIndex}`);
        focusedRow.remove();
        focusedRow = null;
    }
});



//////////// Add start row

const addStartRow = document.getElementById('add-start-row');

addStartRow.addEventListener('click', function () {

    if (document.querySelector('.start-row')) return;

    const tbody = tableActual.tBodies[0];
    
    // Insert a new row at the top of tbody
    const startRow = tbody.insertRow(0);
    startRow.classList.add('start-row');
    //startRow.style.backgroundColor = '#f1f1f1';

    let numOfColumns = templates_object[selectedTemplate].length;
    console.log(selectedTemplate, numOfColumns)

    let innerStart = `
    <td data-column="BLOCK" class="table-data-css BLOCK" style="color:black; background-color: #f9f9f9;">${createARowInput("BLOCK")}</td>
    <td data-column="ITEM_NUM" class="table-data-css ITEM_NUM" style="color:black; background-color: #f9f9f9;">${createARowInput("ITEM_NUM")}</td>
`
    document.querySelector('.start-row').innerHTML +=  innerStart;

    const mergedCell = startRow.insertCell();
    mergedCell.colSpan = numOfColumns - 4; // This cell will span across 2 columns
    mergedCell.textContent = 'START';
    mergedCell.style.backgroundColor = '#f9f9f9';
    mergedCell.style.textAlign = 'center';
    mergedCell.style.fontWeight = 'bold';

    innerStart = `
    <td data-column="MODIFIED" class="table-data-css MODIFIED" style="color:black; background-color: #f9f9f9;">${createARowInput("MODIFIED")}</td>
    <td data-column="MOD_BY" class="table-data-css MOD_BY" style="color:black; background-color: #f9f9f9;">${createARowInput("MOD_BY")}</td>

    `
    document.querySelector('.start-row').innerHTML += innerStart;
    

    console.log(document.querySelector('.start-row').innerHTML)
})


const addBreakRowButton = document.getElementById('add-break-row');

 // Add Break Row Button (insert after the selected row)
 addBreakRowButton.addEventListener('click', function () {
    if (!focusedRow) {
      console.warn("Please select a row to insert the break row after.");
      return;
    }

    const breakRow = tableActual.insertRow(focusedRow.rowIndex + 1);  // Insert after the selected row
    let breakBlock = focusedRow.rowIndex + 1;
    breakRow.classList.add(`break-row${breakBlock}`);

    document.querySelector(`.break-row${breakBlock}`).innerHTML= ``;
    //breakRow.style.backgroundColor = '#f9f9f9'; // Style for distinction

    let numOfColumns = templates_object[selectedTemplate].length;
    console.log(selectedTemplate, numOfColumns)

    let innerBreak = `
    <td data-column="BLOCK" class="table-data-css BLOCK" style="color:black; background-color: #f9f9f9;">${createARowInput("BLOCK")}</td>
    <td data-column="ITEM_NUM" class="table-data-css ITEM_NUM" style="color:black; background-color: #f9f9f9;">${createARowInput("ITEM_NUM")}</td>
`
    document.querySelector(`.break-row${breakBlock}`).innerHTML +=  innerBreak;

    const mergedCell = breakRow.insertCell();
    mergedCell.colSpan = numOfColumns - 4; // This cell will span across 2 columns
    mergedCell.textContent = 'BREAK';
    mergedCell.style.backgroundColor = '#f9f9f9';
    mergedCell.style.textAlign = 'center';
    mergedCell.style.fontWeight = 'bold';

    innerBreak = `
    <td data-column="MODIFIED" class="table-data-css MODIFIED" style="color:black; background-color: #f9f9f9;">${createARowInput("MODIFIED")}</td>
    <td data-column="MOD_BY" class="table-data-css MOD_BY" style="color:black; background-color: #f9f9f9;">${createARowInput("MOD_BY")}</td>

    `
    document.querySelector(`.break-row${breakBlock}`).innerHTML += innerBreak;

    console.log('Break row inserted after the selected row');
  });