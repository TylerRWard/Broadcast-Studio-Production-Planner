document.addEventListener("DOMContentLoaded", () => {
    // Add User Form
    const addForm = document.getElementById("add-user-form");
    if (addForm) {
        addForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            const name = document.getElementById("add-name").value;
            const email = document.getElementById("add-email").value;
            const password = document.getElementById("add-password").value;
            const userLevel = document.getElementById("add-user-level").value;

            try {
                const response = await fetch("/register", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ name, password, email, userLevel })
                });
                const data = await response.json();
                if (response.ok) {
                    alert("User added successfully!");
                    addForm.reset();
                } else {
                    alert(data.message || "Failed to add user");
                }
            } catch (error) {
                console.error("Add user error:", error);
                alert("An error occurred while adding the user");
            }
        });
    }

    // Delete User Form
    const deleteForm = document.getElementById("delete-user-form");
    if (deleteForm) {
        deleteForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            const email = document.getElementById("delete-email").value.trim();

            if (!email) {
                alert("Please enter an email address");
                return;
            }

            const confirmDelete = window.confirm(`Are you sure you want to delete the user with email: ${email}?`);
            console.log("Confirmation dialog shown, response:", confirmDelete);

            if (!confirmDelete) {
                console.log(`Deletion cancelled for ${email}`);
                return;
            }

            try {
                console.log(`Attempting to delete user: ${email}`);
                const response = await fetch("/delete-user", {
                    method: "DELETE",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ email })
                });
                const data = await response.json();
                if (response.ok) {
                    console.log(`User with email ${email} successfully removed from database`);
                    alert("User deleted successfully!");
                    deleteForm.reset();
                } else {
                    alert(data.message || "Failed to delete user");
                }
            } catch (error) {
                console.error("Delete user error:", error);
                alert("An error occurred while deleting the user");
            }
        });
        console.log("Delete user form listener successfully attached");
    } else {
        console.error("Error: delete-user-form not found");
    }

    // Change Password Form
    const changeForm = document.getElementById("change-password-form");
    if (changeForm) {
        changeForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            const email = document.getElementById("change-email").value;
            const newPassword = document.getElementById("change-password").value;
            const confirmPassword = document.getElementById("confirm-password").value;

            if (newPassword !== confirmPassword) {
                alert("Passwords do not match!");
                return;
            }

            try {
                const response = await fetch("/change-password", {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ email, newPassword })
                });
                const data = await response.json();
                if (response.ok) {
                    alert("Password changed successfully!");
                    changeForm.reset();
                } else {
                    alert(data.message || "Failed to change password");
                }
            } catch (error) {
                console.error("Change password error:", error);
                alert("An error occurred while changing the password");
            }
        });
    }
});