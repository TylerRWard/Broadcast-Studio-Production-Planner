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
    container.innerHTML = ""; // Clear previous content
  
    const groups = rows.reduce((acc, { folder_topic, show_name }) => {
      if (!acc[folder_topic]) acc[folder_topic] = [];
      if (show_name) acc[folder_topic].push(show_name);
      return acc;
    }, {});
  
    // Render each folder group
    Object.entries(groups).forEach(([folder, shows]) => {
      const details = document.createElement("details");
      const summary = document.createElement("summary");
  
      // Folder name
      const title = document.createElement("span");
      title.textContent = folder;
      summary.appendChild(title);
  
      // Add button for each folder
      const addBtn = document.createElement("button");
      addBtn.type = "button";
      addBtn.classList.add("add-btn");
      addBtn.setAttribute("aria-label", "Add to folder");
      addBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        console.log(`Add button clicked for folder: "${folder}"`);
      });
  
      summary.appendChild(addBtn);
      details.appendChild(summary);
  
      // Show list
      if (shows.length) {
        const ul = document.createElement("ul");
        shows.forEach(name => {
          const li = document.createElement("li");
          li.textContent = name;
          li.style.cursor = "pointer";
  
          li.addEventListener("click", () => {
            console.log(`Show clicked: "${name}" ${folder}`);
            getDetailsRundown(name, folder, active, template_version);
          });
  
          ul.appendChild(li);
        });
        details.appendChild(ul);
      } else {
        const p = document.createElement("p");
        p.textContent = "No shows available";
        details.appendChild(p);
      }
  
      container.appendChild(details);
    });
  

    // Fetch the details of selected rundown.
    async function getDetailsRundown(name, folder, active, template_version) {

      const params = new URLSearchParams({
        show_name: name,
        folder: folder,
        active: active,
        template_version: template_version
      });

      try {
        const response = await fetch(`http://localhost:3000/get-details-rundown?${params.toString()}`, {
          method: "GET",
          headers: {
              "Content-Type": "application/json",
          },
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

    // --- ADD FOLDER UI ---
  
    // Add folder button
    const addFolderBtn = document.createElement("button");
    addFolderBtn.textContent = "Add a folder";
    addFolderBtn.classList.add("add-folder-btn");
  
    // Add folder form (initially hidden)
    const addForm = document.createElement("form");
    addForm.classList.add("add-folder-form");
    addForm.style.display = "none";
  
    const input = document.createElement("input");
    input.type = "text";
    input.placeholder = "Enter folder name";
    input.required = true;
  
    const submit = document.createElement("button");
    submit.type = "submit";
    submit.textContent = "Submit";
  
    addForm.appendChild(input);
    addForm.appendChild(submit);
  
    // Show form when button clicked
    addFolderBtn.addEventListener("click", () => {
      addForm.style.display = addForm.style.display === "none" ? "flex" : "none";
    });
  
    // Handle form submission
    addForm.addEventListener("submit", async (e) => {
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
          // You would usually want to refresh the folder list here, e.g. by refetching from the server
        } else {
          console.error("Error adding folder:", data.error);
        }
      } catch (err) {
        console.error("Request failed:", err);
      }
  
      input.value = "";
      addForm.style.display = "none";
    });
  
    // Append form + button to container
    container.appendChild(addFolderBtn);
    container.appendChild(addForm);
  }
  
  
  
  document.addEventListener("DOMContentLoaded", getDirectory);
  
  
  






