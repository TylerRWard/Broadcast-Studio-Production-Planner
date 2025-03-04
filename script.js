function showLogin(role) {
    document.getElementById("login-title").innerText = "Sign in"; // Match the image text
    document.getElementById("login").style.display = "block";
}

function submitLogin() {
    const username = document.getElementById("username").value.trim(); // Trim whitespace
    const password = document.getElementById("password").value.trim(); // Trim whitespace
    
    // Enforce exact credentials: "admin" for username and "password" for password
    if (username === "admin" && password === "password") {
        // Redirect to home.html on successful login
        window.location.href = "home.html";
    } else {
        // Show an error message for incorrect credentials
        alert("Incorrect username or password. Please try again If you forgot your password click forgot password.");
        // Clear the input fields after an incorrect attempt
        document.getElementById("username").value = "";
        document.getElementById("password").value = "";
    }
}

// Ensure the login form is hidden by default when the page loads
document.addEventListener("DOMContentLoaded", function() {
    document.getElementById("login").style.display = "none";
});