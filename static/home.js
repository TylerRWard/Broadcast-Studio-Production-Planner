let focusedRow = null;

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
  // Ensure textarea exists
  if (!textarea) {
    console.error("Textarea not provided to calculateTime");
    return;
  }

  // Get the text from the textarea
  const text = textarea.value;

  // Count words, excluding empty strings
  const words = text.split(/\s+/).filter(word => word.length > 0).length;
  const wpm = 183;
  const totalSeconds = Math.ceil((words / wpm) * 60);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  // Format readTime as MM:SS with padded seconds
  const readTime = `${minutes}:${seconds.toString().padStart(2, "0")}`;

  // Update the heading
  const container = textarea.closest(".scriptBox-container");
  const heading = container?.querySelector(".scriptBox-heading");
  if (heading) {
    heading.textContent = `Script Editing (Current length: ${minutes} min ${seconds} sec)`;
  } else {
    console.warn("ScriptBox heading not found");
  }

  return readTime; // Optionally return readTime for use elsewhere
}

async function getScriptTags() {
    try {
        const resp = await fetch("/get-tags");
        if (!resp.ok) throw new Error(resp.status);
        const tags = await resp.json();

        const scriptBoxTagsSelect = document.querySelector(".scriptBox-tags-select");
        tags.forEach(tag => {
            const option = document.createElement('option');
            option.value = tag.tag_option;
            option.textContent = tag.tag_option;
            scriptBoxTagsSelect.appendChild(option);
        });
    } catch (e) {
        console.error("Fetch error:", e);
    }
}

function onScriptBoxSelectChange(scriptBoxTagsSelect) {
    const scriptBox = document.querySelector(".scriptBox");
    scriptBox.value = scriptBox.value + scriptBoxTagsSelect.value;
    scriptBoxTagsSelect.value = '';
    calculateTime(scriptBox)
}

function resetScriptBox() {
    const scriptBox = document.querySelector(".scriptBox");
    scriptBox.value = ''
    calculateTime(scriptBox)
}
// Function to insert a 2x2 table into the scriptBox textarea
function insertTable() {
  const scriptBox = document.querySelector(".scriptBox");
  // Define a simple text-based 2x2 table format
  const tableTemplate = `
  Top line:
  Bottom line:
`;
  // Insert the table at the current cursor position
  const startPos = scriptBox.selectionStart;
  const endPos = scriptBox.selectionEnd;
  const textBefore = scriptBox.value.substring(0, startPos);
  const textAfter = scriptBox.value.substring(endPos);
  scriptBox.value = textBefore + tableTemplate + textAfter;
  // Move cursor to the first cell (after "Cell 1")
  scriptBox.selectionStart = scriptBox.selectionEnd = startPos + 15; // Adjust based on tableTemplate
  // Recalculate read time
  calculateTime(scriptBox);
}

// Attach event listener to the insert table button (add this in DOMContentLoaded)
document.addEventListener("DOMContentLoaded", () => {
  // Existing DOMContentLoaded code...
  document.getElementById("insertTableBtn").addEventListener("click", insertTable);
  document.getElementById("scriptSubmit").addEventListener("click", async () => {
    const textarea = document.querySelector(".scriptBox");
    if (!textarea) {
      alert("Script textarea not found");
      return;
    }
    const scriptText = textarea.value;
    const readTime = calculateTime(textarea); // Calculate readTime
    if (
      selectedRundown?.show_name &&
      detailsForScriptEditor.block &&
      detailsForScriptEditor.item_num &&
      detailsForScriptEditor.row_num
    ) {
      console.log(
        `selectedScriptRow: ${detailsForScriptEditor.row_num} show name ${selectedRundown.show_name} Script: \n${scriptText}`
      );
      console.log(`Final time: ${readTime}`);
      await insertScriptText(selectedRundown, detailsForScriptEditor, scriptText, readTime);
    } else {
      alert("You have not selected a row or don't have block or item_num");
    }
    });
});


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
      const response = await fetch("/insert-script-text", {
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

// get the rundowns that are active and show them on the "directory" side
async function getDirectory() {
  try {
    const resp = await fetch("/rundowns?active=true");
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

// Group by the folder topic 
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

  // Create and append a folder element for each non-empty group
  Object.entries(groups).forEach(([folder, shows]) => {
    if (shows.length === 0) return;
    container.appendChild(createFolderElement(folder, shows));
  });
}

/**GET AND RENDER ARCHIVE*/

/** Fetch and render archived (inactive) rundowns */
async function getArchive() {
  // get the inactive rundowns
  try {
    const resp = await fetch("/rundowns?active=false");
    if (!resp.ok) throw new Error(resp.status);
    const rows = await resp.json();
    renderArchive(rows);
  } catch (e) {
    console.error("Fetch error:", e);
  }
}

// Render the archived rundowns and group them by folder
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
    container.appendChild(createFolderElement(folder, shows)); // add a show button 
    //container.appendChild(details); // this is for removing the add show button
  });
  
}

