getRundownList();
getTemplates();


const btn = document.getElementById('templatesButton');
const box = document.getElementById('templateBox');
const btn2 = document.getElementById('addStartBreakButton');
const box2 = document.getElementById('startBreakBox');

btn.addEventListener('click', () => {
  const rect = btn.getBoundingClientRect();
  box.style.display = box.style.display === 'block' ? 'none' : 'block';
  box.style.top = `${rect.bottom + window.scrollY + 5}px`;
  box.style.left = `${rect.left + window.scrollX}px`;
  
});

btn2.addEventListener('click', () => {
  const rect2 = btn2.getBoundingClientRect();
  box2.style.display = box2.style.display === 'block' ? 'none' : 'block';
  box2.style.top = `${rect2.bottom + window.scrollY + 5}px`;
  box2.style.left = `${rect2.left + window.scrollX}px`;
});

// Optional: close if clicked outside either box
document.addEventListener('click', (e) => {
  if (
    !box.contains(e.target) && e.target !== btn &&
    !box2.contains(e.target) && e.target !== btn2
  ) {
    box.style.display = 'none';
    box2.style.display = 'none';
  }
});


// Get modal and buttons
const modal = document.getElementById('simpleModal');
const openModalBtn = document.getElementById('openModalBtn');
const closeModalBtn = document.getElementById('closeModalBtn');

// Open modal when button is clicked
openModalBtn.addEventListener('click', function() {
    modal.style.display = 'block';  // Show the modal
});

// Close modal when the close button is clicked
closeModalBtn.addEventListener('click', function() {
    modal.style.display = 'none';  // Hide the modal
});

// Close modal if clicked outside of the modal content
document.addEventListener('click', function(event) {
    if (!modal.contains(event.target) && event.target !== openModalBtn) {
      modal.style.display = 'none';
    }
  });


function addColumn(columnName){
    let index = template.indexOf(columnName);
    
    if(index===-1)
    {
        template.push(columnName);
    }   
}

function deleteColumn(columnName){
    let index = template.indexOf(columnName);

    if(index!==-1)
    {
        template.splice(index, 1);
    }
}

function checkedStatus(js_check_what){
    const if_check = document.querySelector(js_check_what);
    
    if(if_check.checked)
        {return true;}
    if(if_check.checked=== false)
        {return false;}
}

function enter(key) {
    if (key === 'Enter')
        { createTemplate(); }
}


let template = ['BLOCK', 'ITEM_NUM'];
let temp_name;

function createTemplate(){
    temp_name = document.querySelector(".js-input-temp-name").value;

    if(temp_name===""){
        alert("Please give a name for the template!");}
    else if(temp_name in template_versions){
        alert(`${temp_name} is already reserved. Please give another name for the template
        or delete previous ${temp_name} template from the template table!`);
    }
    else{
        template.push('MODIFIED', 'MOD_BY');

        addTemplate();
        

        let checkboxes = document.querySelectorAll('input[type="checkbox"]');
    
        // Loop through each checkbox and uncheck it
        checkboxes.forEach(function(checkbox) {
            if (checkbox.id !== "exceptID")
                {checkbox.checked = false;}
        });
        document.querySelector(".js-input-temp-name").value = '';
        document.getElementById('simpleModal').style.display='none';
        
        
    }

}

