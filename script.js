//js implementation

/*
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
    if(role === "professor"){
        loginTitle.innerText = "Professor Login";
    } else if(role === "student"){
        loginTitle.innerText = "Student Sign In";
    }
    loginContainer.classList.add("active");
    loginContainer.style.display = "block"; // Fallback
}


*/




// script.js
async function submitLogin() {
    const username = document.getElementById("username").value;
    const password = document.getElementById("password").value;

    try {
        const response = await fetch("/login", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ username, password })
        });

        const data = await response.json();
        
        if (response.ok) {
            // Store user info in localStorage or sessionStorage
            localStorage.setItem("user", JSON.stringify(data.user));
            // Redirect based on role
            if (data.user.role === "professor") {
                window.location.href = "/professor-dashboard.html";//if we want any differences
            } else {
                window.location.href = "/student-dashboard.html";
            }
        } else {
            alert(data.message || "Login failed");
        }
    } catch (error) {
        console.error("Login error:", error);
        alert("An error occurred during login");
    }
}

// Add event listeners for login buttons
document.getElementById("professor-btn").addEventListener("click", () => {
    document.getElementById("login-title").textContent = "Professor Sign in";
    document.getElementById("login").style.display = "block";
});

document.getElementById("student-btn").addEventListener("click", () => {
    document.getElementById("login-title").textContent = "Student Sign in";
    document.getElementById("login").style.display = "block";
});