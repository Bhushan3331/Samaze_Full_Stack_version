// BLOCK BACK BUTTON
document.addEventListener("DOMContentLoaded", () => {

    history.pushState(null, null, location.href);

    window.addEventListener("popstate", () => {

        const token = localStorage.getItem("token");

        if (token) {
            history.pushState(null, null, location.href);
            showSuccess("You are logged in. Please logout first if you want to go back.");
        }

    });

});

// Success Message Modal

function showSuccess(message) {

    const modal = document.getElementById("successModal");
    const text = document.getElementById("successMessage");

    text.innerText = message;

    modal.style.display = "flex";

}

const successOk = document.getElementById("successOk");

if (successOk) {
    successOk.onclick = () => {
        document.getElementById("successModal").style.display = "none";
    };
}

// Backend Base URL 

const BASE_URL = "http://localhost:5000"; 

// SPA Initialization
const token = localStorage.getItem("token");
const userRaw = localStorage.getItem("user");
if (!token || !userRaw) window.location.replace("signup.html");
// initAdminSidebar();
let currentUser;
try {
    currentUser = JSON.parse(userRaw);
} catch {
    localStorage.clear();
    window.location.replace("signup.html");
}

try {
    currentUser = JSON.parse(localStorage.getItem("user"));
} catch {
    localStorage.clear();
    window.location.replace("signup.html");
}

// --------------------------
// ADMIN SIDEBAR INIT (SPA-SAFE)
// --------------------------
function initAdminSidebar() {
    const userRaw = localStorage.getItem("user");
    if (!userRaw) {
        console.log("No user found in localStorage"); 
        return;
    }

    let currentUser;
    try {
        currentUser = JSON.parse(userRaw);
        console.log("Current User:", currentUser); 
    } catch (err) {
        console.error("Error parsing user:", err);
        localStorage.clear();
        window.location.replace("signup.html");
        return;
    }

    // Check role
    if (!currentUser.role) {
        console.log("User role missing"); 
        return;
    }

    if (currentUser.role.toLowerCase() !== "admin") {
        console.log("User is not admin"); 
        return;
    }

    const menu = document.querySelector(".sidebar .menu");
    if (!menu) {
        console.log("Sidebar menu element not found"); 
        return;
    }

    if (document.getElementById("sidebar-admin")) {
        console.log("Admin button already exists"); 
        return;
    }

    console.log("Adding admin dashboard button"); 
    const li = document.createElement("li");
    li.id = "sidebar-admin";
    li.classList.add("sidebar-link");
    li.innerText = "📊 Admin Dashboard";

    const logoutLi = document.getElementById("logout");
    menu.insertBefore(li, logoutLi);

    li.addEventListener("click", () => {
        console.log("Admin dashboard clicked"); 
        resetSidebarActive();
        li.classList.add("active");
        const mainContent = document.getElementById("mainContent");
        if (!mainContent) return;

        mainContent.innerHTML = "<p style='text-align:center;'>Loading Admin Dashboard...</p>";

        fetch("Pages/admin.html")
            .then(res => res.ok ? res.text() : Promise.reject("Failed to load admin page"))
            .then(html => {
                mainContent.innerHTML = html;

                const existingScript = document.getElementById("adminScript");
                if (existingScript) existingScript.remove();

                const script = document.createElement("script");
                script.id = "adminScript";
                script.src = "/JS/admin.js";
                document.body.appendChild(script);
            })
            .catch(err => {
                console.error("Admin page load error:", err);
                mainContent.innerHTML = "<p style='text-align:center;'>Failed to load admin page 😓</p>";
            });
    });
}

// Initialize sidebar after ensuring user exists
initAdminSidebar();

