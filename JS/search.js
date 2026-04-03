function initSearchPage() {

    const token = localStorage.getItem("token");
    const userRaw = localStorage.getItem("user");

    if (!token || !userRaw) {
        window.location.href = "signup.html";
    }

    const currentUser = JSON.parse(userRaw);

    const searchInput = document.getElementById("searchInput");
    const searchResults = document.getElementById("searchResults");
    const searchEmpty = document.getElementById("searchEmpty");

    // -------------------------
    // Helper: Load SPA page
    // -------------------------
    function loadPage(path, scripts = []) {
        const mainContent = document.getElementById("mainContent");
        fetch(path)
            .then(res => res.text())
            .then(html => {
                mainContent.innerHTML = html;
                scripts.forEach(src => {
                    const script = document.createElement("script");
                    script.src = src;
                    mainContent.appendChild(script);
                });
            })
            .catch(err => console.error("Failed to load page:", err));
    }

    // -------------------------
    // Search Input Handler
    // -------------------------
    if (searchInput) {
        searchInput.addEventListener("input", async () => {
            const query = searchInput.value.trim();
            if (!query) {
                searchResults.innerHTML = "";
                searchEmpty.style.display = "block";
                return;
            } else {
                searchEmpty.style.display = "none";
            }

            // Determine toggle: Users or Posts
            const activeToggle = document.querySelector(".search-toggle .toggle-btn.active");
            const searchType = activeToggle ? activeToggle.id : "toggleUsers";

            if (searchType === "toggleUsers") {
                await searchUsers(query);
            } else if (searchType === "togglePosts") {
                await searchPosts(query);
            }
        });
    }

    // -------------------------
    // Search Users
    // -------------------------
    async function searchUsers(query) {
        try {
            const res = await fetch(`http://localhost:5000/api/users/search?q=${encodeURIComponent(query)}`, {
                headers: { "Authorization": "Bearer " + token }
            });
            const data = await res.json();
            const users = Array.isArray(data) ? data : [];

            searchResults.innerHTML = "";
            if (!users || users.length === 0) {
                searchResults.innerHTML = "<p>No users found 😓</p>";
                return;
            }

            users.forEach(user => {
                const div = document.createElement("div");
                div.className = "search-user";
                div.style = "padding:8px; border-bottom:1px solid #ccc; cursor:pointer;";
                div.innerHTML = `<b>${user.username}</b> @${user.handle}`;

                // --- NEW: Open user profile on click ---

                div.onclick = () => {
                    openProfile(user._id); // saves viewUserId and fully navigates to profile.html
                };


                searchResults.appendChild(div);
            });

        } catch (err) {
            console.error("Search users failed:", err);
            searchResults.innerHTML = "<p>Failed to search users 😓</p>";
        }
    }

    // -------------------------
    // Search Posts (Future Implementation)
    // -------------------------
    async function searchPosts(query) {
        try {
            // TODO: Implement API call for posts search
            searchResults.innerHTML = "<p>Post search coming soon 🚀</p>";
        } catch (err) {
            console.error("Search posts failed:", err);
            searchResults.innerHTML = "<p>Failed to search posts 😓</p>";
        }
    }

    // -------------------------
    // Users / Posts Toggle
    // -------------------------
    const toggleBtns = document.querySelectorAll(".search-toggle .toggle-btn");
    toggleBtns.forEach(btn => {
        btn.addEventListener("click", () => {
            toggleBtns.forEach(b => b.classList.remove("active"));
            btn.classList.add("active");

            // Trigger search again if input exists
            const query = searchInput.value.trim();
            if (query) searchInput.dispatchEvent(new Event("input"));
        });
    });

function openProfile(userId) {
    localStorage.setItem("viewUserId", userId);

    const mainContent = document.getElementById("mainContent");

    fetch("Pages/profile.html")
        .then(res => res.text())
        .then(html => {
            mainContent.innerHTML = html;

            // Load profile.js dynamically
            const script = document.createElement("script");
            script.src = "/js/profile.js";
            script.onload = () => {
                if (window.initProfilePage) window.initProfilePage();
            };
            mainContent.appendChild(script);

            // Remove any extra styling that breaks the profile layout
            mainContent.style.display = "";
            mainContent.style.justifyContent = "";
            mainContent.style.alignItems = "";
            mainContent.style.minHeight = "";
        })
        .catch(err => console.error("Failed to load profile page:", err));
}

window.openProfile = openProfile;

}