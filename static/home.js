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
  // Get the container for the folder list
  const container = document.getElementById("folderList");
  container.innerHTML = ""; // Clear any existing content

  // Group shows by folder_topic (folder name)
  const groups = rows.reduce((acc, { folder_topic, show_name }) => {
    if (!acc[folder_topic]) acc[folder_topic] = [];
    if (show_name) acc[folder_topic].push(show_name);
    return acc;
  }, {});

  // Loop through each folder group
  Object.entries(groups).forEach(([folder, shows]) => {
    const details = document.createElement("details");
    const summary = document.createElement("summary");

    // Folder title in <summary>
    const title = document.createElement("span");
    title.textContent = folder;
    summary.appendChild(title);
    details.appendChild(summary);

    // Container for folder contents (show list + add show UI)
    const folderContent = document.createElement("div");
    folderContent.classList.add("folder-content");

    // If shows exist in folder, render them as list
    if (shows.length) {
      const ul = document.createElement("ul");
      shows.forEach(name => {
        const li = document.createElement("li");
        li.textContent = name;

        // Apply smaller font and styling
        li.style.cursor = "pointer";
        li.style.fontSize = "0.9rem"; // Slightly smaller text
        li.style.fontFamily = "Arial, sans-serif";
        li.style.padding = "4px 0";

        // Click event for show
        li.addEventListener("click", () => {
          console.log(`Show clicked: "${name}" ${folder}`);
          getDetailsRundown(name, folder, active, template_version);
        });

        ul.appendChild(li);
      });
      folderContent.appendChild(ul);
    } else {
      // Display message if no shows in folder
      const p = document.createElement("p");
      p.textContent = "No shows available";
      folderContent.appendChild(p);
    }

    // --- ADD SHOW BUTTON AND FORM ---

    // Button to trigger adding a show
    const addShowBtn = document.createElement("button");
    addShowBtn.textContent = "Add a Show";
    addShowBtn.classList.add("add-btn");
    folderContent.appendChild(addShowBtn);

    // Form to enter show name + date
    const addShowForm = document.createElement("form");
    addShowForm.style.display = "none";
    addShowForm.classList.add("add-show-form");

    // Show name input
    const showNameInput = document.createElement("input");
    showNameInput.type = "text";
    showNameInput.placeholder = "Show name";
    showNameInput.required = true;

    // Show date input (calendar)
    const showDateInput = document.createElement("input");
    showDateInput.type = "date";
    showDateInput.required = true;

    // Submit button
    const submitBtn = document.createElement("button");
    submitBtn.type = "submit";
    submitBtn.textContent = "Submit";

    // Assemble form
    addShowForm.appendChild(showNameInput);
    addShowForm.appendChild(showDateInput);
    addShowForm.appendChild(submitBtn);

    // Toggle form on button click
    addShowBtn.addEventListener("click", (e) => {
      e.stopPropagation(); // Prevent closing the details tag
      addShowForm.style.display = addShowForm.style.display === "none" ? "flex" : "none";
    });

    // Handle form submission
    addShowForm.addEventListener("submit", async (e) => {
      e.preventDefault(); // Stop page reload

      const showName = showNameInput.value.trim();
      const showDate = showDateInput.value;

      if (!showName || !showDate) {
        alert("Both Show Name and Date are required.");
        return;
      }

      // Log new show data
      console.log(`📦 Adding show to "${folder}"`);
      console.log(`Show Name: ${showName}`);
      console.log(`Show Date: ${showDate}`);

      // Clear and hide form
      showNameInput.value = "";
      showDateInput.value = "";
      addShowForm.style.display = "none";

      // NOTE: Add code to send this to the backend if needed
    });

    folderContent.appendChild(addShowForm); // Add form to folder
    details.appendChild(folderContent);     // Add content to folder
    container.appendChild(details);         // Add folder to container
  });

  // --- FUNCTION TO FETCH DETAILS OF A SHOW ---

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

  // --- ADD FOLDER SECTION ---

  // Button to show/hide add-folder form
  const addFolderBtn = document.createElement("button");
  addFolderBtn.textContent = "Add a folder";
  addFolderBtn.classList.add("add-folder-btn");

  // Folder input form
  const addForm = document.createElement("form");
  addForm.classList.add("add-folder-form");
  addForm.style.display = "none";

  // Input field for folder name
  const input = document.createElement("input");
  input.type = "text";
  input.placeholder = "Enter folder name";
  input.required = true;

  // Submit button
  const submit = document.createElement("button");
  submit.type = "submit";
  submit.textContent = "Submit";

  // Assemble folder form
  addForm.appendChild(input);
  addForm.appendChild(submit);

  // Toggle form on button click
  addFolderBtn.addEventListener("click", () => {
    addForm.style.display = addForm.style.display === "none" ? "flex" : "none";
  });

  // Handle new folder submission
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
        // NOTE: Refresh folder list here if needed
      } else {
        console.error("Error adding folder:", data.error);
      }
    } catch (err) {
      console.error("Request failed:", err);
    }

    input.value = "";
    addForm.style.display = "none";
  });

  // Add folder UI to the container
  container.appendChild(addFolderBtn);
  container.appendChild(addForm);
}
  
  
  
  document.addEventListener("DOMContentLoaded", getDirectory);
  
  
  






