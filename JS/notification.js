// ===============================
// Notifications Page Script
// ===============================

window.initNotificationsPage = async function () {
    const token = localStorage.getItem("token");
    if (!token) return;

    const panel = document.getElementById("notificationsList");
    if (!panel) return;

    panel.innerHTML = "<p style='text-align:center;'>Loading...</p>";

    try {
        const res = await fetch("http://localhost:5000/api/auth/notifications", {
            headers: { Authorization: "Bearer " + token }
        });

        const notifications = await res.json();

        if (!notifications.length) {
            panel.innerHTML = "<p style='text-align:center;'>No notifications yet!</p>";
            return;
        }

        panel.innerHTML = "";

        notifications.forEach(notif => {
            const div = document.createElement("div");
            div.className = "notification-item";

            if (!notif.isRead) {
                div.style.background = "#eef6ff";
            }

            const senderName = notif.sender?.username || "Unknown";
            const senderAvatar = notif.sender?.profileImage
                ? `http://localhost:5000${notif.sender.profileImage}`
                : "http://localhost:5000/uploads/default-avatar.png";

            let messageText = "";

            if (notif.type === "follow") {
                messageText = "started following you.";
            }
            else if (notif.type === "like") {
                messageText = "liked your post.";
            }
            else if (notif.type === "comment") {
                messageText = `commented: "${notif.message || ""}"`;
            }

            div.innerHTML = `
                <img src="${senderAvatar}" class="notification-avatar">
                <div class="notification-content">
                    <p><strong>${senderName}</strong> ${messageText}</p>
                    <span class="notification-time">${timeAgo(notif.createdAt)}</span>
                </div>
            `;

            // ===============================
            // CLICK ACTION
            // ===============================
            div.onclick = async () => {
                try {
                    // Mark notification as read
                    if (!notif.isRead) {
                        await fetch(
                            `http://localhost:5000/api/auth/notifications/${notif._id}/read`,
                            { method: "PUT", headers: { Authorization: "Bearer " + token } }
                        );
                        notif.isRead = true;
                        div.style.background = "transparent";
                        if (typeof updateNotifBadge === "function") updateNotifBadge();
                    }

                    // FOLLOW → open profile
                    if (notif.type === "follow" && notif.sender?._id) {
                        openUserProfile(notif.sender._id);
                    }

                    // LIKE / COMMENT → scroll to post in Home feed
                    else if ((notif.type === "like" || notif.type === "comment") && notif.post?._id) {
                        localStorage.setItem("focusPostId", notif.post._id);
                        const homeBtn = document.getElementById("sidebar-home");
                        if (homeBtn) homeBtn.click();
                    }

                } catch (err) {
                    console.error("Notification click error:", err);
                }
            };

            panel.appendChild(div);
        });

    } catch (err) {
        console.error("Failed to load notifications:", err);
        panel.innerHTML = "<p style='text-align:center;'>Failed to load notifications</p>";
    }
};

// ===============================
// OPEN USER PROFILE
// ===============================
function openUserProfile(userId) {
    localStorage.setItem("viewUserId", userId);

    fetch("Pages/profile.html")
        .then(res => res.text())
        .then(html => {
            const mainContent = document.getElementById("mainContent");
            mainContent.innerHTML = html;

            const script = document.createElement("script");
            script.src = "JS/profile.js";
            script.onload = () => {
                if (typeof window.initProfilePage === "function") window.initProfilePage();

                // Load follow.js after profile.js
                const followScript = document.createElement("script");
                followScript.src = "JS/follow.js";
                document.body.appendChild(followScript);
            };
            document.body.appendChild(script);
        })
        .catch(err => console.error("Failed to load profile:", err));
}

window.openUserProfile = openUserProfile;

// ===============================
// TIME AGO HELPER
// ===============================
function timeAgo(date) {
    const diff = Math.floor((Date.now() - new Date(date)) / 1000);
    if (diff < 60) return "just now";
    if (diff < 3600) return Math.floor(diff / 60) + "m ago";
    if (diff < 86400) return Math.floor(diff / 3600) + "h ago";
    return Math.floor(diff / 86400) + "d ago";
}