const currentUserId = currentUser._id || currentUser.id;
let isLoadingPosts = false;
// Store reported posts in this session
const reportedPosts = new Set();
// DOM Elements
const mainContent = document.getElementById("mainContent");
// const logoutBtn = document.getElementById("logout");
const postBtn = document.getElementById("sidebar-post");
const postModal = document.getElementById("postModal");
const closePostBtn = document.querySelector(".close-btn");
const postForm = document.getElementById("postForm");
const postImageInput = document.getElementById("postImage");
const imagePreview = document.getElementById("imagePreview");
let homeContainer = document.getElementById("homePostsContainer");
const profileSidebar = document.getElementById("sidebar-profile");
const searchSidebar = document.getElementById("sidebar-search");
const reportModal = document.getElementById("reportModal");
const submitReportBtn = document.getElementById("submitReportBtn");
const cancelReportBtn = document.getElementById("cancelReportBtn");
// Image preview
if (postImageInput && imagePreview) {
    postImageInput.onchange = () => {

        const files = postImageInput.files;

        imagePreview.innerHTML = ""; // clear previous images

        if (files.length === 0) {
            imagePreview.style.display = "none";
            return;
        }

        imagePreview.style.display = "block";

        for (let i = 0; i < files.length; i++) {

            const img = document.createElement("img");
            img.src = URL.createObjectURL(files[i]);

            img.style.maxWidth = "100px";
            img.style.margin = "5px";
            img.style.borderRadius = "8px";

            imagePreview.appendChild(img);
        }
    };
}
// SPA Page Loader
function loadPage(path) {
    mainContent.innerHTML = "<p style='text-align:center;'>Loading...</p>";

    return fetch(path)
        .then(res => res.ok ? res.text() : Promise.reject("Page not found"))
        .then(html => {
            mainContent.innerHTML = html;

            if (path.includes("settings.html")) {
                initSettingsPage();
            }
        })
        .catch(err => {
            mainContent.innerHTML = "<p style='text-align:center;'>Failed to load page 😓</p>";
        });
}

function initSettingsPage() {

    const editProfileBtn = document.getElementById("editProfileBtn");
    const logoutBtn = document.getElementById("logoutBtn");

    if (editProfileBtn) {
        editProfileBtn.onclick = () => {
            loadProfile(currentUser._id, "settings");
        };
    }

    if (logoutBtn) {
        logoutBtn.onclick = () => {
            showConfirm(
                "Logout",
                "Do you really want to log out?",
                () => {
                    localStorage.clear();
                    window.location.replace("signup.html");
                }
            );
        };
    }

}
// Post Modal
if (postBtn) postBtn.onclick = e => { e.stopPropagation(); postModal.style.display = "flex"; };
if (closePostBtn) closePostBtn.onclick = () => postModal.style.display = "none";

