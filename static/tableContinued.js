////// Selected rundown details from the rundown list
selectedRundown = {
    show_name: '',
    show_date: '',
    needed_columns: []
}


//let active = true; ///////////////////// need to check if the user in active or archive


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

    dataHTML = `<tbody id="data-table-tbody">${dataHTML}</tbody>`;
    let headRowHTML = `<thead><tr class="head-row-css">${headHTML}</tr></thead>`;
    document.querySelector('#data-table').innerHTML = headRowHTML + dataHTML;

    getScriptsData(selectedRundown.show_name, selectedRundown.show_date);
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
        let tableBody = document.querySelector("#data-table-tbody"); // Explicitly get tbody

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




let selectedScriptRow = {
    row_number: null,         //it starts from 1, sice this is declaration I give it null
    block: null,
    item_num: null,
    words: ''
}


let previousTypedData = {
    row_number: null,
    block: null,
    item_num: null,
    column_name: null,
    data: null
}

const tableActual = document.getElementById('data-table');

// Handle clicks on table (excluding selects)
tableActual.addEventListener('click', function(event) {
    // if there is no data in previousTypedData do not do this function (do not insert into database)
    if(previousTypedData.block!= null && previousTypedData.item_num != null && previousTypedData.data != null)
        {
            console.log("Going to update", previousTypedData.data)
            updateData(previousTypedData, selectedRundown);  
        }
    else if (previousTypedData.block!= null && previousTypedData.item_num !=null)
        {
            console.log("Going to insert new row into scripts_t5");
            insertRowScripts_t();
        }

    previousTypedData = {
        row_number: null,
        block: null,
        item_num: null,
        column_name: null,
        data: null
    }

    if (event.target.tagName === 'SELECT') return;

    const target = event.target.closest('td');
    if (!target) return;

    const columnName = target.dataset.column;
    const row = target.closest('tr');
    const rowIndex = Array.from(tableActual.rows).indexOf(row);

    const blockOfClicked = row.querySelector('[data-column="BLOCK"] input')?.value ?? null;
    const item_numOfClicked = row.querySelector('[data-column="ITEM_NUM"] input')?.value ?? null;
    

    console.log(`${blockOfClicked}-${item_numOfClicked} Clicked column: ${columnName}, row: ${rowIndex}, rundown name: ${selectedRundown.show_name}, rundown date: ${selectedRundown.show_date}`);
    
   
});

//if the user use tab once they go to next tab, save previous data 
tableActual.addEventListener('keydown', function(event) {
    // if there is no data in previousTypedData do not do this function (do not insert into database)
        if(event.key === 'Tab'){
            if (event.target.tagName === 'SELECT') return;

            const target = event.target.closest('td');
            if (!target) return;

            

            console.log(`tab clicked ${previousTypedData.block}-${previousTypedData.item_num} Clicked column: ${previousTypedData.column_name}, data: ${previousTypedData.data}, row: ${previousTypedData.row_number}, rundown name: ${selectedRundown.show_name}, rundown date: ${selectedRundown.show_date}`);

            if(previousTypedData.block!= null && previousTypedData.item_num != null && previousTypedData.data != null)
            {
                console.log("Going to update", previousTypedData.data)
                updateData(previousTypedData, selectedRundown);  
            }
            else if (previousTypedData.block!= null && previousTypedData.item_num !=null)
            {
                console.log("Going to insert new row into scripts_t5");
                insertRowScripts_t();
            }


            previousTypedData = {
                row_number: null,
                block: null,
                item_num: null,
                column_name: null,
                data: null
            }
       }
   
});