function createFolderElement(folder, shows) {
    // <details> will allow expand/collapse of the folder
  const details = document.createElement("details");
  const summary = document.createElement("summary");

    // Folder title span
  const title = document.createElement("span");
  title.textContent = folder;
  summary.appendChild(title);




  // Right-click (contextmenu) on the folder title to delete the entire folder
  // only for professor
  summary.addEventListener("contextmenu", async e => {
    e.preventDefault(); // Prevent the browser context menu
  
    const user = JSON.parse(localStorage.getItem("user"));
  
    if (!user || user.adminLevel !== "professor") {
      return; // STOP here if not professor
    }
  
    if (!confirm(`Delete entire folder "${folder}" and all its shows?`)) {
      return;
    }
  
    try {
      const resp = await fetch(`/delete-folder/${encodeURIComponent(folder)}`, {
        method: "DELETE"
      });
      if (!resp.ok) throw new Error(await resp.text());
      await getDirectory();
      await getArchive();
    } catch (err) {
      console.error("Failed to delete folder:", err);
      alert("Could not delete folder.");
    }
  });



    // Container for shows and “add show” form
  const folderContent = document.createElement("div");
  folderContent.classList.add("folder-content");

    // Create and append the list of existing shows
  const showList = createShowList(shows, folder);
  folderContent.appendChild(showList);

  const addShowForm = createAddShowForm(folder);
// Create the add icon button next to folder title
const addIcon = document.createElement("button");
addIcon.classList.add("add-btn");
addIcon.title = "Add a show";

addIcon.addEventListener("click", (e) => {
  e.stopPropagation(); // Prevent collapsing the <details>
    // Toggle form visibility
  addShowForm.style.display = addShowForm.style.display === "none" ? "flex" : "none";
});
  // Assemble the summary and content
  summary.appendChild(addIcon);
  details.appendChild(summary);
  folderContent.appendChild(addShowForm)
  details.appendChild(folderContent);

    // Return the fully built folder element
  return details;
}