window.addEventListener("click", function (event) {

    if (event.target === postModal) {
        postModal.style.display = "none";
    }

    if (reportModal && event.target === reportModal) {
        reportModal.style.display = "none";
    }

});
// Create Post
if (postForm) {
    postForm.onsubmit = async e => {
        e.preventDefault();

        const title = document.getElementById("postTitle").value.trim();
        const content = document.getElementById("postContent").value.trim();
        const imageFiles = postImageInput.files; 

        if (!title && !content && imageFiles.length === 0) {
            return alert("Post cannot be empty");
        }

        const formData = new FormData();
        formData.append("title", title);
        formData.append("content", content);

    
        for (let i = 0; i < imageFiles.length; i++) {
            formData.append("images", imageFiles[i]);
        }

        try {
            const res = await fetch(`${BASE_URL}/api/posts`, {
                method: "POST",
                headers: { "Authorization": "Bearer " + token },
                body: formData
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.message);

            postForm.reset();
            imagePreview.innerHTML = ""; 
            imagePreview.style.display = "none";
            postModal.style.display = "none";

            loadPosts();
        } catch (err) {
            alert(err.message);
        }
    };
}
// LOAD POSTS (Real-time Feed)
async function loadPosts() {
    if (isLoadingPosts) return;
    isLoadingPosts = true;

    if (!homeContainer) {
        isLoadingPosts = false;
        return;
    }

    try {
        const res = await fetch(`${BASE_URL}/api/posts`, {
            headers: { "Authorization": "Bearer " + token }
        });

        const data = await res.json();
        const posts = Array.isArray(data.posts) ? data.posts : [];

        homeContainer.innerHTML = "";

        if (!posts || posts.length === 0) {
            homeContainer.innerHTML = "<p style='text-align:center;'>No posts yet 🚀</p>";
            isLoadingPosts = false;
            return;
        }

        posts.forEach(post => {
            const div = document.createElement("div");
            div.className = "post-card";

            const authorId = post.author?._id || "unknown";
            const authorUsername = post.author?.username || "Anonymous";
            const authorHandle = post.author?.handle || "";
            const authorAvatar = post.author?.profileImage
                ? (post.author.profileImage.startsWith("http")
                    ? post.author.profileImage
                    : `${BASE_URL}${post.author.profileImage}`)
                : `${BASE_URL}/uploads/default-avatar.png`;

            const liked = post.likes?.includes(currentUserId);
            const bookmarked = post.bookmarks?.includes(currentUserId);
            const isOwner = post.author?._id === currentUserId;

            div.dataset.userid = authorId;
            div.dataset.postid = post._id;

            div.innerHTML = `
                <div class="post-header" style="cursor:pointer;">
                    <img src="${authorAvatar}" class="post-avatar">
                    <div class="post-user">
                        <span class="username">${authorUsername}</span>
                        <span class="handle">@${authorHandle}</span>
                    </div>
                </div>
                ${post.title ? `<h3>${post.title}</h3>` : ""}
                ${post.content ? `<p>${post.content}</p>` : ""}
                ${post.images && post.images.length > 0 
    ? post.images.map(img => `
        <img src="${img.startsWith("http") ? img : BASE_URL + img}" class="post-image">
    `).join("")
    : ""
}
                <div class="post-actions">
                    <button class="like-btn">${liked ? "❤️" : "🤍"} ${post.likes?.length || 0}</button>
                    <button class="comment-btn">💬 Comment</button>
                    <button class="bookmark-btn">${bookmarked ? "🔖 Saved" : "🔖 Save"}</button>
                    <button class="share-btn">📤 Share</button>
                    ${isOwner 
                        ? `<button class="delete-btn">🗑 Delete</button>` 
                        : `<button class="report-btn">🚩 Report</button>`}
                </div>
                <div class="comment-section" style="display:none;"></div>
            `;

            // Profile click
            div.querySelector(".post-header").onclick = () => {
                if (authorId !== "unknown") {
                    localStorage.setItem("viewUserId", authorId);
                    loadProfile(authorId, "profile");
                }
            };

            // Actions
            div.querySelector(".like-btn").onclick = () => likePost(post._id);
            div.querySelector(".bookmark-btn").onclick = () => bookmarkPost(post._id);
            div.querySelector(".comment-btn").onclick = () => toggleComments(post._id, div);

            // Share
            const shareBtn = div.querySelector(".share-btn");
            if (shareBtn) {
            shareBtn.onclick = () => {
                const postTitle = post.title || "No Title";
                const postContent = post.content || "Check out this interesting post!";
                const postUrl = window.location.href;

                const message = encodeURIComponent(
                    ` Hi! I found this post on SAMAZE that you might like:\n\n` +
                    ` Title: ${postTitle}\n` +
                    `${postContent}\n\n` +
                    ` View it here: ${postUrl}\n\n` +
                    `Enjoy! `
                );

        const whatsappUrl = `https://wa.me/?text=${message}`;
        window.open(whatsappUrl, "_blank");
    };
}

            // Report
            if (!isOwner) {
                const reportBtn = div.querySelector(".report-btn");
                if (reportBtn) reportBtn.onclick = () => reportPost(post._id);
            }

            // Delete
            if (isOwner) {
                const deleteBtn = div.querySelector(".delete-btn");
                if (deleteBtn) deleteBtn.onclick = () => deletePost(post._id);
            }

            homeContainer.appendChild(div);
        });

    } catch (err) {
        homeContainer.innerHTML = "<p style='text-align:center;'>Failed to load posts 😓</p>";
        console.error(err);
    }

    isLoadingPosts = false;
}

// Auto-load posts initially
loadPosts(); 
// LIKE / BOOKMARK / DELETE
async function likePost(postId) {
    try { await fetch(`${BASE_URL}/api/posts/${postId}/like`, { method: "PUT", headers: { "Authorization": "Bearer " + token } }); loadPosts(); }
    catch (err) { console.error(err); }
}
//Add BOokmark function
async function bookmarkPost(postId) {
    try {
        await fetch(`${BASE_URL}/api/posts/toggle`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": "Bearer " + token
            },
            body: JSON.stringify({ postId })
        });

        loadPosts();

    } catch (err) {
        console.error("Bookmark error:", err);
    }
}
// Delete Post Function
async function deletePost(postId) {

    showConfirm(
        "Delete Post",
        "Are you sure you want to delete this post?",
        async () => {

            try {

                const res = await fetch(`${BASE_URL}/api/posts/${postId}`, {
                    method: "DELETE",
                    headers: {
                        "Authorization": "Bearer " + token
                    }
                });

                const data = await res.json();

                if (!res.ok) {
                    alert(data.message || "Failed to delete post");
                    return;
                }

                loadPosts();

            } catch (err) {

                console.error(err);
                alert("Error deleting post");

            }

        }
    );
}
// Report Post Function
let reportPostId = null;

