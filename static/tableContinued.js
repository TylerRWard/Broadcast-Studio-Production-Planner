/* Places I changed focusedRow to null- focusedRow will listen to the row which is selected by the user/
 Once drag & drop a row
 Once delete a row
 Once insert a start row
 Once insert a break row
 Once select a new rundown 
*/

// Store rundown details for selected rundown from the file directory
selectedRundown = {
    show_name: '',
    show_date: '',
    needed_columns: [],
    template_version: ''
}

// Draw an empty rundown with 100 rows
function drawActualTable(columnNames, scriptName, showDate){

    document.querySelector('.js-create').innerHTML = `${scriptName} Rundown - ${showDate}`;
    let headHTML=``;
    let dataHTML=``;

    columnNames.forEach(function (column) {
        const rowHTML = `<th class="table-head-css ${column}">${column}</th>`
        headHTML += rowHTML;
    })

    for (let i = 0; i < 100; i++)
        {
            let datarow =``;
            columnNames.forEach(function (column) {
                const datarowHTML = `<td data-column=${column} class="table-data-css ${column}">${createARowInput(column)}</td>`
                datarow += datarowHTML;
            })
            dataHTML += `<tr class="rundown-row" draggable="true" ondragstart="drag(event)" ondragover="allowDrop(event)" ondrop="drop(event)" >${datarow}</tr>`;
        }

    dataHTML = `<tbody id="data-table-tbody">${dataHTML}</tbody>`;
    let headRowHTML = `<thead><tr class="head-row-css">${headHTML}</tr></thead>`;
    document.querySelector('#data-table').innerHTML = headRowHTML + dataHTML;

    // Retrieve data from database for selected rundown 
    getScriptsData(selectedRundown.show_name, selectedRundown.show_date);
}


/****************************************Drag and Drop Start********************************************************/
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

        //console.log("Dragged row parent:", draggedRow.parentNode);
        //console.log("Target row parent:", targetRow.parentNode);
        //console.log("Table tbody:", tableBody);

        if (draggedRow.parentNode !== tableBody || targetRow.parentNode !== tableBody) {
            console.error("Dragged row and target row belong to different parents!");
            return; // Prevent incorrect row movement
        }

        // Move row within tbody
        let rows = Array.from(tableBody.children);
        let draggedIndex = rows.indexOf(draggedRow);
        //console.log("draggedIndex: ",draggedIndex);
        let targetIndex = rows.indexOf(targetRow);
        //console.log("targetIndex: ", targetIndex);

        if (draggedIndex > targetIndex) {
            tableBody.insertBefore(draggedRow, targetRow);
        } else {
            tableBody.insertBefore(draggedRow, targetRow.nextSibling);
        }

        // Changing relevant row_num for relevent rows in the database table
        dragAndDropInDB(draggedIndex+1, targetIndex+1);
        //console.log("Row moved successfully!", draggedIndex+1, "  ", targetIndex+1);

        focusedRow = null;
    }
}

// Change relevant row_num for relevent rows in the database table
async function dragAndDropInDB(draggedIndx, targetIndx) {
    const data = {
        show_name: selectedRundown.show_name,
        show_date: selectedRundown.show_date,
        draggedIndx: draggedIndx,
        targetIndx: targetIndx,
        tempID: -1
    }

    try {
        const response = await fetch("http://localhost:3000/update-after-dragNdrop", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(data),
        });

        if (response.ok) {
            alert("Dragged and dropped successfully!");
            focusedRow = null;
            
        } else {
            alert("Failed to drop data.", forMessage);
        }
    } catch (error) {
        console.error("Error:", error);
        alert("Error connecting to the server.");
    }
}

/****************************************Drag and Drop End********************************************************/

// SelectedScriptRow is the row selected by user
let selectedScriptRow = {
    row_number: null,         
    block: null,
    item_num: null
}

// Previous typed data by user
let previousTypedData = {
    row_number: null,
    block: null,
    item_num: null,
    column_name: null,
    data: null
}
let prevSelectedRow = null;

const tableActual = document.getElementById('data-table');

