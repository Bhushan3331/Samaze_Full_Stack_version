(() => {

    const BASE_URL = "http://localhost:5000";
    // Load Bookmarks
    async function loadBookmarks() {
        const middlePanel = document.getElementById("bookmarkMiddle");
        if (!middlePanel) return;

        middlePanel.innerHTML =
            "<p style='text-align:center; margin-top:50px;'>Loading bookmarks...</p>";

        const token = localStorage.getItem("token");

        if (!token) {
            window.location.href = "signup.html";
            return;
        }

        try {
            const res = await fetch(`${BASE_URL}/api/posts/bookmarks`, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });

            if (!res.ok) {
                throw new Error(`Server error: ${res.status}`);
            }

            const bookmarks = await res.json();

            middlePanel.innerHTML = "";

            if (!bookmarks || bookmarks.length === 0) {
                middlePanel.innerHTML =
                    "<p style='text-align:center;'>You have no bookmarks yet!</p>";
                return;
            }

            bookmarks.forEach(post => {
                const postEl = document.createElement("div");
                postEl.classList.add("post");
                postEl.style.border = "1px solid #ccc";
                postEl.style.padding = "10px";
                postEl.style.marginBottom = "10px";

                const imageHTML = post.image
                    ? `<img src="${BASE_URL}${post.image}" class="post-image" />`
                    : "";

               postEl.innerHTML = `
                    <div class="post-header">
                        <img 
                            src="${post.author?.profileImage ? BASE_URL + post.author.profileImage : 'https://via.placeholder.com/48'}" 
                            class="post-avatar"
                        >
                        <div>
                            <strong>${post.author?.username || "Unknown"}</strong>
                            <p>${new Date(post.createdAt).toLocaleString()}</p>
                        </div>
                    </div>

                    <div class="post-text">
                        <h3>${post.title || ""}</h3>
                        <p>${post.content || ""}</p>
                    </div>

                    ${post.image ? `<img src="${BASE_URL}${post.image}" class="post-image">` : ""}

                    <div class="post-actions">
                        <span onclick="openPost('${post._id}')">💬 Comment</span>
                        <span onclick="toggleBookmark('${post._id}')">❌ Remove</span>
                    </div>
                `;

                middlePanel.appendChild(postEl);
            });

        } catch (err) {
            console.error("Bookmark Load Error:", err);
            middlePanel.innerHTML =
                "<p style='text-align:center; color:red;'>Failed to load bookmarks.</p>";
        }
    }

    // ==========================
    // Open Post
    // ==========================
    function openPost(postId) {
        localStorage.setItem("viewPostId", postId);
        console.log("Single post view coming soon for:", postId);
    }

    // ==========================
    // Toggle Bookmark
    // ==========================
    async function toggleBookmark(postId) {
        const token = localStorage.getItem("token");
        if (!token) return;

        try {
            const res = await fetch(`${BASE_URL}/api/posts/toggle`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ postId })
            });

            if (!res.ok) {
                throw new Error(`Toggle failed: ${res.status}`);
            }

            // Reload bookmarks after removal
            loadBookmarks();

        } catch (err) {
            console.error("Toggle Bookmark Error:", err);
            alert("Error updating bookmark");
        }
    }

    // ==========================
    // Expose Globally
    // ==========================
    window.loadBookmarks = loadBookmarks;
    window.openPost = openPost;
    window.toggleBookmark = toggleBookmark;


})();