function reportPost(postId) {
    // Prevent duplicate report
    if (reportedPosts.has(postId)) {
    showSuccess("You already reported this post.");
    return;
    }

    reportPostId = postId;

    const modal = document.getElementById("reportModal");
    const textarea = document.getElementById("reportReason");

    textarea.value = "";

    modal.style.display = "flex";
}
if (submitReportBtn) {

    submitReportBtn.onclick = async () => {

        const reason = document.getElementById("reportReason").value.trim();

        if (!reason) {
            showSuccess("Please write a reason before submitting the report.");
            return;
        }
    
        try {

            const res = await fetch(`${BASE_URL}/api/posts/report-post`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": "Bearer " + token
                },
                body: JSON.stringify({
                    postId: reportPostId,
                    reason: reason
                })
            });

            const data = await res.json();

            if (!res.ok) {
                showSuccess(data.message || "Unable to report this post.");
                return;
            }
            // SUCCESS MESSAGE
            showSuccess("Thanks for reporting. Our team will review this post.");
            reportedPosts.add(reportPostId);
            document.getElementById("reportReason").value = "";
            document.getElementById("reportModal").style.display = "none";

        } catch (err) {

            console.error("Report error:", err);
            showSuccess("Server error. Please try again.");

        }

    };

}

if (cancelReportBtn) {

    cancelReportBtn.onclick = () => {
        document.getElementById("reportModal").style.display = "none";
    };

}

// COMMENTS
async function toggleComments(postId, postDiv) {
    const section = postDiv.querySelector(".comment-section");
    if (!section) return;

    // Toggle
    if (section.style.display === "block") {
        section.style.display = "none";
        return;
    }
    // Show section without clearing it yet
    section.style.display = "block";
    // Only load comments if empty

    if (!section.innerHTML.trim()) {
    await loadComments(postId, postDiv);
    }
}

// Helper to reload comments without toggling display
async function loadComments(postId, postDiv) {
    const section = postDiv.querySelector(".comment-section");
    if (!section || section.style.display === "none") return;

    section.innerHTML = "<p>Loading comments...</p>";

    try {
        const res = await fetch(`${BASE_URL}/api/posts/${postId}/comment`, {
            headers: { "Authorization": `Bearer ${token}` }
        });

        const comments = await res.json();
        section.innerHTML = ""; // clear old comments
        if (!Array.isArray(comments) || comments.length === 0) {
            section.innerHTML = "<p>No comments yet.</p>";
        } else {
            comments.forEach(c => {
                const div = document.createElement("div");
                div.className = "comment-item";
                div.innerHTML = `
                    <div class="comment-left">
                        <span class="comment-username">${c.user?.username || "Anonymous"}</span>
                        <span class="comment-text">${c.text}</span>
                    </div>
                    ${c.user?._id === currentUserId ? '<button class="comment-delete-btn">🗑</button>' : ''}
                `;
                // Delete button handler with confirmation
                const deleteBtn = div.querySelector(".comment-delete-btn");
                if (deleteBtn) {
                    deleteBtn.onclick = () => {
                        showConfirm(
                            "Delete Comment",
                            "Do you really want to delete this comment? This action cannot be undone.",
                            async () => {
                                try {
                                    await fetch(`${BASE_URL}/api/posts/${postId}/comment/${c._id}`, {
                                        method: "DELETE",
                                        headers: { "Authorization": `Bearer ${token}` }
                                    });
                                    await loadComments(postId, postDiv); // reload after delete
                                    showSuccess("Comment deleted successfully.");
                                } catch (err) {
                                    console.error(err);
                                    showSuccess("Failed to delete comment. Please try again.");
                                }
                            }
                        );
                    };
                }
                section.appendChild(div);
            });
        }
        // Add input box if missing
        if (!section.querySelector(".comment-input-box")) {
            const inputBox = document.createElement("div");
            inputBox.className = "comment-input-box";
            inputBox.innerHTML = `
                <input class="comment-input" placeholder="Write comment...">
                <button>Send</button>
            `;
            const input = inputBox.querySelector(".comment-input");
            inputBox.querySelector("button").onclick = async () => {
                if (!input.value.trim()) return;
                await fetch(`${BASE_URL}/api/posts/${postId}/comment`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
                    body: JSON.stringify({ text: input.value.trim() })
                });
                input.value = "";
                await loadComments(postId, postDiv); // reload safely
            };
            section.appendChild(inputBox);
        }

    } catch (err) {
        section.innerHTML = "<p>Failed to load comments</p>";
        console.error(err);
    }
}

