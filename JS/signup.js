// REDIRECT IF ALREADY LOGGED IN
const token = localStorage.getItem("token");

if (token) {
    window.location.replace("home.html");
}
// AUTH PAGE LOGIC
document.addEventListener("DOMContentLoaded", function () {

    const signupForm = document.getElementById("signupForm");
    const loginForm = document.getElementById("loginForm");
    // ================= SIGNUP =================
    if (signupForm) {
        signupForm.addEventListener("submit", async function (e) {
            e.preventDefault();

            const username = document.getElementById("signupUsername").value.trim();
            const email = document.getElementById("signupEmail").value.trim();
            const password = document.getElementById("signupPassword").value.trim();

            try {
                const res = await fetch("http://localhost:5000/api/auth/signup", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({ username, email, password })
                });

                const data = await res.json();

                if (!data.success) {
                    alert(data.message);
                    return;
                }
                alert("Signup successful! Please login.");
                // Reset to login view
                signupForm.reset();
                document.getElementById("showLogin").click();

            } catch (err) {
                console.error(err);
                alert("Signup failed");
            }
        });
    }
    // ================= LOGIN =================
    if (loginForm) {
        loginForm.addEventListener("submit", async function (e) {
            e.preventDefault();

            const email = document.getElementById("loginEmail").value.trim();
            const password = document.getElementById("loginPassword").value.trim();
            try {
                const res = await fetch("http://localhost:5000/api/auth/login", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({ email, password })
                });

                const data = await res.json();

                if (!data.success) {
                    alert(data.message);
                    return;
                }
                // SAVE TOKEN
                localStorage.setItem("token", data.token);

                if (data.user) {
                    localStorage.setItem("user", JSON.stringify(data.user));
                }

                alert("Login successful!");
                // Redirect safely
                window.location.replace("home.html");
            } catch (err) {
                console.error(err);
                alert("Login failed");
            }
        });
    }
});