// Handle clicks on table (excluding selects)
tableActual.addEventListener('click', function(event) {
    if (event.target.tagName === 'SELECT') return;

    const target = event.target.closest('td');
    if (!target) return;
    
    // If a row has updated data, do updateDat(), if not, do inserRowScript_t()
    if (previousTypedData.block != null && previousTypedData.item_num != null && previousTypedData.data != null) {
        //console.log("Going to update", previousTypedData.data);
        updateData(previousTypedData, selectedRundown);
    } else if (previousTypedData.block != null && previousTypedData.item_num != null) {
        //console.log("Going to insert new row into scripts_t5");
        insertRowScripts_t();
    }

    // Reset previousTypedData
    previousTypedData = {
        row_number: null,
        block: null,
        item_num: null,
        column_name: null,
        data: null
    };
 
});


//if the user use tab, once they go to next tab, save previous data 
tableActual.addEventListener('keydown', function(event) {
    // if there is no data in previousTypedData do not do this function (do not insert into database)
    if(event.key === 'Tab'){
        if (event.target.tagName === 'SELECT') return;

        const target = event.target.closest('td');
        if (!target) return;

        // If a row has updated data, do updateDat(), if not, do inserRowScript_t()
        if (previousTypedData.block != null && previousTypedData.item_num != null && previousTypedData.data != null) {
            //console.log("Going to update", previousTypedData.data);
            updateData(previousTypedData, selectedRundown);
        } else if (previousTypedData.block != null && previousTypedData.item_num != null) {
            //console.log("Going to insert new row into scripts_t5");
            insertRowScripts_t();
        }

        // Reset previousTypedData
        previousTypedData = {
            row_number: null,
            block: null,
            item_num: null,
            column_name: null,
            data: null
        };
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

// Retrieve speaking_lines for selectedScriptRow from database
async function getSpeakingLines(show_name, show_date, row_num) {
    
    try {
        const response = await fetch(`http://localhost:3000/get-speaking-lines/${show_name}/${show_date}/${row_num}`);

        if (response.ok) {
            const result = await response.json();
            const speaking_lines = result.speaking_line;
            console.log("Speaking line:", result.speaking_line); // <- Here's your actual data

            document.querySelector(".scriptBox").value = ``;
            document.querySelector(".scriptBox").value = speaking_lines;

            // You can use the speaking_line however you want now:
            // e.g. update a div or textarea
            // document.getElementById('someElement').textContent = result.speaking_line;

        } else if (response.status === 404) {
            console.log("No speaking line found for this row.");
        } else {
            alert("Failed to retrieve speaking line.");
        }
    } catch (error) {
        console.error("Error:", error);
        alert("Error connecting to the server.");
    }
}

// Update data in scripts_t5 in the database 
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

            detailsForScriptEditor.row_num = data.row_num;
            detailsForScriptEditor.block = data.block;
            detailsForScriptEditor.item_num = data.item_num;
            
        } else {
            alert("Failed to insert data.", forMessage);
        }
    } catch (error) {
        console.error("Error:", error);
        alert("Error connecting to the server.");
    }
    
}

// Retrieve just updated data from script_t5 table
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
            if (responsedData.length>0)
            {
                let column = Object.keys(responsedData[0])[0].toUpperCase();
                console.log(responsedData[0].row_num, responsedData[0].modified, column)

                if ((column === "SHOT") ||(column === "OK"))
                {
                    tableActual.rows[responsedData[0].row_num].querySelector(`[data-column=${column}] select`).value = responsedData[0][column.toLowerCase()];
                    console.log(tableActual.rows[responsedData[0].row_num].querySelector(`[data-column=${column}] select`).value, responsedData[0][column.toLowerCase()]);
                }
                else if((column === "MOD_BY"))
                {
                    tableActual.rows[responsedData[0].row_num].querySelector(`[data-column=${column}]`).textContent = responsedData[0][column.toLowerCase()];
                }
                else if(column === "READ" || column === "SOT")
                    {
                        tableActual.rows[responsedData[0].row_num].querySelector(`[data-column=${column}]`).textContent = responsedData[0][column.toLowerCase()];
                        tableActual.rows[responsedData[0].row_num].querySelector(`[data-column="TOTAL"]`).textContent = responsedData[0].total;
                    }
                else
                {
                    tableActual.rows[responsedData[0].row_num].querySelector(`[data-column=${column}] input`).value = responsedData[0][column.toLowerCase()];
                   // console.log(tableActual.rows[responsedData[0].row_num].querySelector(`[data-column=${column}] input`).value, responsedData[0][column.toLowerCase()]);
                }

                const date = new Date(responsedData[0].modified);

                const centralTimeString = new Date(date).toLocaleString('en-US', {timeZone: 'America/Chicago', hour12: false}).replace(',', '');

                tableActual.rows[responsedData[0].row_num].querySelector(`[data-column="MODIFIED"]`).textContent = centralTimeString;

            }
            //alert("Update just inserted data successfully!");
            
        } else {
            alert("Failed to insert data.", forMessage);
        }
    } catch (error) {
        console.error("Error:", error);
        alert("Error connecting to the server.");
    }

}