// SPA LEFT SIDEBAR HANDLER
const sidebarItems = {
    home: document.getElementById("sidebar-home"),
    trending: document.getElementById("sidebar-trending"),
    notifications: document.getElementById("sidebar-notifications"),
    bookmark: document.getElementById("sidebar-bookmark"),
    settings: document.getElementById("sidebar-settings"),
    // post, logout, search, profile handled separately
};
// Helper: Reset active
function resetSidebarActive() {
    Object.values(sidebarItems).forEach(el => el && el.classList.remove("active"));
    if (searchSidebar) searchSidebar.classList.remove("active");
    if (profileSidebar) profileSidebar.classList.remove("active");
}
// Notifications toggle + load
const notifButton = document.getElementById("notifButton");
async function loadNotifications() {
    const panel = document.getElementById("notificationPanel");
    if (!panel) return;

    panel.innerHTML = "<p style='text-align:center;'>Loading...</p>";

    try {
        const res = await fetch(`${BASE_URL}/api/notifications`, {
            headers: { Authorization: `Bearer ${token}` }
        });

        const notifications = await res.json();

        panel.innerHTML = notifications.length
            ? notifications.map(n => `
                <div class="notif-item" data-post="${n.post ? n.post._id : ""}">
                    ${n.message || "New notification"}
                </div>
            `).join("")
            : "<p style='text-align:center;'>No notifications</p>";

    } catch (err) {
        panel.innerHTML = "<p style='text-align:center;'>Failed to load notifications</p>";
        console.error(err);
    }
}
// Notification click handler (event delegation)
document.addEventListener("click", function(e) {

    const notif = e.target.closest(".notif-item");

    if (!notif) return;

    const postId = notif.dataset.post;

    if (!postId) return;

    // Save post id
    localStorage.setItem("focusPostId", postId);

    // Go to home feed
    const homeBtn = document.getElementById("sidebar-home");
    if (homeBtn) homeBtn.click();

});

function toggleNotifications() {
    const panel = document.getElementById("notificationPanel");
    if (!panel) return;
    panel.style.display = panel.style.display === "block" ? "none" : "block";
}
// Attach click
if (notifButton) {
    notifButton.addEventListener("click", () => {
        toggleNotifications();
        loadNotifications();
    });
}
// Home
if (sidebarItems.home) {
    sidebarItems.home.addEventListener("click", () => {
        resetSidebarActive();
        sidebarItems.home.classList.add("active");
        mainContent.innerHTML = `<div id="homePostsContainer"></div>`;
        homeContainer = document.getElementById("homePostsContainer");
        loadPosts();
    });
}

// Sidebar Trending click
if (sidebarItems.trending) sidebarItems.trending.addEventListener("click", () => {

    resetSidebarActive();
    sidebarItems.trending.classList.add("active");

    loadPage("Pages/trending.html").then(() => {

        // If already loaded, just run
        if (window.loadTrendingPosts && window.renderPost) {

            window.loadTrendingPosts();
            return;

        }

        // Load renderer first
        const rendererScript = document.createElement("script");
        rendererScript.src = "JS/postRenderer.js";

        rendererScript.onload = () => {

            // After renderer loads, load trending.js
            const trendingScript = document.createElement("script");
            trendingScript.src = "JS/trending.js";

            trendingScript.onload = () => {

                if (window.loadTrendingPosts) {
                    window.loadTrendingPosts();
                }

            };

            document.head.appendChild(trendingScript);
        };
        document.head.appendChild(rendererScript);
    });

});

