/*function loadFiles() {
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

document.addEventListener("DOMContentLoaded", loadFiles); */

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

  
  
  