function createShowList(shows, folder) {
  if (shows.length === 0) {
    // If no shows, display a placeholder paragraph
    const p = document.createElement("p");
    p.style.fontWeight = "normal";
    p.style.fontSize = "0.87rem";
    p.style.textDecoration = "underline";
    p.textContent = "No shows available";
    return p;
  }
  // Otherwise, build a <ul> container for show items
  const ul = document.createElement("ul");
  ul.classList.add("show-list");

  shows.forEach(({ name, version, show_date }) => {
     // Each show is an <li> with flex layout and relative positioning
    const li = document.createElement("li");
    li.classList.add("show-item");
    li.style.position = "relative";
    li.style.display        = "flex";
    li.style.alignItems     = "center";
    li.style.justifyContent = "space-between";

    //  arrow button on the left: toggles active
    const arrowBtn = document.createElement("button");
    arrowBtn.type  = "button";
    arrowBtn.classList.add("arrow-btn");
    arrowBtn.title = active
      ? "Move to Archive or Change Folder"
      : "Restore to Directory or Change Folder";

    const arrowIcon = document.createElement("img");
    arrowIcon.src   = "/public/images/archive-arrow.png";
    arrowIcon.alt   = "";
    arrowIcon.classList.add("arrow-icon");
    arrowBtn.appendChild(arrowIcon);
    li.appendChild(arrowBtn);

    //the dropdown menu container
    const menu = document.createElement("div");
    menu.classList.add("arrow-menu");
    li.appendChild(menu);

    menu.addEventListener("click", e => e.stopPropagation()); // stop from collapsing

    // toggle menu on arrow click
    arrowBtn.addEventListener("click", e => {
      e.stopPropagation(); // don’t collapse the menu
      menu.style.display = menu.style.display === "block" ? "none" : "block";
    });

    // 5) hide menu on outside click
    document.addEventListener("click", () => {
      menu.style.display = "none";
    });


     // --- Build menu contents ---

    //  archive/restore button
    const archiveBtn = document.createElement("button");
    archiveBtn.textContent = active ? "Move to Archive" : "Restore";
    archiveBtn.addEventListener("click", async e => {
      e.stopPropagation();
      menu.style.display = "none";
      const newActive = !active;
      try {
        await fetch("/update-show-active", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ show_name: name, show_date, folder, active: newActive })
        });
        // Refresh both lists
        await getDirectory();
        await getArchive();
      } catch (err) {
        console.error(err);
        alert("Failed to update status.");
      }
    });
    menu.appendChild(archiveBtn);

    //  folder selector 
    const folderSelect = document.createElement("select");
    // Placeholder option
    const placeholder = new Option("Move to folder…", "", true, true);
    placeholder.disabled = true;
    folderSelect.add(placeholder);

    // fetch the list of folders once
    fetch("/rundowns?active=true")
      .then(r => r.json())
      .then(rows => {
        // extract unique folder_topic values
        const folders = [...new Set(rows.map(r => r.folder_topic))];
        folders.forEach(f => {
          const opt = new Option(f, f);
          folderSelect.add(opt);
        });
      })
      .catch(console.error);

    folderSelect.addEventListener("change", async () => {
      const newFolder = folderSelect.value;
      menu.style.display = "none";
         // Send PATCH to move the show to a new folder
      try {
        await fetch("/update-show-folder", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ show_name: name, show_date, old_folder: folder, new_folder: newFolder })
        });
        await getDirectory();
        await getArchive();
      } catch (err) {
        console.error(err);
        alert("Failed to move folder.");
      }
    });
    menu.appendChild(folderSelect);

    //  show name (click loads details)
    const nameSpan = document.createElement("span");
    nameSpan.textContent = name;
    nameSpan.style.flex   = "1";
    nameSpan.style.cursor = "pointer";
    nameSpan.addEventListener("click", () => {
      // Reset any previous script-editor state
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
    // Fetch and show the rundown details
      getDetailsRundown(name, folder, active, version);
    });
    li.appendChild(nameSpan);

    //  delete button on the right
    const delBtn = document.createElement("button");
    delBtn.type  = "button";
    delBtn.classList.add("delete-btn");
    delBtn.title = "Delete this show";

    const delIcon = document.createElement("img");
    delIcon.src   = "/public/images/trash-icon.png";
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
    // Create the form element, hidden by default
  const form = document.createElement("form");
  form.style.display = "none";
  form.classList.add("add-show-form");

  // --- Template version dropdown ---

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

      // --- Show name and date inputs ---

  // get the show name and date
  const nameInput = document.createElement("input");
  nameInput.type = "text";
  nameInput.placeholder = "Enter show name...";
  nameInput.required = true;

  const dateInput = document.createElement("input");
  dateInput.type = "date";
  dateInput.required = true;

    // --- Submit button ---

  const submit = document.createElement("button");
  submit.type = "submit";
  submit.textContent = "Submit Show";

  // put together the form elements in order
  form.appendChild(nameInput);
  form.appendChild(dateInput);
  form.appendChild(versionSelect);
  form.appendChild(submit);


  // --- Form submission handler ---

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const showName = nameInput.value.trim();
    const showDate = dateInput.value;
    const templateVersion = versionSelect.value;

        // make sure that all fields are filled
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
      if (!resp.ok) {
        const errorData = await resp.json();
        throw new Error(errorData.error || "Unknown error");
      }

      await getDirectory();//reload the directory after adding a new show so that you can see it 

    } catch (err) {
      console.error("Error adding show:", err);
      alert("❌ " + err.message);
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
    const response = await fetch(`/get-details-rundown?${params}`, {
      method: "GET",
      headers: { "Content-Type": "application/json" }
    });

    if (!response.ok) throw new Error("Error Fetching Data");

    const resData = await response.json();
    console.log("Column Names:", resData);

    selectedRundown.show_name = name;
    selectedRundown.show_date = resData[0].show_date.slice(0, 10);
    selectedRundown.needed_columns = resData[0].needed_columns.replace(/[{}"]/g, '').split(',');
    selectedRundown.template_version = template_version;

    drawActualTable(selectedRundown.needed_columns, selectedRundown.show_name, selectedRundown.show_date);
  } catch (error) {
    console.error("Fetch error:", error);
    alert("Error fetching data.");
  }
}

function setupAddFolderForm() {
  // Get the form and its input
  // toggle button
  const form = document.getElementById("add-folder-form");
  const input = form.querySelector("input");
  const button = document.getElementById("add-folder-btn");

    // Toggle form visibility when clicking the “Add Folder” button
  button.addEventListener("click", () => {
    // flex to show 
    // none to hide
    form.style.display = form.style.display === "none" ? "flex" : "none";
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const folder = input.value.trim();
    if (!folder) return;
// Send POST request to create folder on the backend
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
    // Reset form for next use
    input.value = "";
    form.style.display = "none";
  });
}

async function loadFormats() {
  let rows = [];
  try {
    const res = await fetch("/formats");
    if (!res.ok) throw new Error(res.statusText);
    rows = await res.json();
  } catch (err) {
    console.error("Couldn’t load formats:", err);
    return;
  }

  // Panel select
  const formatSelect = document.getElementById("formatSelect");
  formatSelect.innerHTML = `<option value="" disabled selected>Select format…</option>`;
  rows.forEach(({ format }) => {
    const opt = document.createElement("option");
    opt.value = format;
    opt.textContent = format;
    formatSelect.appendChild(opt);
  });

  // Table dropdowns
  document.querySelectorAll(".formatDropdown").forEach(select => {
    select.innerHTML = `<option value="" disabled selected>Format…</option>`;
    rows.forEach(({ format }) => {
      const opt = document.createElement("option");
      opt.value = format;
      opt.textContent = format;
      select.appendChild(opt);
    });
  });
}



async function loadShots() {
  try {
    const res = await fetch("/shots");
    if (!res.ok) throw new Error("Failed to load shots");
    const rows = await res.json();

    // Fill panel dropdown
    const select = document.getElementById("shotSelect");
    select.innerHTML = `<option value="" disabled selected>Select shot…</option>`;
    rows.forEach(({ shot }) => {
      const opt = document.createElement("option");
      opt.value = shot;
      opt.textContent = shot;
      select.appendChild(opt);
    });

    // Fill all table dropdowns
    document.querySelectorAll(".shotDropdown").forEach(drop => {
      drop.innerHTML = `<option value="" disabled selected>shot</option>`;
      rows.forEach(({ shot }) => {
        const opt = document.createElement("option");
        opt.value = shot;
        opt.textContent = shot;
        drop.appendChild(opt);
      });
    });
  } catch (err) {
    console.error("Couldn’t load shots:", err);
  }
}


// === SHOTS MODAL ===
function setupManageShotsModal() {

  // students cannot use this functionality
  const user = JSON.parse(localStorage.getItem("user"));
  if (user && user.adminLevel !== "professor") {
      return;
  }
  
      

  const manageShotsBtn = document.getElementById("manageShots"); // Trigger button
  const modal = document.getElementById("manageShots-modal"); // Modal box
  const overlay = document.getElementById("manageShots-overlay"); // Background overlay
  const cancelBtn = document.getElementById("cancelShotsModal"); // Cancel button
  const addShotBtn = document.getElementById("addShotBtn"); // Add button
  const deleteShotBtn = document.getElementById("deleteShotBtn"); // Delete button


  // Open the modal and load existing shots
  manageShotsBtn.addEventListener("click", () => {
    modal.style.display = "block";
    overlay.style.display = "block";
    loadShots(); // Populate the select with current shot options
  });

  overlay.addEventListener("click", close);
  cancelBtn.addEventListener("click", close);

    // Close modal on overlay or cancel button click
  function close() {
    modal.style.display = "none";
    overlay.style.display = "none";
  }

    // Add a new shot option
  addShotBtn.addEventListener("click", async () => {
    const val = document.getElementById("newShotInput").value.trim();
    if (!val) return alert("Enter a shot to add.");
    try {
      const res = await fetch("/shots", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shot: val })
      });
      if (!res.ok) throw new Error(await res.text());
      document.getElementById("newShotInput").value = "";
      await loadShots();
    } catch (err) {
      console.error("Add shot failed:", err);
      alert("Could not add shot.");
    }
  });
  // Delete a selected shot option
  deleteShotBtn.addEventListener("click", async () => {
    const val = document.getElementById("shotSelect").value;
    if (!val) return alert("Pick a shot to delete.");
    if (!confirm(`Delete "${val}"?`)) return;

    try {
      const res = await fetch(`/shots/${encodeURIComponent(val)}`, {
        method: "DELETE"
      });
      if (!res.ok) throw new Error(await res.text());
      await loadShots();
    } catch (err) {
      console.error("Delete shot failed:", err);
      alert("Could not delete shot.");
    }
  });
}