// Notifications click
if (sidebarItems.notifications) {
    sidebarItems.notifications.addEventListener("click", () => {

        resetSidebarActive();
        sidebarItems.notifications.classList.add("active");

        loadPage("Pages/notification.html").then(() => {

            // Load notification.js dynamically
            const script = document.createElement("script");
            script.src = "JS/notification.js";

            script.onload = () => {
                if (window.initNotificationsPage) {
                    window.initNotificationsPage();
                }
            };

            document.body.appendChild(script);

        });
    });
}

// Bookmark Sidebar Click
if (sidebarItems.bookmark) {
    sidebarItems.bookmark.addEventListener("click", () => {

        resetSidebarActive();
        sidebarItems.bookmark.classList.add("active");

        loadPage("Pages/bookmark.html").then(() => {

            if (!document.getElementById("bookmarkCSS")) {
                const link = document.createElement("link");
                link.rel = "stylesheet";
                link.href = "CSS/bookmark.css"; // adjust path if needed
                link.id = "bookmarkCSS";
                document.head.appendChild(link);
            }

            if (!document.getElementById("bookmarkScript")) {

                const script = document.createElement("script");
                script.src = "JS/bookmark.js";
                script.id = "bookmarkScript";

                script.onload = () => {
                    if (window.loadBookmarks) {
                        window.loadBookmarks();
                    }
                };

                document.body.appendChild(script);

            } else {
                if (window.loadBookmarks) {
                    window.loadBookmarks();
                }
            }
        });
    });
}

// Settings sidebar click
if (sidebarItems.settings) {
    sidebarItems.settings.addEventListener("click", () => {
        resetSidebarActive();
        sidebarItems.settings.classList.add("active");

        loadPage("Pages/settings.html").then(() => {
            // Attach Edit Profile click
            const editProfileBtn = document.getElementById("editProfileBtn");
            if (editProfileBtn) {
                editProfileBtn.addEventListener("click", () => loadProfile(currentUser._id, "settings"));
            }
            // Attach Log Out confirmation
            const logoutBtn = document.getElementById("logoutBtn");
            
            if (logoutBtn) {
                logoutBtn.addEventListener("click", (e) => {
                    e.preventDefault(); 

                        showConfirm(
                        "Logout",
                        "Do you really want to log out?",
                        () => {
                            localStorage.clear();
                            window.location.href = "signup.html";
                        }
                    );
                });
            }
            // Company Policy
            const companyPolicy = document.getElementById("companyPolicyLink");

            if (companyPolicy) {
                companyPolicy.addEventListener("click", (e) => {
                    e.preventDefault();
                    loadPage("Pages/company-policy.html");
                });
            }
            // Government Policy
            const governmentPolicy = document.getElementById("governmentPolicyLink");

            if (governmentPolicy) {
                governmentPolicy.addEventListener("click", (e) => {
                    e.preventDefault();
                    loadPage("Pages/government-policy.html");
                });
            }
        });
    });
}

// Profile click
if (profileSidebar) profileSidebar.addEventListener("click", () => {
    resetSidebarActive();
    profileSidebar.classList.add("active");
    localStorage.setItem("viewUserId", currentUser._id);

    fetch("Pages/profile.html")
        .then(res => res.text())
        .then(html => { 
            mainContent.innerHTML = html; 

            // Load profile.js
            const script = document.createElement("script"); 
            script.src = "JS/profile.js"; 
            script.onload = () => { 
                if(window.initProfilePage) window.initProfilePage(); 

                // Load follow.js after profile.js
                const followScript = document.createElement("script"); 
                followScript.src = "JS/follow.js"; 
                document.body.appendChild(followScript);
            }; 
            document.body.appendChild(script);
        })
        .catch(err => console.error("Failed to load profile:", err));
});

