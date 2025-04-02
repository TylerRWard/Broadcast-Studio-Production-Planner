document.getElementById("register-form").addEventListener("submit", async (e) => {
    e.preventDefault();

    const name = document.getElementById("reg-name").value;
    const email = document.getElementById("reg-email").value;
    const password = document.getElementById("reg-password").value;
    const userLevel = document.getElementById("reg-user-level").value;

    try {
        const response = await fetch("/register", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ name, password, email, userLevel })
        });

        const data = await response.json();

        if (response.ok) {
            alert("Registration successful! Please login.");
            window.location.href = "/index.html";
        } else {
            alert(data.message || "Registration failed");
        }
    } catch (error) {
        console.error("Registration error:", error);
        alert("An error occurred during registration");
    }
});