let focusedRow = null;

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

let detailsForScriptEditor = {
  row_num:null,
  block: null,
  item_num: null
};

// calculating the script read time
function calculateTime(textarea) {
    const text = textarea.value.trim();
    const words = text.split(/\s+/).filter(word => word.length > 0).length;
    const wpm = 183;
    const totalSeconds = Math.ceil((words / wpm) * 60);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;

    const readTime = `${minutes}:${seconds}`;
    // Get the container of the textarea
    const container = textarea.closest(".scriptBox-container");
    // Get the heading inside that container
    const heading = container.querySelector(".scriptBox-heading");
    // Update the headings text
    heading.textContent = `Script Editing (Current length: ${minutes} min ${seconds} sec)`;

   // store the read time and script after hitting submit
    document.getElementById("scriptSubmit").onclick = function() {
        if(selectedRundown.show_name && detailsForScriptEditor.block && detailsForScriptEditor.item_num)
        {
          
            // save the script to a string
          const textarea = document.querySelector(".scriptBox");
          const scriptText = textarea.value;
          // clear the textarea
          //textarea.value = "";
          heading.textContent = `Script Editing (Current length: 0 min 0 sec)`;
          // log the script and the final time after submitting
          console.log(`selectedScriptRow: ${detailsForScriptEditor.row_num} show name ${selectedRundown.show_name} Script: \n${scriptText}`)
          console.log(`Final time: ${totalSeconds} seconds`);
          alert(`Time saved: ${Math.floor(totalSeconds / 60)} min ${totalSeconds % 60} sec`);

          //Once they click submit insert scriptText into database
          insertScriptText(selectedRundown, detailsForScriptEditor, scriptText, readTime)
        }
        else
        {
          alert("You have not selected a row or don't have block or item_num")
        }

        
    
        
    };
}

//insert a script and then get the modified time back (and mod_by in future)
async function insertScriptText(selectedRundown, detailsForScriptEditor, scriptText, readTime) {
  const data = {
    show_name: selectedRundown.show_name,
    show_date: selectedRundown.show_date,
    row_num: detailsForScriptEditor.row_num,
    scriptText: scriptText,
    readTime: readTime 
  }

    try {
      const response = await fetch("http://localhost:3000/insert-script-text", {
          method: "POST",
          headers: {
              "Content-Type": "application/json",
          },
          body: JSON.stringify(data),
      });

      if (response.ok) {
          alert("Data inserted successfully!");
          
          //show just inserted script text or don't erase that if you want to update the last edited time, 
          //you have to get inserted data back
          const respondedData = await response.json();

          const date = new Date(respondedData.modified);
          const centralTimeString = new Date(date).toLocaleString('en-US', {timeZone: 'America/Chicago', hour12: false}).replace(',', '');
          // console.log(centralTimeString);
          tableActual.rows[data.row_num].querySelector(`[data-column="MODIFIED"]`).textContent = centralTimeString;

          tableActual.rows[data.row_num].querySelector(`[data-column="READ"] input`).value = respondedData.read;

          //Empty the detailsForScriptEditor before next submit
          detailsForScriptEditor.row_num = null;
          detailsForScriptEditor.item_num = null;
          detailsForScriptEditor.block = null;
          
      } else {
          alert("Failed to insert data.", forMessage);
      }
  } catch (error) {
      console.error("Error:", error);
      alert("Error connecting to the server.");
  }

  
}