// === FORMATS MODAL ===
// Set up the modal for managing "FORMAT" options
function setupManageFormatsModal() {

  // students cannot use this functionality
  const user = JSON.parse(localStorage.getItem("user"));
  if (user && user.adminLevel !== "professor") {
      return;
  }

  const manageFormatsBtn = document.getElementById("manageFormats");
  const modal = document.getElementById("manageFormats-modal");
  const overlay = document.getElementById("manageFormats-overlay");
  const cancelBtn = document.getElementById("cancelFormatsModal");
  const addFormatBtn = document.getElementById("addFormatBtn");
  const deleteFormatBtn = document.getElementById("deleteFormatBtn");

    // Open the modal and load existing formats
  manageFormatsBtn.addEventListener("click", () => {
    modal.style.display = "block";
    overlay.style.display = "block";
    loadFormats();
  });

    // Close modal on overlay or cancel button click
  overlay.addEventListener("click", close);
  cancelBtn.addEventListener("click", close);

  function close() {
    modal.style.display = "none";
    overlay.style.display = "none";
  }

    // Add a new format option
  addFormatBtn.addEventListener("click", async () => {
    const val = document.getElementById("newFormatInput").value.trim();
    if (!val) return alert("Enter a format to add.");
    try {
      const res = await fetch("/formats", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ format: val })
      });
      if (!res.ok) throw new Error(await res.text());
      document.getElementById("newFormatInput").value = "";
      await loadFormats();
    } catch (err) {
      console.error("Add format failed:", err);
      alert("Could not add format.");
    }
  });
  // Delete a selected format option
  deleteFormatBtn.addEventListener("click", async () => {
    const val = document.getElementById("formatSelect").value;
    if (!val) return alert("Pick a format to delete.");
    if (!confirm(`Delete "${val}"?`)) return;
    try {
      const res = await fetch(`/formats/${encodeURIComponent(val)}`, {
        method: "DELETE"
      });
      if (!res.ok) throw new Error(await res.text());
      await loadFormats();
    } catch (err) {
      console.error("Delete format failed:", err);
      alert("Could not delete format.");
    }
  });
}


