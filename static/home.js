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

          tableActual.rows[data.row_num].querySelector(`[data-column="TOTAL"] input`).value = respondedData.total;
          
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




/**GET AND RENDER DIRECTORY*/
async function getDirectory() {
  try {
    const resp = await fetch("http://localhost:3000/rundowns?active=true");
    if (!resp.ok) throw new Error(resp.status);
    const rows = await resp.json();
    renderDirectory(rows);
  } catch (e) {
    console.error("Fetch error:", e);
  }
}

function renderDirectory(rows) {
  const container = document.getElementById("folderList");
  container.innerHTML = "";

  // build { folder: [ { name, version, show_date }, … ] }
  const groups = rows.reduce((acc, { folder_topic, show_name, show_date, template_version }) => {
    if (!acc[folder_topic]) acc[folder_topic] = [];
    if (show_name) {
      acc[folder_topic].push({
        name:       show_name,
        version:    template_version,
        show_date:  show_date.slice(0, 10) // keep YYYY-MM-DD
      });
    }
    return acc;
  }, {});

  Object.entries(groups).forEach(([folder, shows]) => {
    container.appendChild(createFolderElement(folder, shows));
  });
}

/**GET AND RENDER ARCHIVE*/

async function getArchive() {
  try {
    const resp = await fetch("http://localhost:3000/rundowns?active=false");
    if (!resp.ok) throw new Error(resp.status);
    const rows = await resp.json();
    renderArchive(rows);
  } catch (e) {
    console.error("Fetch error:", e);
  }
}

