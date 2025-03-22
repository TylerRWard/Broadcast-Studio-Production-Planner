function loadFiles() {
    fetch("/directory")
        .then(response => {
            if (!response.ok) throw new Error("Failed to fetch directory");
            return response.json();
        })
        .then(data => {
            const fileList = document.querySelector(".file-list");
            fileList.innerHTML = data.files
                .map(file => `<li class="file-item" data-file="${file}">${file}</li>`)
                .join("");
            attachFileListeners();
        })
        .catch(error => {
            console.error("Error:", error);
            document.querySelector(".file-list").innerHTML = "<li>Error loading files</li>";
        });
}

function attachFileListeners() {
    document.querySelectorAll(".file-item").forEach(item => {
        item.addEventListener("click", () => {
            const fileName = item.getAttribute("data-file");
            alert(`Opening ${fileName}\n(Content not fetched yet - add backend endpoint!)`);
            console.log(`Clicked ${fileName}`);
        });
    });
}

document.addEventListener("DOMContentLoaded", loadFiles);

const searchInput = document.querySelector(".search-input");
searchInput.addEventListener("input", (e) => {
    const searchTerm = e.target.value.toLowerCase();
    document.querySelectorAll(".file-item").forEach(item => {
        const fileName = item.getAttribute("data-file").toLowerCase();
        item.style.display = fileName.includes(searchTerm) ? "block" : "none";
    });
});


getData(); // Load the data when entering to the website


////////////////////// get data from backend
let allData = [];

async function getData() {  
    try {
        const response = await fetch("http://localhost:3000/getData");
        if (!response.ok) {
            throw new Error("Failed to fetch data.");
        }
            allData = [];
            const data = await response.json();
            console.log(data);
            data.forEach((row) => {

                const objectOrder = {   //// Change the order of the columns as we want in the website
                    block : null,
                    item_num : null,
                    cam : null,
                    shot : null, 
                    tal : null, 
                    slug : null, 
                    format : null, 
                    read : null, 
                    backtime : null, 
                    ok : null, 
                    channel : null, 
                    writer : null, 
                    editor : null, 
                    modified : null,
                    show_date : null
                }
                row = Object.assign(objectOrder, row)
                allData.push(row);
                console.log(row);
            });

            showData();     /// Show the data in the table
            
        } catch (error) {
            console.error("Error:", error);
            alert("Error fetching data.");
        }
}


let wholehtml = ``; // the html part for class="grid-data js-grid-data"

function showData(){   ///// Function for showing the data in the table
    
    wholehtml = ``;

    allData.forEach(function(data){
        
        Object.entries(data).forEach(([key,value])=>{
            const html = `<div class="grid-data-inside">${value}</div>`;
            wholehtml += html;
        });

        document.querySelector('.js-grid-data').innerHTML = wholehtml;
    });
}



/////////////////////////////// for the SHOT DROPDOWN
let SHOT;
    const shotDropdown = document.getElementById('shotDropdown');
    shotDropdown.addEventListener('change', function() {
        SHOT = shotDropdown.value;
        
    });

    function logShotValue() {
        return SHOT; // This will log the latest value after the change event has occurred
    }


/////////////////////// This will track the missing data in the row when student try to add something to the main list.
let missingDataList = [];

function missingData(missed_data) {
    missingDataList.push(missed_data);
}



////////////////////// add data to backend
async function addRowData() {
    
    const BLOCK = document.querySelector('.js-block').value || missingData('BLOCK'); 
    const CAM = Number(document.querySelector('.js-cam').value); // || missingData('CAM');
    const ITEMNUM = Number(document.querySelector('.js-itemnum').value) || missingData('ITEMNUM'); 
    console.log(typeof ITEMNUM);
    const SHOT = logShotValue(); // || missingData('SHOT');
    const TAL = document.querySelector('.js-tal').value; // || missingData('TAL');
    const SLUG = document.querySelector('.js-slug').value; // || missingData('SLUG'); 
    const FORMAT = document.querySelector('.js-format').value; // || missingData('FORMAT');
    const READ = document.querySelector('.js-read').value || null; // || missingData('READ');
    //const SOT = document.querySelector('.js-sot').value // || missingData('SOT');
    const BACKTIME = document.querySelector('.js-backtime').value || null; // || missingData('TOTAL');
    
    const checkbox = document.querySelector('.js-ok');
                    console.log(checkbox.checked);

    const OK = checkbox.checked ; // || missingData('OKAY');
    const CH = document.querySelector('.js-ch').value; // || missingData('CH');
    const WR = document.querySelector('.js-wr').value; // || missingData('WR');
    const ED = document.querySelector('.js-ed').value; // || missingData('ED');
    const MODIFIED = document.querySelector('.js-modified').value || null; // || missingData('MODIFIED');
    const SHOWDATE = document.querySelector('.js-showdate').value || missingData('SHOWDATE');

    const lenOfList = missingDataList.length;

    
    let data;
    if(lenOfList === 0){
        data = {ITEMNUM, BLOCK, SHOWDATE, CAM, SHOT, TAL, SLUG, FORMAT, READ, BACKTIME, OK, CH, WR, ED, MODIFIED};
    } else {
        
        let forMessage = '';

        for (let i = 0; i<lenOfList-1; i++){
            forMessage += missingDataList[i];
            forMessage += ', ';
        }

        forMessage += missingDataList[lenOfList-1];
        alert(`You have missing data of ${forMessage}.`);
        missingDataList = [];
    }

    

    console.log(JSON.stringify(data));

    try {
        const response = await fetch("http://localhost:3000/addRowData", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(data),
        });

        if (response.ok) {
            alert("Data inserted successfully!");
        } else {
            alert("Failed to insert data.", forMessage);
        }
    } catch (error) {
        console.error("Error:", error);
        alert("Error connecting to the server.");
    }

}


