// Listenning where the user typing data in the table.
tableActual.addEventListener('input', function(event) {
    const input = event.target;
    if (input.tagName !== 'INPUT') return;

    const cell = input.closest('td');
    const row = input.closest('tr');
    const columnName = cell?.dataset.column;
    const rowIndex = Array.from(tableActual.rows).indexOf(row);

    console.log(`Typing in input - column: ${columnName}, row: ${rowIndex}, value: ${input.value}`);

    let blockDetail = row.querySelector('[data-column="BLOCK"] input').value;
    let item_numDetail = row.querySelector('[data-column="ITEM_NUM"] input').value;
    console.log(blockDetail,"  ", item_numDetail)

    
    if(columnName === "BLOCK" && !item_numDetail)
    {
        previousTypedData.row_number = rowIndex;
        previousTypedData.block = input.value;
        previousTypedData.item_num = null;
        previousTypedData.column_name = columnName;
        previousTypedData.data = null;
    }
    else if(columnName === "BLOCK" && item_numDetail)
    {
        selectedScriptRow.block = input.value;
        selectedScriptRow.item_num = item_numDetail;
        selectedScriptRow.row_number = rowIndex;

        previousTypedData.row_number = rowIndex;
        previousTypedData.block = input.value;
        previousTypedData.item_num = item_numDetail;
        previousTypedData.column_name = columnName;
        previousTypedData.data = null;
    }
    else if(!blockDetail)
    {
        alert("Your data will not be saved without having BLOCK first and ITEM_NUM second!");
        input.value = "";
    }
    else if (blockDetail && columnName === "ITEM_NUM")
    {
        selectedScriptRow.block = blockDetail;
        selectedScriptRow.item_num = input.value;
        selectedScriptRow.row_number = rowIndex;

        previousTypedData.row_number = rowIndex;
        previousTypedData.block = blockDetail;
        previousTypedData.item_num = input.value;
        previousTypedData.column_name = columnName;
        previousTypedData.data = null;
    }
    else if (!item_numDetail && columnName !== "BLOCK")
    {
        alert("Your data will not be saved without having ITEM_NUM!");
        input.value = "";
    }
    else
    {
        previousTypedData.row_number = rowIndex;
        previousTypedData.block = blockDetail;
        previousTypedData.item_num = item_numDetail;
        previousTypedData.column_name = columnName;
        previousTypedData.data = input.value;
    }
    
});


// Handle dropdown changes using event delegation
tableActual.addEventListener('change', function(event) {

    let columnName;
    let rowIndex;
    let row;
    if (event.target.matches('.okDropdown')) {
        columnName = "OK";
        row = event.target.closest('tr');
        rowIndex = Array.from(tableActual.rows).indexOf(row);
        console.log(`Selected "${event.target.value}" from "OK" in row ${rowIndex}`);

        previousTypedData.row_number = rowIndex;
        previousTypedData.block = row.querySelector('[data-column="BLOCK"] input')?.value ?? null;
        previousTypedData.item_num = row.querySelector('[data-column="ITEM_NUM"] input')?.value ?? null;
        previousTypedData.column_name = columnName;
        previousTypedData.data = event.target.value;

        if(previousTypedData.block!= "" && previousTypedData.item_num !="" && previousTypedData.data != null)
            {
                updateData(previousTypedData, selectedRundown);  
            }
        else
        {
            alert("Your data will not be saved without having BLOCK and ITEM_NUM first!");
            event.target.selectedIndex = 0;
        }
        
            previousTypedData = {
                row_number: null,
                block: null,
                item_num: null,
                column_name: null,
                data: null
            }
    }

    if (event.target.matches('.shotDropdown')) {
        columnName = "SHOT";
        row = event.target.closest('tr');
        rowIndex = Array.from(tableActual.rows).indexOf(row);
        console.log(`Selected "${event.target.value}" from "SHOT" in row ${rowIndex}`);

        previousTypedData.row_number = rowIndex;
        previousTypedData.block = row.querySelector('[data-column="BLOCK"] input')?.value ?? null;
        previousTypedData.item_num = row.querySelector('[data-column="ITEM_NUM"] input')?.value ?? null;
        previousTypedData.column_name = columnName;
        previousTypedData.data = event.target.value;

        if(previousTypedData.block!= "" && previousTypedData.item_num !="" && previousTypedData.data != null)
            {
                updateData(previousTypedData, selectedRundown);  
            }
            else
        {
            alert("Your data will not be saved without having BLOCK and ITEM_NUM first!");
            event.target.selectedIndex = 0;
        }
        
            previousTypedData = {
                row_number: null,
                block: null,
                item_num: null,
                column_name: null,
                data: null
            }
    }

    

    //console.log(previousTypedData.block, previousTypedData.column_name, previousTypedData.data )
    //// have to update database here too.
});