//insert a row in scripts_t5 {item_num, block, show_date, show_name}
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
            const responsedData = await response.json();
            
            const date = new Date(responsedData.modified);
            const centralTimeString = new Date(date).toLocaleString('en-US', {timeZone: 'America/Chicago', hour12: false}).replace(',', '');
           // console.log(centralTimeString);
            tableActual.rows[data.row_num].querySelector(`[data-column="MODIFIED"]`).textContent = centralTimeString;

            const readcell = tableActual.rows[data.row_num].querySelector('[data-column="READ"] input');
            const sotcell = tableActual.rows[data.row_num].querySelector('[data-column="SOT"] input');
            const totalcell = tableActual.rows[data.row_num].querySelector('[data-column="TOTAL"] input');

            if (readcell) { readcell.value = responsedData.read;}
            if (sotcell) {sotcell.value = responsedData.sot;}
            if (totalcell) {totalcell.value = responsedData.total;}

            detailsForScriptEditor.row_num = data.row_num;
            detailsForScriptEditor.block = data.block;
            detailsForScriptEditor.item_num = data.item_num;

        } else if (response.status === 400) {
            const message = await response.text();
            alert(message); // Shows "Duplicate: this block and item_num already exist for this show."
            tableActual.rows[data.row_num].querySelector('[data-column="BLOCK"] input').value = "";
            tableActual.rows[data.row_num].querySelector('[data-column="ITEM_NUM"] input').value = "";

            previousTypedData.row_number = data.row_num;

            const columnsToUpdate = ["BLOCK", "ITEM_NUM"];

            columnsToUpdate.forEach(column => {
                previousTypedData.column_name = column;
                showUpdateData(previousTypedData, selectedRundown);
            });

            //previousTypedData.row_number = null;
            //previousTypedData.column_name = null;


        } else {
            alert("Failed to insert data.");
        }
    } catch (error) {
        console.error("Error:", error);
        alert("Error connecting to the server.");
    }
}



