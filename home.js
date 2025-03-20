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



/////////////////////////////////////////////  the main list
let table_data = [{
    PAGE: 'A01',
    CAM: '1',
    SHOT: 'Shot 101',
    TAL: 'EX',
    SLUG: 'SluXYZ',
    FORMAT: '4K',
    READ: '10:30 AM',
    SOT: '15:00',
    TOTAL: '120',
    OK: 'Yes',
    CH: 'G',
    WR: 'ABC',
    ED: 'John',
    MODIFIED: '2025-03-16',
    MODBY: 'Admin'
},
{
    PAGE: 'A01',
    CAM: '1',
    SHOT: 'Shot 101',
    TAL: 'EX',
    SLUG: 'SluXYZ',
    FORMAT: '4K',
    READ: '10:30 AM',
    SOT: '15:00',
    TOTAL: '120',
    OK: 'Yes',
    CH: 'G',
    WR: 'ABC',
    ED: 'John',
    MODIFIED: '2025-03-16',
    MODBY: 'Admin'
}];



/////////////////////////////////////////// This will show the main list

let wholehtml = ``; // the html part for class="grid-data js-grid-data"

function showData(){
    
    wholehtml = ``;

    table_data.forEach(function(data){
        
        Object.entries(data).forEach(([key,value])=>{
            const html = `<div class="grid-data-inside">${value}</div>`;
            wholehtml += html;
        });

        document.querySelector('.js-grid-data').innerHTML = wholehtml;
    });
}

showData();
/////////////////////////////// for the SHOT DROPDOWN

let SHOT;
    const shotDropdown = document.getElementById('shotDropdown');
    shotDropdown.addEventListener('change', function() {
        SHOT = shotDropdown.value;
        
    });

    function logShotValue() {
        return SHOT; // This will log the latest value after the change event has occurred
    }


////////////////////////////////// This will track the missing data in the row when student try to add something to the main list.
let missingDataList = [];

function missingData(missed_data) {
    missingDataList.push(missed_data);
}

//////////////////////////////// Add a new data object into the main list.
function addToList(){   

    const PAGE = document.querySelector('.js-page').value || missingData('PAGE'); 
    const CAM = document.querySelector('.js-cam').value || missingData('CAM');
    const SHOT = logShotValue() || missingData('SHOT');
    const TAL = document.querySelector('.js-tal').value || missingData('TAL');
    const SLUG = document.querySelector('.js-slug').value || missingData('SLUG'); 
    const FORMAT = document.querySelector('.js-format').value || missingData('FORMAT');
    const READ = document.querySelector('.js-read').value || missingData('READ');
    const SOT = document.querySelector('.js-sot').value || missingData('SOT');
    const TOTAL = document.querySelector('.js-total').value || missingData('TOTAL');
    const OK = document.querySelector('.js-ok').value || missingData('OKAY');
    const CH = document.querySelector('.js-ch').value || missingData('CH');
    const WR = document.querySelector('.js-wr').value || missingData('WR');
    const ED = document.querySelector('.js-ed').value || missingData('ED');
    const MODIFIED = document.querySelector('.js-modified').value || missingData('MODIFIED');
    const MODBY = document.querySelector('.js-modby').value || missingData('MODBY');

    const lenOfList = missingDataList.length;

    if(lenOfList === 0){
        table_data.push({PAGE, CAM, SHOT, TAL, SLUG, FORMAT, READ, SOT, TOTAL, OK, CH, WR, ED, MODIFIED, MODBY});
        showData(); 
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
    
}