async function updateData(previousTypedData, selectedRundown) {
    const data = {
        show_name: selectedRundown.show_name,
        show_date: selectedRundown.show_date,
        row_number: previousTypedData.row_number,
        block: previousTypedData.block,
        item_num: previousTypedData.item_num,
        column_name: previousTypedData.column_name.toLowerCase(),
        data: previousTypedData.data
    }

    console.log(JSON.stringify(data));

    try {
        const response = await fetch("http://localhost:3000/update-data-in-rundown", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(data),
        });

        if (response.ok) {
            //alert("Data inserted successfully!");
            showUpdateData(previousTypedData, selectedRundown);
            
        } else {
            alert("Failed to insert data.", forMessage);
        }
    } catch (error) {
        console.error("Error:", error);
        alert("Error connecting to the server.");
    }
    
}

async function showUpdateData(previousTypedData, selectedRundown) {
    const data = {
        show_name: selectedRundown.show_name,
        show_date: selectedRundown.show_date,
        row_number: previousTypedData.row_number,
        column_name: previousTypedData.column_name.toLowerCase()
    }

    console.log(JSON.stringify(data));

    try {
        const response = await fetch("http://localhost:3000/show-just-update-data", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(data),
        });

        if (response.ok) {
            const responsedData = await response.json();
            console.log("Just Updated Data:", responsedData);

            let column = Object.keys(responsedData[0])[0].toUpperCase();
            console.log(responsedData[0].row_num, responsedData[0].modified, column)

            if ((column === "SHOT") ||(column === "OK"))
            {
                tableActual.rows[responsedData[0].row_num].querySelector(`[data-column=${column}] select`).value = responsedData[0][column.toLowerCase()];
                console.log(tableActual.rows[responsedData[0].row_num].querySelector(`[data-column=${column}] select`).value, responsedData[0][column.toLowerCase()]);
            }
            else
            {
                tableActual.rows[responsedData[0].row_num].querySelector(`[data-column=${column}] input`).value = responsedData[0][column.toLowerCase()];
                console.log(tableActual.rows[responsedData[0].row_num].querySelector(`[data-column=${column}] input`).value, responsedData[0][column.toLowerCase()]);
            }

            const date = new Date(responsedData[0].modified);

            const centralTimeString = new Date(date).toLocaleString('en-US', {timeZone: 'America/Chicago', hour12: false}).replace(',', '');

            tableActual.rows[responsedData[0].row_num].querySelector(`[data-column="MODIFIED"] input`).value = centralTimeString;


            //alert("Update just inserted data successfully!");
            
        } else {
            alert("Failed to insert data.", forMessage);
        }
    } catch (error) {
        console.error("Error:", error);
        alert("Error connecting to the server.");
    }

}





//create a row in slots_t2 {item_num, block, show_date, show_name}
async function insertRowScripts_t() {
    const data = {
        item_num: selectedScriptRow.item_num,
        block: selectedScriptRow.block,
        show_date: selectedRundown.show_date,
        show_name: selectedRundown.show_name,
        row_num: selectedScriptRow.row_number
    };

    console.log(JSON.stringify(data));

    try {
        const response = await fetch("http://localhost:3000/add-row-scripts_t5", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(data),
        });

        if (response.ok) {
            // Success: Do nothing or refresh UI if needed
        } else if (response.status === 400) {
            const message = await response.text();
            alert(message); // Shows "Duplicate: this block and item_num already exist for this show."
            tableActual.rows[data.row_num].querySelector('[data-column="BLOCK"] input').value = "";
            tableActual.rows[data.row_num].querySelector('[data-column="ITEM_NUM"] input').value = "";
        } else {
            alert("Failed to insert data.");
        }
    } catch (error) {
        console.error("Error:", error);
        alert("Error connecting to the server.");
    }
}


///get the all inserted data
async function getScriptsData(show_name, show_date) {
    try {
        const response = await fetch(`http://localhost:3000/get-scripts-data/${show_name}/${show_date}`);
        if (!response.ok) 
            {throw new Error("Failed to fetch data.");}
        
        const data = await response.json();
        console.log("Scripts Data:", data);
        showScriptsData(data)
    } catch (error) {
        console.error("Fetch error:", error);
        alert(`No data in ${show_name} - ${show_date} `);
    }
}

