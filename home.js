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