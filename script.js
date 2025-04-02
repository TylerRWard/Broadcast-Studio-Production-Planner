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
    if (role === "professor") {
        loginTitle.innerText = "Professor Sign In"; // Updated to "Sign In" for consistency
    } else if (role === "student") {
        loginTitle.innerText = "Student Sign In";
    }
    loginContainer.classList.add("active");
    loginContainer.style.display = "block"; // Fallback
}

// Submit login
async function submitLogin() {
    console.log("submitLogin function called"); // Debug
    
    const email = document.getElementById("email").value.trim(); // Changed to email
    const password = document.getElementById("password").value.trim();

    console.log("Frontend - Email:", email); // Debug
    console.log("Frontend - Password:", password);

    if (!email || !password) {
        alert("Please enter both email and password");
        return;
    }

    try {
        const response = await fetch("/login", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();
        
        if (response.ok) {
            console.log("Login successful, redirecting...");
            localStorage.setItem("user", JSON.stringify(data.user));
            if (data.user.userLevel === "professor") {
                window.location.href = "/professor-dashboard.html";
            } else {
                window.location.href = "/student-dashboard.html";
            }
        } else {
            console.log("Login failed:", data.message);
            alert(data.message || "Incorrect email or password. Please try again.");
            document.getElementById("email").value = "";
            document.getElementById("password").value = "";
        }
    } catch (error) {
        console.error("Login error:", error);
        alert("An error occurred during login. Please try again.");
    }
}