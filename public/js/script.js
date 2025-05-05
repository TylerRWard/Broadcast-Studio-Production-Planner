// Submit login
async function submitLogin() {
    const username = document.getElementById("username").value.trim();
    const password = document.getElementById("password").value.trim();

    if (!username || !password) {
        alert("Please enter both username and password");
        return;
    }

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
            console.log("Login successful, redirecting...");
            // Optional: Store user data if needed for frontend
            localStorage.setItem("user", JSON.stringify(data.user));
            window.location.href = "/home.html"; // Single redirect for all users
        } else {
            console.log("Login failed:", data.message);
            alert(data.message || "Incorrect username or password. Please try again.");
            document.getElementById("password").value = ""; // Clear password only
        }
    } catch (error) {
        console.error("Login error:", error);
        alert("An error occurred during login. Please try again.");
    }
}