let temp_columns = ['BLOCK', 'ITEM_NUM'];  // Collecting columns for creating new template version.
let temp_name;                       // The name of new template version
let template_versions = [];          // All created template versions so far --Will hold only names of each template versions
let selectedTemplate ='';            // Template that selected from the template list
let columnNames;

getTemplates();
let selectedRundown = {};

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
    !box.contains(e.target) && e.target !== btn
  ) {
    box.style.display = 'none';
  }
});

document.addEventListener('click', (e) => {
    if (
      !box2.contains(e.target) && e.target !== btn2
    ) {
      box2.style.display = 'none';
    }
  });


// Get modal, overlay, and buttons
const modal2 = document.getElementById('simpleModal');
const overlay2 = document.getElementById('rundwntotemp-overlay');
const openModalBtn = document.getElementById('openModalBtn');
const closeModalBtn = document.getElementById('closeModalBtn');

// Open modal when button is clicked
openModalBtn.addEventListener('click', function() {
    modal2.style.display = 'block';  // Show the modal
    overlay2.style.display = 'block'; // Show the overlay
});

// Close modal when the close button is clicked
closeModalBtn.addEventListener('click', function() {
    modal2.style.display = 'none';  // Hide the modal
    overlay2.style.display = 'none'; // Hide the overlay
});

// Close modal if clicked outside of the modal content
document.addEventListener('click', function(event) {
    if (!modal2.contains(event.target) && event.target !== openModalBtn) {
        modal2.style.display = 'none';
        overlay2.style.display = 'none';
    }
});


 //  creating a template as desired before inserting data into it.
//let template = ['BLOCK', 'ITEM_NUM'];

function addColumn(columnName){
    let index = temp_columns.indexOf(columnName);
    
    if(index===-1)
    {
        temp_columns.push(columnName); // add column names once they check the box.
    }   
}

function deleteColumn(columnName){
    let index = temp_columns.indexOf(columnName);

    if(index!==-1)
    {
        temp_columns.splice(index, 1); // remove column names once they uncheck the box
    }
}