///get all data in Scripts_t5 table
async function getScriptsData(show_name, show_date) {
    console.log(show_name, show_date)
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

///show all data into frontend table
function showScriptsData(data) {
    
    let numOfRows = data.length;
    for(let i=0; i<numOfRows;i++)
    {
        console.log(data[i].row_num)

        if(data[i].item_num === 0)
        {
            console.log("start or break");

            if(data[i].block === "A")
            {
                tableActual.rows[(data[i].row_num)].innerHTML = '';
                drawStart(tableActual.rows[(data[i].row_num)]);

            }
            else{
                tableActual.rows[(data[i].row_num)].innerHTML = '';
                drawBreak(tableActual.rows[(data[i].row_num)], data[i].block);
            }

            const date = new Date(data[i].modified);
            const centralTimeString = new Date(date).toLocaleString('en-US', {timeZone: 'America/Chicago', hour12: false}).replace(',', '');
            tableActual.rows[(data[i].row_num)].querySelector(`[data-column="MODIFIED"]`).textContent = centralTimeString;

            tableActual.rows[(data[i].row_num)].querySelector(`[data-column="BLOCK"] input`).value = data[i].block;
            tableActual.rows[(data[i].row_num)].querySelector(`[data-column="ITEM_NUM"] input`).value = data[i].item_num;
            tableActual.rows[(data[i].row_num)].querySelector(`[data-column="MOD_BY"]`).textContent = data[i].mod_by;

            //tableActual.rows[(data[i].row_num)].querySelector('[data-column="BLOCK"] input').readOnly = true;
            //tableActual.rows[(data[i].row_num)].querySelector('[data-column="ITEM_NUM"] input').readOnly = true;
            
        }
        else
        {
            ///// get the column names and show the data for only that columns.
            selectedRundown.needed_columns.forEach(function (column) {
            
                if (column ==="MODIFIED")
                {
                    const date = new Date(data[i].modified);
                    const centralTimeString = new Date(date).toLocaleString('en-US', {timeZone: 'America/Chicago', hour12: false}).replace(',', '');
                    tableActual.rows[(data[i].row_num)].querySelector(`[data-column=${column}]`).textContent = centralTimeString;
                }
                else if ((column === "SHOT") ||(column === "OK"))
                {
                    //tableActual.rows[(data[i].row_num)].querySelector(`[data-column=${column}] select`).value = data[i][column.toLowerCase()];
                    const selectElem = tableActual.rows[data[i].row_num].querySelector(`[data-column=${column}] select`);
                    selectElem.value = data[i][column.toLowerCase()] ?? ''; // fallback to '' (usually the placeholder)

                }
                else if(column === "MOD_BY")
                    {
                        tableActual.rows[data[i].row_num].querySelector(`[data-column=${column}]`).textContent = data[i][column.toLowerCase()];
                    }
                else
                {
                    tableActual.rows[(data[i].row_num)].querySelector(`[data-column=${column}] input`).value = data[i][column.toLowerCase()];
                }
            })
    }
        
    }
}

tableActual.addEventListener('keydown', function(event) { 
    if ((event.key === 'ArrowUp' || event.key === 'ArrowDown') && document.activeElement.tagName === 'INPUT') {
        event.preventDefault();
    
        const currentInput = document.activeElement;
        const currentCell = currentInput.closest('td');
        const currentRow = currentInput.closest('tr');
    
        if (!currentCell || !currentRow) return;
    
        const colIndex = Array.from(currentRow.cells).indexOf(currentCell);
        const allRows = Array.from(tableActual.querySelectorAll('tbody tr'));
        const currentRowIndex = allRows.indexOf(currentRow);
    
        let targetRowIndex = event.key === 'ArrowDown' 
            ? currentRowIndex + 1 
            : currentRowIndex - 1;
    
        if (targetRowIndex < 0 || targetRowIndex >= allRows.length) return;
    
        const targetRow = allRows[targetRowIndex];
        const targetCell = targetRow.cells[colIndex];
        const targetInput = targetCell.querySelector('input, select');
    
        // If a row has updated data, do updateDat(), if not, do inserRowScript_t()
        if (previousTypedData.block != null && previousTypedData.item_num != null && previousTypedData.data != null) {
            //console.log("Going to update", previousTypedData.data);
            updateData(previousTypedData, selectedRundown);
        } else if (previousTypedData.block != null && previousTypedData.item_num != null) {
            //console.log("Going to insert new row into scripts_t5");
            insertRowScripts_t();
        }

        // Reset previousTypedData
        previousTypedData = {
            row_number: null,
            block: null,
            item_num: null,
            column_name: null,
            data: null
        };
    
        // ✅ Move focus to the same column in the next/prev row
        if (targetInput) {
            targetInput.focus();
        }
    }
});



// Track the currently focused row in the table
tableActual.addEventListener('focusin', function(event) {
    const row = event.target.closest('tr');

    if (row && row.parentNode.tagName === 'TBODY') {
        focusedRow = row;

        // Get column and row index info
        const columnName = event.target.closest('td')?.dataset.column;
        const rowIndex = Array.from(tableActual.rows).indexOf(row);
        const blockOfClicked = row.querySelector('[data-column="BLOCK"] input')?.value ?? null;
        const item_numOfClicked = row.querySelector('[data-column="ITEM_NUM"] input')?.value ?? null;     
        
        if (prevSelectedRow !== row)
            {
                console.log("New row selected.")
                // Store for script editor
                detailsForScriptEditor.row_num = rowIndex;
                detailsForScriptEditor.block = blockOfClicked;
                detailsForScriptEditor.item_num = item_numOfClicked;
                prevSelectedRow = row;
                // Highlight the clicked row
                document.querySelectorAll('.rundown-row').forEach(r => r.classList.remove('selected-row'));
                focusedRow.classList.add('selected-row');
        
                // Check if selected row is in database, if so get the speaking_line and show it in script editing section if not show nothing
                getSpeakingLines(selectedRundown.show_name, selectedRundown.show_date, rowIndex);
        
                    
            }
            console.log("Detailed for script editor: ", detailsForScriptEditor.block, " ", detailsForScriptEditor.item_num)
            console.log(`${blockOfClicked}-${item_numOfClicked} Clicked column: ${columnName}, row: ${rowIndex}, rundown name: ${selectedRundown.show_name}, rundown date: ${selectedRundown.show_date}`);

        // Get row index (relative to the table, excluding the header)
        console.log(`Focused on row: ${rowIndex}`);
    }
});

//Track if user click outside of the table
document.addEventListener('click', (e) => {
    if (
      !tableActual.contains(e.target) 
    ) {
      console.log('You cicked outside of the table')

      // If a row has updated data, do updateDat(), if not, do inserRowScript_t()
      if (previousTypedData.block != null && previousTypedData.item_num != null && previousTypedData.data != null) {
        //console.log("Going to update", previousTypedData.data);
        updateData(previousTypedData, selectedRundown);
    } else if (previousTypedData.block != null && previousTypedData.item_num != null) {
        //console.log("Going to insert new row into scripts_t5");
        insertRowScripts_t();
    }

    // Reset previousTypedData
    previousTypedData = {
        row_number: null,
        block: null,
        item_num: null,
        column_name: null,
        data: null
    };
        
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
            } else {
                // If the cell doesn't contain an input or select, clear its text content
                cell.textContent = '';
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



/**************** Add start row Begin ************************/
const addStartRow = document.getElementById('add-start-row');

addStartRow.addEventListener('click', function () {

    if (document.querySelector('.start-row')) return;

    const tbody = tableActual.tBodies[0];
    
    // Insert a new row at the top of tbody
    const startRow = tbody.insertRow(0);
    startRow.classList.add('rundown-row');
    startRow.setAttribute('draggable', 'true');
    startRow.setAttribute('ondragstart', 'drag(event)');
    startRow.setAttribute('ondragover', 'allowDrop(event)');
    startRow.setAttribute('ondrop', 'drop(event)');

    drawStart(startRow);
    
    tbody.rows[0].querySelector(`[data-column="BLOCK"] input`).value = "A";
    tbody.rows[0].querySelector(`[data-column="ITEM_NUM"] input`).value = 0;

    insertStart(selectedRundown);

})

// Add a start row in the front end table
function drawStart(startRow){
    startRow.classList.add('start-row');

    let numOfColumns = selectedRundown.needed_columns.length;
    console.log(selectedTemplate, numOfColumns);

    let innerStart = `
    <td data-column="BLOCK" class="table-data-css BLOCK" style="color:white; background-color: black;">${createARowInput("BLOCK")}</td>
    <td data-column="ITEM_NUM" class="table-data-css ITEM_NUM" style="color:white; background-color: black;">${createARowInput("ITEM_NUM")}</td>
`
    document.querySelector('.start-row').innerHTML +=  innerStart;

    const mergedCell = startRow.insertCell();
    mergedCell.colSpan = numOfColumns - 4; // This cell will span across 2 columns
    mergedCell.textContent = 'START';
    mergedCell.style.backgroundColor = '#f9f9f9';
    mergedCell.style.textAlign = 'center';
    mergedCell.style.fontWeight = 'bold';

    innerStart = `
    <td data-column="MODIFIED" class="table-data-css MODIFIED" style="color:white; background-color: black;">${createARowInput("MODIFIED")}</td>
    <td data-column="MOD_BY" class="table-data-css MOD_BY" style="color:white; background-color: black;">${createARowInput("MOD_BY")}</td>
    `;
    document.querySelector('.start-row').innerHTML += innerStart;
    
}

// Add a start row in the scripts_t5 database table
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

        const respondedData = await response.json();

          const date = new Date(respondedData.modified);
          const centralTimeString = new Date(date).toLocaleString('en-US', {timeZone: 'America/Chicago', hour12: false}).replace(',', '');
          // console.log(centralTimeString);
          tableActual.rows[1].querySelector(`[data-column="MODIFIED"]`).textContent = centralTimeString;

        console.log(`Start row inserted successfully!`);
        focusedRow = null;
    } catch (error) {
        console.error("insert error:", error);
        alert("Error inserting start row.");
    }
}
/**************** Add start row End************************/


/**************** Add break row Begin ************************/
const addBreakRowButton = document.getElementById('add-break-row');
let numOfBReakLines = 0;

 // Add Break Row Button (insert after the selected row)
 addBreakRowButton.addEventListener('click', async function () {
    if (!focusedRow) {
      alert("Please select a row to insert the break row.");
      return;
    }

    const breakBlock = await findNextBlockForBreak(selectedRundown.show_name, selectedRundown.show_date);
    if (breakBlock) {
        const row_num = focusedRow.rowIndex + 1;
        insertBreak(selectedRundown, breakBlock, row_num);
    

        const breakRow = tableActual.insertRow(row_num);  
        breakRow.classList.add('rundown-row');
        breakRow.setAttribute('draggable', 'true');
        breakRow.setAttribute('ondragstart', 'drag(event)');
        breakRow.setAttribute('ondragover', 'allowDrop(event)');
        breakRow.setAttribute('ondrop', 'drop(event)');
        drawBreak(breakRow, numOfBReakLines);        

        breakRow.querySelector(`[data-column="BLOCK"] input`).value = breakBlock;
        breakRow.querySelector(`[data-column="ITEM_NUM"] input`).value = 0;

        console.log('Break row inserted after the selected row');

    }
    
  });

    // Add a break row in the front end table
    function drawBreak(breakRow){
        numOfBReakLines += 1;

    breakRow.classList.add(`break-row${numOfBReakLines}`);

    let numOfColumns = selectedRundown.needed_columns.length;
    console.log(selectedTemplate, numOfColumns)

    let innerBreak = `
    <td data-column="BLOCK" class="table-data-css BLOCK" style="color:white; background-color: black;">${createARowInput("BLOCK")}</td>
    <td data-column="ITEM_NUM" class="table-data-css ITEM_NUM" style="color:white; background-color: black;">${createARowInput("ITEM_NUM")}</td>
    `;
    document.querySelector(`.break-row${numOfBReakLines}`).innerHTML +=  innerBreak;

    const mergedCell = breakRow.insertCell();
    mergedCell.colSpan = numOfColumns - 4; // This cell will span across 2 columns
    mergedCell.textContent = 'BREAK';
    mergedCell.style.backgroundColor = '#f9f9f9';
    mergedCell.style.textAlign = 'center';
    mergedCell.style.fontWeight = 'bold';

    innerBreak = `
    <td data-column="MODIFIED" class="table-data-css MODIFIED" style="color:white; background-color: black;">${createARowInput("MODIFIED")}</td>
    <td data-column="MOD_BY" class="table-data-css MOD_BY" style="color:white; background-color: black;">${createARowInput("MOD_BY")}</td>

    `;

    document.querySelector(`tr.break-row${numOfBReakLines}`).innerHTML += innerBreak;

    }

  //Find next available block for break
  async function findNextBlockForBreak(show_name, show_date) {
    try {
        const response = await fetch(`http://localhost:3000/find-next-block-break/${show_name}/${show_date}`);
        if (!response.ok) throw new Error("Failed to fetch data.");
        
        const data = await response.json();
        console.log(data.next_block);
        return data.next_block;

    } catch (error) {
        console.error("Fetch error:", error);
        alert("Error fetching data.");
    }
    
  }

  // Add a break row in the scripts_t5 table in the database
  async function insertBreak(selectedRundown, breakBlock, row_num) {
    const data = {
        show_name: selectedRundown.show_name,
        show_date: selectedRundown.show_date,
        breakBlock: breakBlock,
        row_num: row_num
    }
    console.log(data.row_num)

    try {
        const response = await fetch(`http://localhost:3000/insert-a-break-row`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data),
        });

        if (!response.ok) throw new Error("Failed to insert break row.");

        const respondedData = await response.json();

        const date = new Date(respondedData.modified);
        const centralTimeString = new Date(date).toLocaleString('en-US', {timeZone: 'America/Chicago', hour12: false}).replace(',', '');
        // console.log(centralTimeString);
        tableActual.rows[row_num].querySelector(`[data-column="MODIFIED"]`).textContent = centralTimeString;

        focusedRow = null;

    } catch (error) {
        console.error("insert error:", error);
        alert("Error inserting break row.");
    }
}

/**************** Add break row End ************************/

// Go back to rundown after pressing 'ESC'
document.addEventListener('keydown', function(event) {
    if (event.key === 'Escape') {
        const highlightedRow = document.querySelector('.selected-row');
        if (highlightedRow) {
            const firstCell = highlightedRow.cells[0];
            if (firstCell) {
                const inputOrSelect = firstCell.querySelector('input, select');
                if (inputOrSelect) {
                    inputOrSelect.focus();
                }
            }
        }
    }
});