// Get elements
const profBtn = document.getElementById("professor-btn");
const studBtn = document.getElementById("student-btn");
const loginContainer = document.getElementById("login");
const loginTitle = document.getElementById("login-title");

// Hide login form on page load
document.addEventListener("DOMContentLoaded", function() {
    loginContainer.style.display = "none";
});

// Click handlers: Shrink both buttons, then show form
profBtn.addEventListener("click", function() {
    profBtn.classList.add("shrunk");
    studBtn.classList.add("shrunk");
    setTimeout(() => showLogin("professor"), 300); // Delay matches transition
});

studBtn.addEventListener("click", function() {
    profBtn.classList.add("shrunk");
    studBtn.classList.add("shrunk");
    setTimeout(() => showLogin("student"), 300); // Delay matches transition
});

// Show login form
function showLogin(role) {
    loginTitle.innerText = "Sign in";
    loginContainer.classList.add("active");
    loginContainer.style.display = "block"; // Fallback
}

// Submit login
function submitLogin() {
    const username = document.getElementById("username").value.trim();
    const password = document.getElementById("password").value.trim();
    
    if (username === "admin" && password === "password") {
        window.location.href = "home.html";
    } else {
        alert("Incorrect username or password. Please try again. If you forgot your password, click forgot password.");
        document.getElementById("username").value = "";
        document.getElementById("password").value = "";
    }
}