// Search click (SPA SAFE)
if (searchSidebar) {
    searchSidebar.addEventListener("click", async () => {

        resetSidebarActive();
        searchSidebar.classList.add("active");

        try {

            const res = await fetch("Pages/search.html");
            const html = await res.text();
            mainContent.innerHTML = html;

            // Load script only once
            if (!window.searchScriptLoaded) {

                const script = document.createElement("script");
                script.src = "JS/search.js";
                script.onload = () => {
                    window.searchScriptLoaded = true;

                    if (typeof initSearchPage === "function") {
                        initSearchPage();
                    }
                };

                document.body.appendChild(script);

            } else {

                // Script already loaded, just run init
                if (typeof initSearchPage === "function") {
                    initSearchPage();
                }

            }

        } catch (err) {

            console.error("Failed to load search:", err);

        }

    });
}

// SPA Profile Loader (DRY)
function loadProfile(userId = currentUser._id, highlightSidebar = "settings") {
    resetSidebarActive();

    // Highlight sidebar: 'settings' or 'profile' depending on caller
    if (highlightSidebar === "settings" && sidebarItems.settings) sidebarItems.settings.classList.add("active");
    if (highlightSidebar === "profile" && profileSidebar) profileSidebar.classList.add("active");

    localStorage.setItem("viewUserId", userId);

    fetch("Pages/profile.html")
        .then(res => res.text())
        .then(html => {
            mainContent.innerHTML = html;

            // Load profile.js dynamically
            const script = document.createElement("script");
            script.src = "JS/profile.js";
            script.onload = () => {
                if (window.initProfilePage) window.initProfilePage();

                // Load follow.js after profile.js
                const followScript = document.createElement("script");
                followScript.src = "JS/follow.js";
                document.body.appendChild(followScript);
            };
            document.body.appendChild(script);
        })
        .catch(err => console.error("Failed to load profile:", err));
}

// Sidebar Profile Click
if (profileSidebar) {
    profileSidebar.addEventListener("click", () => loadProfile(currentUser._id, "profile"));
}

// Settings → Edit Profile Click
const editProfileBtn = document.getElementById("editProfileBtn");
if (editProfileBtn) {
    editProfileBtn.addEventListener("click", () => loadProfile(currentUser._id, "settings"));
}

function showConfirm(title, message, callback){

    const modal = document.getElementById("confirmModal");
    const titleEl = document.getElementById("confirmTitle");
    const messageEl = document.getElementById("confirmMessage");
    const okBtn = document.getElementById("confirmOk");
    const cancelBtn = document.getElementById("confirmCancel");

    titleEl.textContent = title;
    messageEl.textContent = message;

    modal.style.display = "flex";

    okBtn.onclick = () => {
        modal.style.display = "none";
        callback();
    };

    cancelBtn.onclick = () => {
        modal.style.display = "none";
    };
}

// Logout


const sidebarLogoutBtn = document.getElementById("logout");
if (sidebarLogoutBtn) {
    sidebarLogoutBtn.addEventListener("click", (e) => {
        e.preventDefault();
        showConfirm("Logout", "Do you really want to log out?", () => {
            localStorage.clear();
            window.location.replace("signup.html");
        });
    });
}

// Handle post focus from notifications
const focusPostId = localStorage.getItem("focusPostId");

if (focusPostId) {

    setTimeout(() => {

        const post = document.querySelector(`[data-postid="${focusPostId}"]`);

        if (post) {

            // Scroll to post
            post.scrollIntoView({ behavior: "smooth", block: "center" });

            // Highlight post
            post.style.boxShadow = "0 0 10px #1da1f2";
            setTimeout(() => {
                post.style.boxShadow = "";
            }, 3000);

            // Open comments automatically
            const commentBtn = post.querySelector(".comment-btn");
            if (commentBtn) {
                commentBtn.click();
            }

        }

        localStorage.removeItem("focusPostId");

    }, 800);
}


// Load unread notification count for badge
async function loadNotificationCount() {

    try {

        const res = await fetch(`${BASE_URL}/api/auth/notifications/unread-count`, {
            headers: {
                "Authorization": "Bearer " + localStorage.getItem("token")
            }
        });

        const data = await res.json();

        const badge = document.getElementById("notificationCount");

        if (data.count > 0) {

            badge.style.display = "inline-block";

            if (data.count > 3) {
                badge.innerText = "3+";
            } else {
                badge.innerText = data.count;
            }

        } else {
            badge.style.display = "none";
        }

    } catch (error) {
        console.log("Notification count error:", error);
    }

} 
loadNotificationCount();
// SPA-safe call
window.initHomePage = loadPosts;