let active = true;
let template_version = 'Default';


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

  // group into { folder: [ { name, version }, … ] }
  const groups = rows.reduce((acc, { folder_topic, show_name, template_version }) => {
    if (!acc[folder_topic]) acc[folder_topic] = [];
    if (show_name) {
      acc[folder_topic].push({ 
        name: show_name, 
        version: template_version 
      });
    }
    return acc;
  }, {});

  Object.entries(groups).forEach(([folder, shows]) => {
    container.appendChild(createFolderElement(folder, shows));
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
  shows.forEach(({ name, version }) => {
    const li = document.createElement("li");
    li.textContent = name;
    li.textContent = name;
    li.style.cursor = "pointer";
    li.style.fontSize = "0.9rem";
    li.style.fontFamily = "Arial, sans-serif";
    li.style.padding = "4px 0";

    li.addEventListener("click", () => {
      console.log(`Show clicked: "${name}" in "${folder}", version="${version}"`);
      // now pass the real version, not the global:
      focusedRow = null;
      getDetailsRundown(name, folder, active, version);
      document.querySelector(".scriptBox").value = null;
      //container.querySelector(".scriptBox-heading").textContent = `Script Editing (Current length: 0 min 0 sec)`;
      focusedRow = null;
    });

    ul.appendChild(li);
  });

  return ul;
}

function createAddShowForm(folder) {
  const form = document.createElement("form");
  form.style.display = "none";
  form.classList.add("add-show-form");

  // dropdown to select template version
  const versionSelect = document.createElement("select");
  versionSelect.name = "templateVersion";
  versionSelect.required = true;

  // placeholder option
  const placeholder = new Option("Select a template…", "", true, true);
  placeholder.disabled = true;
  versionSelect.add(placeholder);

  // fetch the available versions
  fetch("/get-templates")
    .then(res => {
      if (!res.ok) throw new Error("Network error fetching templates");
      return res.json();
    })
    .then(data => {
      // if your server is returning { rows: [ { template_version } ] }
      const rows = Array.isArray(data.rows) ? data.rows : data;
      rows.forEach(({ template_version }) => {
        const opt = new Option(template_version, template_version);
        versionSelect.add(opt);
      });
    })
    .catch(err => {
      console.error("Could not load template versions:", err);
      const errOpt = new Option("Error loading templates", "", true, true);
      errOpt.disabled = true;
      versionSelect.innerHTML = "";
      versionSelect.add(errOpt);
    });

  // get the show name and date
  const nameInput = document.createElement("input");
  nameInput.type = "text";
  nameInput.placeholder = "Show name";
  nameInput.required = true;

  const dateInput = document.createElement("input");
  dateInput.type = "date";
  dateInput.required = true;

  // submit btn
  const submit = document.createElement("button");
  submit.type = "submit";
  submit.textContent = "Submit";

  // assemble form
  form.appendChild(nameInput);
  form.appendChild(dateInput);
  form.appendChild(versionSelect);
  form.appendChild(submit);

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const showName = nameInput.value.trim();
    const showDate = dateInput.value;
    const templateVersion = versionSelect.value;

    if (!showName || !showDate || !templateVersion) {
      alert("Show name, date, and template version are all required.");
      return;
    }

    console.log(`📦 Adding show to "${folder}"`);
    console.log(`Show Name: ${showName}`);
    console.log(`Show Date: ${showDate}`);
    console.log(`Template Version: ${templateVersion}`);

   // send to backend 
    try {
      const resp = await fetch("/add-show", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          folder,
          show_name: showName,
          show_date: showDate,
          template_version: templateVersion
        })
      });
      if (!resp.ok) throw new Error(await resp.text());

      await getDirectory();//reload the directory after adding a new show so that you can see it 

    } catch (err) {
      console.error("Error adding show:", err);
      alert("Failed to add show.");
    }



    // reset form
    nameInput.value = "";
    dateInput.value = "";
    versionSelect.selectedIndex = 0;
    form.style.display = "none";
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

  
/************************Export Functions**************************** */

//This is just for testing export function
//generateRundownPDF("Tonight News", "2025-04-20");
//generateScriptPDF("Tonight News", "2025-04-20")

async function generateRundownPDF(show_name, show_date) {
  try {
      window.location.href = `http://localhost:3000/generate-rundownpdf/${show_name}/${show_date}`;
      alert(`${show_name} - ${show_date} is being downloaded!`);
  } catch (error) {
      console.error("Download error:", error);
      alert(`No data found for ${show_name} - ${show_date}`);
  }
}

async function generateScriptPDF(show_name, show_date) {
  try {
      window.location.href = `http://localhost:3000/generate-scriptpdf/${show_name}/${show_date}`;
      alert(`${show_name} - ${show_date} is being downloaded!`);
  } catch (error) {
      console.error("Download error:", error);
      alert(`No data found for ${show_name} - ${show_date}`);
  }
}
/******************************************************************* */