// === DOM READY INITIALIZATION ===
document.addEventListener("DOMContentLoaded", () => {

  // dont show buttons to students 
  const user = JSON.parse(localStorage.getItem("user"));
  if (user && user.adminLevel !== "professor") {
    document.getElementById("manageShots").style.display = "none";
    document.getElementById("manageFormats").style.display = "none";
  }

  

  // Handle Directory/Archive tab toggling
  const dirTab   = document.getElementById("directory-tab");
  const archTab  = document.getElementById("archive-tab");
  const dirView  = document.getElementById("directory-view");
  const archView = document.getElementById("archive-view");

  // Switch to directory tab
  dirTab.addEventListener("click", () => {
    active = true;
    dirView.style.display = "block";
    archView.style.display = "none";
    dirTab.classList.add("active");
    archTab.classList.remove("active");
    getDirectory();
  });

  // Switch to archive tab
  archTab.addEventListener("click", () => {
    active = false;
    dirView.style.display = "none";
    archView.style.display = "block";
    archTab.classList.add("active");
    dirTab.classList.remove("active");
    getArchive();
  });

  dirTab.click(); // Default tab

  // Modal setups
  setupManageShotsModal();
  setupManageFormatsModal();

  // Initial data load
  getDirectory();
  setupAddFolderForm();
  loadFormats();
  loadShots();
  getScriptTags();
  resetScriptBox();
  getTemplates();
});