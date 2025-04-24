
import { PDFDocument } from 'pdf-lib'; // ✅ Browser-friendly

const searchInput = document.querySelector(".search-input");
searchInput.addEventListener("input", (e) => {
    const searchTerm = e.target.value.toLowerCase();
    document.querySelectorAll(".file-item").forEach(item => {
        const fileName = item.getAttribute("data-file").toLowerCase();
        item.style.display = fileName.includes(searchTerm) ? "block" : "none";
    });
});

// User Management button
document.getElementById("user-management-btn").addEventListener("click", () => {
    const user = JSON.parse(localStorage.getItem("user"));
    if (user && user.adminLevel === "professor") {
        window.location.href = "/user-management.html";
    } else {
        alert("You don't have permission to access this page.");
    }
});



// calculating the script read time
function calculateTime(textarea) {
    const text = textarea.value.trim();
    const words = text.split(/\s+/).filter(word => word.length > 0).length;
    const wpm = 183;
    const totalSeconds = Math.ceil((words / wpm) * 60);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    // Get the container of the textarea
    const container = textarea.closest(".scriptBox-container");
    // Get the heading inside that container
    const heading = container.querySelector(".scriptBox-heading");
    // Update the headings text
    heading.textContent = `Script Editing (Current length: ${minutes} min ${seconds} sec)`;

   // store the read time and script after hitting submit
    document.getElementById("scriptSubmit").onclick = function() {
        // save the script to a string
        const textarea = document.querySelector(".scriptBox");
        const scriptText = textarea.value;
        // clear the textarea
        textarea.value = "";
        heading.textContent = `Script Editing (Current length: 0 min 0 sec)`;
        // log the script and the final time after submitting
        console.log(`Script: \n${scriptText}`)
        console.log(`Final time: ${totalSeconds} seconds`);
        alert(`Time saved: ${Math.floor(totalSeconds / 60)} min ${totalSeconds % 60} sec`);
    };
}



let active = true;
const template_version = 'Default';


// DIRECTORY
document.addEventListener("DOMContentLoaded", () => {
  getDirectory();
  setupAddFolderForm();
});

async function getDirectory() {
  try {
    const response = await fetch("http://localhost:3000/directory");
    if (!response.ok) throw new Error(`HTTP error --- status: ${response.status}`);
    const data = await response.json();
    renderDirectory(data);
  } catch (error) {
    console.error("Fetch error:", error.message);
  }
}

function renderDirectory(rows) {
  const container = document.getElementById("folderList");
  container.innerHTML = "";

  const groups = rows.reduce((acc, { folder_topic, show_name }) => {
    if (!acc[folder_topic]) acc[folder_topic] = [];
    if (show_name) acc[folder_topic].push(show_name);
    return acc;
  }, {});

  Object.entries(groups).forEach(([folder, shows]) => {
    const folderElement = createFolderElement(folder, shows);
    container.appendChild(folderElement);
  });
}

function createFolderElement(folder, shows) {
  const details = document.createElement("details");
  const summary = document.createElement("summary");

  const title = document.createElement("span");
  title.textContent = folder;
  summary.appendChild(title);

  const folderContent = document.createElement("div");
  folderContent.classList.add("folder-content");

  const showList = createShowList(shows, folder);
  folderContent.appendChild(showList);

  const addShowForm = createAddShowForm(folder);
// Create the add icon button next to folder title
const addIcon = document.createElement("button");
addIcon.classList.add("add-btn");
addIcon.title = "Add a show";

addIcon.addEventListener("click", (e) => {
  e.stopPropagation(); // Prevent collapsing the <details>
  addShowForm.style.display = addShowForm.style.display === "none" ? "flex" : "none";
});

  summary.appendChild(addIcon);
  details.appendChild(summary);
  folderContent.appendChild(addShowForm)
  details.appendChild(folderContent);

  return details;
}

function createShowList(shows, folder) {
  if (shows.length === 0) {
    const p = document.createElement("p");
    p.textContent = "No shows available";
    return p;
  }

  const ul = document.createElement("ul");
  shows.forEach(name => {
    const li = document.createElement("li");
    li.textContent = name;
    li.style.cursor = "pointer";
    li.style.fontSize = "0.9rem";
    li.style.fontFamily = "Arial, sans-serif";
    li.style.padding = "4px 0";

    li.addEventListener("click", () => {
      console.log(`Show clicked: "${name}" ${folder}`);
      getDetailsRundown(name, folder, active, template_version);
    });

    ul.appendChild(li);
  });

  return ul;
}