function renderArchive(rows) {
  const container = document.getElementById("archiveList");
  container.innerHTML = "";

  const groups = rows.reduce((acc, { folder_topic, show_name, show_date, template_version }) => {
    if (!acc[folder_topic]) acc[folder_topic] = [];
    if (show_name) {
      acc[folder_topic].push({
        name:      show_name,
        version:   template_version,
        show_date: show_date.slice(0,10)
      });
    }
    return acc;
  }, {});

  // Do not have adding a folder and adding a show here
  Object.entries(groups).forEach(([folder, shows]) => {
    const details = document.createElement("details");
    const summary = document.createElement("summary");
    summary.textContent = folder;
    details.appendChild(summary);

    const content = document.createElement("div");
    content.classList.add("folder-content");
    content.appendChild(createShowList(shows, folder)); 
    details.appendChild(content);

    container.appendChild(details);
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
    p.style.fontWeight = "normal";
    p.style.fontSize = "0.87rem";
    p.style.textDecoration = "underline";
    p.textContent = "No shows available";
    return p;
  }

  const ul = document.createElement("ul");
  ul.classList.add("show-list");

  shows.forEach(({ name, version, show_date }) => {
    const li = document.createElement("li");
    li.classList.add("show-item");
    li.style.display        = "flex";
    li.style.alignItems     = "center";
    li.style.justifyContent = "space-between";

    // 1) arrow button on the left: toggles active
    const arrowBtn = document.createElement("button");
    arrowBtn.type  = "button";
    arrowBtn.classList.add("arrow-btn");
    arrowBtn.title = active 
      ? "Move to Archive" 
      : "Restore to Directory";

    const arrowIcon = document.createElement("img");
    arrowIcon.src   = "/public/images/curved-arrow.svg";
    arrowIcon.alt   = "";
    arrowIcon.classList.add("arrow-icon");
    arrowBtn.appendChild(arrowIcon);

    arrowBtn.addEventListener("click", async e => {
      e.stopPropagation();
      const newActive = !active;
      try {
        const resp = await fetch("/update-show-active", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            show_name: name,
            show_date,
            folder,
            active: newActive
          })
        });
        if (!resp.ok) throw new Error(await resp.text());
        // refresh both views
        await getDirectory();
        await getArchive();
      } catch (err) {
        console.error("Could not move show:", err);
        alert("Failed to move show.");
      }
    });

    li.appendChild(arrowBtn);

    // 2) show name (click loads details)
    const nameSpan = document.createElement("span");
    nameSpan.textContent = name;
    nameSpan.style.flex   = "1";
    nameSpan.style.cursor = "pointer";
    nameSpan.addEventListener("click", () => {
      getDetailsRundown(name, folder, active, version);
    });
    li.appendChild(nameSpan);

    // 3) delete button on the right
    const delBtn = document.createElement("button");
    delBtn.type  = "button";
    delBtn.classList.add("delete-btn");
    delBtn.title = "Delete this show";

    const delIcon = document.createElement("img");
    delIcon.src   = "/public/images/trash.svg";
    delIcon.alt   = "Delete";
    delIcon.classList.add("trash-icon");
    delBtn.appendChild(delIcon);

    delBtn.addEventListener("click", async e => {
      e.stopPropagation();
      if (!confirm(`Delete "${name}" on ${show_date}?`)) return;
      try {
        const params = new URLSearchParams({ show_name: name, show_date, folder });
        const resp = await fetch(`/delete-show?${params}`, { method: "DELETE" });
        if (!resp.ok) throw new Error(await resp.text());
        await getDirectory();
        await getArchive();
      } catch (err) {
        console.error("Could not delete show:", err);
        alert("Failed to delete show.");
      }
    });

    li.appendChild(delBtn);
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

document.addEventListener("DOMContentLoaded", () => {
  // Grab tabs & views
  const dirTab   = document.getElementById("directory-tab");
  const archTab  = document.getElementById("archive-tab");
  const dirView  = document.getElementById("directory-view");
  const archView = document.getElementById("archive-view");

  // Wire Directory button
  dirTab.addEventListener("click", () => {
    active = true;
    dirView.style.display  = "block";
    archView.style.display = "none";
    dirTab.classList.add("active");
    archTab.classList.remove("active");
  });

  // Wire Archive button
  archTab.addEventListener("click", () => {
    active = false;
    dirView.style.display  = "none";
    archView.style.display = "block";
    archTab.classList.add("active");
    dirTab.classList.remove("active");
    getArchive();
  });

  // go to the directory
  dirTab.click();

  // start up
  getDirectory();
  setupAddFolderForm();
});























/*
// DIRECTORY & ARCHIVE
document.addEventListener("DOMContentLoaded", () => {
  // Grab tabs & views
  const dirTab   = document.getElementById("directory-tab");
  const archTab  = document.getElementById("archive-tab");
  const dirView  = document.getElementById("directory-view");
  const archView = document.getElementById("archive-view");

  // Wire Directory button
  dirTab.addEventListener("click", () => {
    dirView.style.display  = "block";
    archView.style.display = "none";
    dirTab.classList.add("active");
    archTab.classList.remove("active");
  });

  // Wire Archive button
  archTab.addEventListener("click", () => {
    dirView.style.display  = "none";
    archView.style.display = "block";
    archTab.classList.add("active");
    dirTab.classList.remove("active");
  });

  // go to the directory
  dirTab.click();

  // start up
  getDirectory();
  setupAddFolderForm();
});


async function getDirectory() {
  try {
    const resp = await fetch("http://localhost:3000/directory");
    if (!resp.ok) throw new Error(resp.status);
    const rows = await resp.json();
    renderDirectory(rows);
  } catch (e) {
    console.error("Fetch error:", e);
  }
}

function renderDirectory(rows) {
  const container = document.getElementById("folderList");
  container.innerHTML = "";

  // build { folder: [ { name, version, show_date }, … ] }
  const groups = rows.reduce((acc, { folder_topic, show_name, show_date, template_version }) => {
    if (!acc[folder_topic]) acc[folder_topic] = [];
    if (show_name) {
      acc[folder_topic].push({
        name:       show_name,
        version:    template_version,
        show_date:  show_date.slice(0, 10) // keep YYYY-MM-DD
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

  shows.forEach(({ name, version, show_date }) => {
    const li = document.createElement("li");
    li.classList.add("show-item");
    li.textContent = name;
    li.style.cursor = "pointer";
    // click to load details:
    li.addEventListener("click", () => {
      prevSelectedRow = null;

      focusedRow = null;

      detailsForScriptEditor.block = null;
      detailsForScriptEditor.item_num = null;
      detailsForScriptEditor.row_num = null;

      numOfBReakLines = 0;

      previousTypedData = {
        row_number: null,
        block: null,
        item_num: null,
        column_name: null,
        data: null
    }

      getDetailsRundown(name, folder, active, version);
    });

    // --- delete button ---
    const delBtn = document.createElement("button");
    delBtn.type = "button";
    delBtn.classList.add("delete-btn");
    delBtn.title = "Delete this show";

    const icon = document.createElement("img");
    icon.src = "/public/images/trash.svg";
    icon.alt = "Delete";
    icon.classList.add("trash-icon");
    delBtn.appendChild(icon);

    delBtn.addEventListener("click", async e => {
      e.stopPropagation(); // don’t trigger the li click
      if (!confirm(`Delete "${name}" on ${show_date}?`)) return;

      try {
        const params = new URLSearchParams({ show_name: name, show_date, folder });
        const resp = await fetch(`/delete-show?${params}`, { method: "DELETE" });
        if (!resp.ok) throw new Error(await resp.text());
        await getDirectory();
      } catch (err) {
        console.error("Could not delete show:", err);
        alert("Failed to delete show.");
      }
    });

    li.appendChild(delBtn);
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
*/
  
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