async function addTemplate() {
    
    const data = {
        templateName:temp_name, 
        columnNames: template
    }

    console.log(JSON.stringify(data));

    try {
        const response = await fetch("http://localhost:3000/add-template", {
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

let template_versions = [];

async function getTemplates() {  
    try {
        const response = await fetch("http://localhost:3000/get-templates");
        if (!response.ok) {
            throw new Error("Failed to fetch data.");
        }
            template_versions = [];
            const data = await response.json();
            console.log(data.rows);

            data.rows.forEach((row) => {
                template_versions.push(row.template_version);
            });
            
            console.log(template_versions);
            showTemplates();
            
            
        } catch (error) {
            console.error("Error:", error);
            alert("Error fetching data.");
        }


}

let selectedTemplate ='';
let columnNames;

async function getColumnNames(selectedTemplate) {
    try {
        const response = await fetch(`http://localhost:3000/get-column-names/${selectedTemplate}`);
        if (!response.ok) throw new Error("Failed to fetch data.");
        
        const data = await response.json();
        console.log("Column Names:", data);
        columnNames = data.rows[0].needed_columns.replace(/[{}"]/g, '').split(',');
        console.log(columnNames);
        drawTable(selectedTemplate)
    } catch (error) {
        console.error("Fetch error:", error);
        alert("Error fetching data.");
    }
}


function showTemplates(){
    let showHTML = ``;

    template_versions.forEach((key) => {
        console.log(key);
        const html = `<tr><td class="table-temp-css selectable">${key}</td></tr>`;
        showHTML += html;
        showHTML += `<tr><td></td></tr>`
    });
    
    document.querySelector(".js-show-templates").innerHTML = showHTML;

    let clickTimer = null;
    let isClicked = false;

    
    document.querySelector(".js-show-templates").querySelectorAll('.selectable').forEach(row => {
        row.addEventListener('click', function(event) {
        // If a double-click is detected, ignore the single click
        if (clickTimer !== null) {
            clearTimeout(clickTimer);
            clickTimer = null;
        } else {
            // Wait for a short time to check if it's a double-click
            clickTimer = setTimeout(function() {
                selectRow(row); 
                console.log(row.innerHTML);
                isClicked = true; // Set flag to true after clicking

                // Listen for Enter key after clicking
                document.addEventListener('keydown', function(event) {
                    if (isClicked && event.key === 'Delete') {
                        alert('You pressed Delete after clicking!');
                        deleteTemplate(row.innerHTML);
                        console.log('Delete key pressed after click!');
                        
                        isClicked = false; // Reset flag to avoid repeated alerts
                    }
                }, { once: true });

                //alert('Single Click Action!');
                clickTimer = null;
            }, 300);  // 300ms delay to differentiate
        }
    });
        row.addEventListener('dblclick', function(event) {
        // Clear single click timer if double click is detected
        if (clickTimer !== null) {
            clearTimeout(clickTimer);
            clickTimer = null;
        }
        selectedTemplate = row.innerHTML;
        getColumnNames(selectedTemplate);
        selectRow(row); 
        console.log(row.innerHTML);
        document.getElementById('templateBox').style.display='none';
        
        //alert('Double Click Action!');
    });
        
    });
}


function selectRow(row) {
    // Remove the 'selected' class from all rows
    let rows = document.querySelectorAll('.selectable');
    rows.forEach(r => r.classList.remove('selected'));

    // Add the 'selected' class to the clicked row
    row.classList.add('selected');
}



async function deleteTemplate(temp_name) {
    try {
        const response = await fetch(`http://localhost:3000/delete-template`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ template_version: temp_name }),
        });

        if (!response.ok) throw new Error("Failed to delete template.");

        console.log(`Template ${temp_name} deleted successfully!`);
        getTemplates(); // Reload templates after deletion
    } catch (error) {
        console.error("Delete error:", error);
        alert("Error deleting template.");
    }
}







// this will only draw table head columns
function drawTable(temp_name){
    document.querySelector('.js-create').innerHTML = `View of A ${temp_name} Template`;

    let headHTML=``;
    let dataHTML=``;


    columnNames.forEach(function (column) {
        
        const rowHTML = `<th class="table-head-css ${column}">${column}</th>`
        headHTML += rowHTML;
    })

    
    for (let i = 0; i <35; i++)
        {
            
            let tablerow= ``;
            let datarow =``;
            columnNames.forEach(function (column) {
                const datarowHTML = `<td data-column=${column} class="table-data-css ${column}">${createARowInput(column)}</td>`
                datarow += datarowHTML;

            })
            tablerow = `<tr>${datarow}<tr>`;
            dataHTML += tablerow;
        }

        dataHTML = `<tbody>${dataHTML}</tbody>`;

    let headRowHTML = `<thead><tr class="head-row-css">${headHTML}</tr></thead>`;

    document.querySelector('.js-create-script').innerHTML = headRowHTML + dataHTML;
}


const dataInputObject = {
    //'ID': `<input class="grid-input-data js-ID" type="Number">`,
    'BLOCK': `<input class="grid-input-data js-BLOCK" placeholder="" maxlength="2">`,

    'ITEM_NUM': `<input class="grid-input-data js-ITEM_NUM" placeholder="" type="number">`,

    'CAM': `<input class="grid-input-data js-CAM" placeholder="" type="number"></input>`,

    'SHOT': `<select class="shotDropdown">
                        <option value="" disabled selected>shot</option> <!-- Placeholder -->
                        <option value="1-SHOT">1-SHOT</option>
                        <option value="OTS">OTS</option>
                        <option value="2-SHOT">2-SHOT</option>
                        <option value="3-SHOT">3-SHOT</option>
                        <option value="CHROMA">CHROMA</option>
                        <option value="NEWSROOM">NEWSROOM</option>
                        <option value="PLASMA">PLASMA</option>
                        <option value="INTERVIEW">INTERVIEW</option>
                        <option value="LIVE">LIVE</option>
                    </select>`,

    'TAL': `<input class="grid-input-data js-TAL" placeholder="" maxlength="8">`,

    'SLUG': `<input class="grid-input-data js-SLUG" placeholder="" maxlength="30">`,

    'FORMAT': `<input class="grid-input-data js-FORMAT" placeholder="" maxlength="12">`,

    'READ': `<input class="grid-input-data js-READ" placeholder="" type="time">`,

    'SOT': `<input class="grid-input-data js-SOT" placeholder="" type="time">`,

    'TOTAL': `<input class="grid-input-data js-TOTAL" placeholder="" type="time">`,

    'OK': `<select class="okDropdown">
                        <option value="" disabled selected>status</option> <!-- Placeholder -->
                        <option value="option-1">option 1</option>
                        <option value="option-2">option 2</option>
                        <option value="option-3">option-3</option>
                        <option value="option-4">option-4</option>
                    </select>`,

    'CHANNEL': `<input class="grid-input-data js-CHANNEL" placeholder="" maxlength="3">`,

    'WRITER': `<input class="grid-input-data js-WRITER" placeholder="" maxlength="8">`,

    'EDITOR': `<input class="grid-input-data js-EDITOR" placeholder="" maxlength="8">`,

    'MODIFIED': `<input class="grid-input-data js-MODIFIED" placeholder="" >`, //type="datetime-local"

    'MOD_BY': `<input class="grid-input-data js-MOD_BY" placeholder="" maxlength="8">`,
}

function createARowInput(temp_name){
    return dataInputObject[temp_name];
}

let fileName = '';
const table = document.getElementById('data-table');


table.addEventListener('click', function(event) {
    const target = event.target.closest('td');

    if(target.tagName ==='INPUT' ||  target.tagName ==='TD'){ ///////////////////// This should be changed!!!!
        if(fileName ==='')
        {alert("Please give a name and directory to your script before begin editing!")}
    }
})

let rundownList = []

////// geting rundown list

async function getRundownList() {
    try {
        const response = await fetch(`http://localhost:3000/get-rundown-list`);
        if (!response.ok) throw new Error("Failed to fetch data.");
        
        const data = await response.json();
        console.log("Rundown List: ", data.rows);
        rundownList = [];
        data.rows.forEach( function (row) {
            rundownList.push(row)
        });
        showRundownList(rundownList);
        
    } catch (error) {
        console.error("Fetch error:", error);
        alert("Error fetching data.");
    }
}



function showRundownList(rundownList){
    let innerHTML = ``;

    rundownList.forEach(item => {
        let HTML = `<p class="selectable" >${item.show_name}</p>`
        innerHTML += HTML;
    })

    document.querySelector('.js-rundown-list').innerHTML = innerHTML;
}