function checkedStatus(js_check_what){  // make every check box uncheck once they add a new template version
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


//let temp_name; // give a name for that template you created

function createTemplate(){
    temp_name = document.querySelector(".js-input-temp-name").value;

    if(temp_name===""){
        alert("Please give a name for the template!");} //making sure they give a name for their newly created template
    else if(temp_name in template_versions){
        alert(`${temp_name} is already reserved. Please give another name for the template
        or delete previous ${temp_name} template from the template table!`);
    }
    else{
        temp_columns.push('MODIFIED', 'MOD_BY');

        addTemplate(); // adding newly created template into database

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

// Add a template to the database
async function addTemplate() {
    
    const data = {
        templateName:temp_name, 
        columnNames: temp_columns
    }

    //console.log(JSON.stringify(data));

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



async function getTemplates() {  // get all the template versions' names from the database
    try {
        const response = await fetch("http://localhost:3000/get-templates");
        if (!response.ok) {
            throw new Error("Failed to fetch data.");
        }
            template_versions = [];
            const data = await response.json();
            //console.log(data.rows);

            data.rows.forEach((row) => {
                template_versions.push(row.template_version);
            });
            
            //console.log(template_versions);
            showTemplates(); // After getting all the names, show those template in view section.
            
            
        } catch (error) {
            console.error("Error:", error);
            alert("Error fetching data.");
        }


}

let selectedItem = null;
let isListFocused = false;

function showTemplates() {
    let showHTML = ``;

    template_versions.forEach((key) => {
        const html = `<li class="list-temp-css" tabindex="0">${key}</li>`;
        showHTML += html;
    });

    const myList = document.querySelector('.js-all-template-versions');
    myList.innerHTML = showHTML;

    myList.addEventListener('click', (e) => {
        if (e.target && e.target.tagName === 'LI') {
            selectedItem = e.target;
            selectedTemplate = selectedItem.innerHTML;
            isListFocused = true;
            console.log('You clicked:', selectedTemplate);

            selectedRundown.show_name = "";
            selectedRundown.show_date = "";
            selectedRundown.needed_columns = [];
            getColumnNames(selectedTemplate);

            const table = document.getElementById('data-table-temp');
            const actualTable = document.getElementById('data-table');

    // Optional: hide the temp table and show the main one
    table.style.display = 'table';
    actualTable.style.display = 'none'; // or 'block' if styled differently
        }
    });

    // Click outside the list
    document.addEventListener('click', (e) => {
        if (!myList.contains(e.target)) {
            isListFocused = false;
            selectedItem = null;
        }
    });
}

// Add this ONCE globally, not inside showTemplates
document.addEventListener('keydown', function(event) {
    if (event.key === 'Delete' && isListFocused && selectedItem) {
        const templateName = selectedItem.innerHTML.trim();
        console.log(`Deleting template name: ${templateName}`);

        if (templateName === "Default") {
            alert("Request denied !!!");
        } else {
            event.stopPropagation();
            if (!confirm(`Delete "${templateName}"?`)) return;

            deleteTemplate(templateName);
            selectedItem.remove();
            template_versions = template_versions.filter(item => item !== templateName);
        }

        isListFocused = false;
        selectedItem = null;
    }
});

// Delete a template in the database
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


//let selectedTemplate ='';
//let columnNames;

/// Get relevant columns names for selected template from view list.
async function getColumnNames(selectedTemplate) {
    try {
        const response = await fetch(`http://localhost:3000/get-column-names/${selectedTemplate}`);
        if (!response.ok) throw new Error("Failed to fetch data.");
        
        const data = await response.json();
        columnNames = data.columnNames;
        console.log(data.show_name);
        if(data.show_name && data.show_date)
        {
            if(data.isShowInTable)
            {
                selectedRundown.show_name = data.show_name;
                selectedRundown.show_date = data.show_date;
                selectedRundown.needed_columns = data.columnNames;
                //drawTable(selectedTemplate);
                //getScriptsData(selectedRundown.show_name, selectedRundown.show_date);
                drawActualTable(columnNames, data.show_name, data.show_date)

                document.querySelector('.js-create').innerHTML = `View of ${selectedTemplate} Template`;
                //selectedRundown.show_name = "";
                //selectedRundown.show_date = "";
                //selectedRundown.needed_columns = [];
                
            }
            else
            {
                alert(`You do not have the original rundown to populate ${selectedTemplate} template. This template will be removed soon !`)
                //drawTable(selectedTemplate);
                //Delete the selectedTemplate
                deleteTemplate(selectedTemplate)
            }
        }
        else
        {
            drawTable(selectedTemplate);
        }
        
    } catch (error) {
        console.error("Fetch error:", error);
        alert("Error fetching data.");
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

    
    for (let i = 0; i <100; i++)
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

    //'FORMAT': `<input class="grid-input-data js-FORMAT" placeholder="" maxlength="12">`,
    'FORMAT':`<label for="formatInput"></label>
                            <input
                            id="formatInput"
                            name="format"
                            list="formatOptions"
                            placeholder="Type or select a format…"
                            style="text-align: center;"
                            />

                            <datalist id="formatOptions">
                            <option value="ONCAM">
                            <option value="RDR">
                            <option value="FS">
                            <option value="OTS">
                            <option value="PKG">
                            <option value="VO">
                            <option value="SOT/VO">
                            <option value="SOT">
                            <option value="NAT/VO">
                            <option value="OTS/FS">
                            <option value="DOUBLE-BOX">
                            <option value="LIVE">
                            <option value="PLASMA-VO">
                            <option value="CHROMA-VO">
                            <option value="WIPE VO">
                            <option value="WIPE FS">
                            <option value="MON VO">
                            <option value="MON FS">
                            </datalist>`, 

    'READ': `<input class="grid-input-data js-READ" placeholder="">`,

    'SOT': `<input class="grid-input-data js-SOT" placeholder="">`,

    'TOTAL': `<input class="grid-input-data js-TOTAL" placeholder="">`,

    'OK': `<select class="okDropdown">
                        <option value="" disabled selected style="text-align: center;">status</option> <!-- Placeholder -->
                        <option value="option-1" style="text-align: left;">🔴 Needs Revision</option>
                        <option value="option-2" style="text-align: left;">🟡 In progress</option>
                        <option value="option-3" style="text-align: left;">🟢 Approved</option>
                    </select>`,

    'CHANNEL': `<input class="grid-input-data js-CHANNEL" placeholder="" maxlength="3">`,

    'WRITER': `<input class="grid-input-data js-WRITER" placeholder="" maxlength="8">`,

    'EDITOR': `<input class="grid-input-data js-EDITOR" placeholder="" maxlength="8">`,

    'MODIFIED': ``, //type="datetime-local"

    'MOD_BY': ``,
}

function createARowInput(temp_name){
    return dataInputObject[temp_name];
}

let fileName = '';
const table = document.getElementById('data-table-temp');


table.addEventListener('click', function(event) {
    const target = event.target.closest('td');

    if((target.tagName ==='INPUT' ||  target.tagName ==='TD') && selectedRundown.show_name===""){ ///////////////////// This should be changed!!!!
        if(fileName ==='')
        {alert("This is just a view of a template. Please give a name and a date, and then select the rundown you want from the file directory.")}
    }
})


// Reset item #
document.getElementById('regenerate_item_num').addEventListener('click', () =>{
    console.log(selectedRundown.show_name && selectedRundown.show_date)
    if((selectedRundown.show_name!== "") && (selectedTemplate.show_date!==""))
    {
       // regenerateItemNum(selectedRundown);
    }
    else
    {
        alert("You have not selected a rundown.")
    }
    
});

async function regenerateItemNum(selectedRundown) {
    const data={
        show_name: selectedRundown.show_name,
        show_date: selectedRundown.show_date
    }
    try {
        const response = await fetch(`http://localhost:3000/regenerate-item-number`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data),
        });

        if (response.ok) {
            console.log("successed!")
        } else if (response.status === 400) {
           console.log("unsuccessed!")
        } else {
            alert("Failed to regenerate item number.");
        }
    } catch (error) {
        console.error("Error:", error);
        alert("Error connecting to the server.");
    }
};


// Add a rundown into template
const btn3 = document.getElementById('addRundown2Template');
const modal = document.getElementById('rundowntotemp-modal');
const overlay = document.getElementById('rundowntotemp-overlay');
const cancelBtn = document.getElementById('cancelModal');
const saveBtn = document.getElementById('saveTemplate');
const input = document.getElementById('templateNameInput');

btn3.addEventListener('click', () => {
  overlay.style.display = 'block';
  modal.style.display = 'block';
  if(selectedRundown.show_name)
  {
    document.querySelector(".title-of-modal1").innerHTML = `Save "${selectedRundown.show_name}" As A Template`;
  }
  
  input.value = ''; // clear input
  input.focus();
});

cancelBtn.addEventListener('click', () => {
  overlay.style.display = 'none';
  modal.style.display = 'none';
});

saveBtn.addEventListener('click', () => {
  const name = input.value.trim();
  if(selectedRundown.show_name)
    {
        if (name) {
            saveRunsownAsTemplate(name, selectedRundown);
            alert(`Saving template as: ${name}`);
        } else {
            saveRunsownAsTemplate(selectedRundown.show_name, selectedRundown);
            alert(`Saving with rundown name "${selectedRundown.show_name}"`);
        }
    }
    else
    {
        alert("You do not have a selected rundown to save as a template !")
    }

  overlay.style.display = 'none';
  modal.style.display = 'none';
});


async function saveRunsownAsTemplate(name, selectedRundown) {
    const data = {
        temp_name:name,
        originalData:`{${selectedRundown.show_date}, ${selectedRundown.show_name}, ${selectedRundown.template_version}}`,
    }

    try {
        const response = await fetch(`http://localhost:3000/save-rundown-as-template`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data),
        });

        if (response.ok) {
            getTemplates();
        } else if (response.status === 400) {
            alert(`${data.temp_name} already exists. Give it another name!`)
        } else {
            alert("Failed to insert template.");
        }
    } catch (error) {
        console.error("Error:", error);
        alert("Error connecting to the server.");
    }
    
}