function createAddShowForm(folder) {
  const form = document.createElement("form");
  form.style.display = "none";
  form.classList.add("add-show-form");

  const nameInput = document.createElement("input");
  nameInput.type = "text";
  nameInput.placeholder = "Show name";
  nameInput.required = true;

  const dateInput = document.createElement("input");
  dateInput.type = "date";
  dateInput.required = true;

  const submit = document.createElement("button");
  submit.type = "submit";
  submit.textContent = "Submit";

  form.appendChild(nameInput);
  form.appendChild(dateInput);
  form.appendChild(submit);

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const showName = nameInput.value.trim();
    const showDate = dateInput.value;

    if (!showName || !showDate) {
      alert("Both Show Name and Date are required.");
      return;
    }

    console.log(`📦 Adding show to "${folder}"`);
    console.log(`Show Name: ${showName}`);
    console.log(`Show Date: ${showDate}`);

    nameInput.value = "";
    dateInput.value = "";
    form.style.display = "none";

    // NOTE: You can add the fetch call to POST this to your backend here
  });

  return form;
}

async function getDetailsRundown(name, folder, active, template_version) {
  const params = new URLSearchParams({
    show_name: name,
    folder,
    active,
    template_version
  });

  try {
    const response = await fetch(`http://localhost:3000/get-details-rundown?${params}`, {
      method: "GET",
      headers: { "Content-Type": "application/json" }
    });

    if (!response.ok) throw new Error("Error Fetching Data");

    const resData = await response.json();
    console.log("Column Names:", resData);

    selectedRundown.show_name = name;
    selectedRundown.show_date = resData[0].show_date.slice(0, 10);
    selectedRundown.needed_columns = resData[0].needed_columns.replace(/[{}"]/g, '').split(',');

    drawActualTable(selectedRundown.needed_columns, selectedRundown.show_name, selectedRundown.show_date);
  } catch (error) {
    console.error("Fetch error:", error);
    alert("Error fetching data.");
  }
}

function setupAddFolderForm() {
  const form = document.getElementById("add-folder-form");
  const input = form.querySelector("input");
  const button = document.getElementById("add-folder-btn");

  button.addEventListener("click", () => {
    form.style.display = form.style.display === "none" ? "flex" : "none";
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const folder = input.value.trim();
    if (!folder) return;

    try {
      const response = await fetch("/add-folder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ folder })
      });

      const data = await response.json();

      if (response.ok) {
        console.log("Folder added:", folder);
        getDirectory(); // Refresh list
      } else {
        console.error("Error adding folder:", data.error);
      }
    } catch (err) {
      console.error("Request failed:", err);
    }

    input.value = "";
    form.style.display = "none";
  });
}

async function getRundownDataForPrint(show_name, show_date) {
  try {
    const response = await fetch(`http://localhost:3000/print-rundown/${show_name}/${show_date}`);
    if (!response.ok) throw new Error("Failed to fetch data.");

    const data = await response.json();
    console.log("Rundown for print:", data);
    return data;
  } catch (error) {
    console.error("Fetch error:", error);
    alert(`No data in ${show_name} - ${show_date}`);
  }
}



///get the all inserted data
async function getScriptsDataForPrint(show_name, show_date) {
  try {
      const response = await fetch(`http://localhost:3000/get-scripts-data/${show_name}/${show_date}`);
      if (!response.ok) 
          {throw new Error("Failed to fetch data.");}
      
      const data = await response.json();
      console.log("Scripts Data:", data);
  } catch (error) {
      console.error("Fetch error:", error);
      alert(`No data in ${show_name} - ${show_date} `);
  }
}

async function generateRundownPDF(show_name1, show_date1) {
  try {
      const { scripts, show_name, show_date } = await getRundownDataForPrint(show_name1, show_date1);

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

generateRundownPDF('Baseball Event', '2025-04-25');
//getScriptsDataForPrint('Baseball Event', '2025-04-25');
  