function showScriptsData(data) {
    
    let numOfRows = data.length;
    for(let i=0; i<numOfRows;i++)
    {
        console.log(data[i].row_num)

        if(data[i].item_num === 0)
        {
            console.log("start or break");
        }
        else
        {
            ///// get the column names and show the data for only that columns.
            selectedRundown.needed_columns.forEach(function (column) {
            
                if (column ==="MODIFIED")
                {
                    const date = new Date(data[i].modified);
                    const centralTimeString = new Date(date).toLocaleString('en-US', {timeZone: 'America/Chicago', hour12: false}).replace(',', '');
                    tableActual.rows[(data[i].row_num)].querySelector(`[data-column=${column}] input`).value = centralTimeString;
                }
                else if ((column === "SHOT") ||(column === "OK"))
                {
                    //tableActual.rows[(data[i].row_num)].querySelector(`[data-column=${column}] select`).value = data[i][column.toLowerCase()];
                    const selectElem = tableActual.rows[data[i].row_num].querySelector(`[data-column=${column}] select`);
                    selectElem.value = data[i][column.toLowerCase()] ?? ''; // fallback to '' (usually the placeholder)

                }
                else
                {
                    tableActual.rows[(data[i].row_num)].querySelector(`[data-column=${column}] input`).value = data[i][column.toLowerCase()];
                }
            })
    }
        
    }
}




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

//Track if user click outside of the table
document.addEventListener('click', (e) => {
    if (
      !tableActual.contains(e.target) 
    ) {
      console.log('You cicked outside of the table')

      if(previousTypedData.block!= "" && previousTypedData.item_num !="" && previousTypedData.data != null)
        {
            updateData(previousTypedData, selectedRundown);  
        }
    
        previousTypedData = {
            row_number: null,
            block: null,
            item_num: null,
            column_name: null,
            data: null
        }

        
    }
  });

// Listen for Insert key to duplicate row
tableActual.addEventListener('keydown', function(event) {
    if (event.key === 'Enter' && focusedRow) {
        const rowIndex = Array.from(tableActual.rows).indexOf(focusedRow);
        shiftRowsDown(rowIndex, selectedRundown);
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
        //// Delete this row ID
        deleteRow(rowIndex, selectedRundown);
        focusedRow.remove();
        focusedRow = null;
    }
});

async function shiftRowsDown(rowIndex, selectedRundown) {
    const data = {
        row_num: rowIndex,
        show_name: selectedRundown.show_name,
        show_date: selectedRundown.show_date
    }

    try {
        const response = await fetch(`http://localhost:3000/shift-rows-down`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data),
        });

        if (!response.ok) throw new Error("Failed to insert an empty row.");

        console.log(`RowID ${rowIndex} inserted successfully!`);
    } catch (error) {
        console.error("Delete error:", error);
        alert("Error inserting a row.");
    }
    
}

async function deleteRow(rowIndex, selectedRundown) {

    const data = {
        row_num: rowIndex,
        show_name: selectedRundown.show_name,
        show_date: selectedRundown.show_date
    }

    try {
        const response = await fetch(`http://localhost:3000/delete-a-row`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data),
        });

        if (!response.ok) throw new Error("Failed to delete a row.");

        console.log(`RowID ${rowIndex} deleted successfully!`);
    } catch (error) {
        console.error("Delete error:", error);
        alert("Error deleting row.");
    }
    
}



//////////// Add start row

const addStartRow = document.getElementById('add-start-row');

addStartRow.addEventListener('click', function () {

    if (document.querySelector('.start-row')) return;

    const tbody = tableActual.tBodies[0];
    
    // Insert a new row at the top of tbody
    const startRow = tbody.insertRow(0);
    startRow.classList.add('start-row');
    //startRow.style.backgroundColor = '#f1f1f1';

    let numOfColumns = selectedRundown.needed_columns.length;
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

    insertStart(selectedRundown);

})

async function insertStart(selectedRundown) {
    const data = {
        show_name: selectedRundown.show_name,
        show_date: selectedRundown.show_date
    }

    try {
        const response = await fetch(`http://localhost:3000/insert-start-row`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data),
        });

        if (!response.ok) throw new Error("Failed to insert START row.");

        console.log(`Start row inserted successfully!`);
    } catch (error) {
        console.error("insert error:", error);
        alert("Error inserting start row.");
    }
}

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

    let numOfColumns = selectedRundown.needed_columns.length;
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