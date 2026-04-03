async function initProfilePage() {
    // ==========================
    // AUTH CHECK
    // ==========================
    const token = localStorage.getItem("token");
    const userRaw = localStorage.getItem("user");

    if (!token || !userRaw) {
        alert("Please login first");
        window.location.href = "signup.html";
        return;
    }

    let currentUser;
    try {
        currentUser = JSON.parse(userRaw);
    } catch {
        alert("Session error, login again");
        localStorage.clear();
        window.location.href = "signup.html";
        return;
    }

    const currentUserId = currentUser._id || currentUser.id;
    // GET PROFILE USER ID
    const urlParams = new URLSearchParams(window.location.search);
    const urlUserId = urlParams.get("id");

    const viewUserId = localStorage.getItem("viewUserId");
    const profileUserId = viewUserId && viewUserId !== "undefined" && viewUserId !== "null"
        ? viewUserId
        : currentUserId;

    const isOwnProfile = String(profileUserId) === String(currentUserId);
    // DOM ELEMENTS
    const usernameEl = document.getElementById("profileUsername");
    const handleEl = document.getElementById("profileHandle");
    const bioEl = document.getElementById("profileBio");
    const followersEl = document.getElementById("followersCount");
    const followingEl = document.getElementById("followingCount");
    const postCountEl = document.getElementById("postCount");
    const profilePicDiv = document.getElementById("profilePicture");
    const editBtn = document.getElementById("editProfileBtn");
    const saveBtn = document.getElementById("saveProfileBtn");
    const cancelBtn = document.getElementById("cancelProfileBtn");
    const editUsername = document.getElementById("editUsername");
    const editHandle = document.getElementById("editHandle");
    const editBio = document.getElementById("editBio");
    const profileImageInput = document.getElementById("editProfileImage");
    const profileImagePreview = document.getElementById("profileImagePreview");
    const followBtn = document.getElementById("followBtn");
    const unfollowBtn = document.getElementById("unfollowBtn");
    const handleStatus = document.getElementById("handleStatus");
    const viewSection = document.getElementById("profileViewSection");
    const editSection = document.getElementById("profileEditSection");
    const postsContainer = document.getElementById("postsContainer");

    const defaultImage = "../Images/default-profile.png";
    // VIEW FOLLOWERS / FOLLOWING
    if (followersEl) followersEl.onclick = () => {
        localStorage.setItem("followListUserId", profileUserId);
        localStorage.setItem("followListType", "followers");
        loadPage("Pages/followList.html");
    };
    if (followingEl) followingEl.onclick = () => {
        localStorage.setItem("followListUserId", profileUserId);
        localStorage.setItem("followListType", "following");
        loadPage("Pages/followList.html");
    };

    // HANDLE CHECK (EDIT MODE)
    if (editHandle && isOwnProfile) {
        editHandle.oninput = async () => {
            const value = editHandle.value.replace("@", "").toLowerCase().trim();
            if (!value) return handleStatus ? handleStatus.innerText = "" : null;

            if (value === currentUser.handle) {
                if (handleStatus) {
                    handleStatus.innerText = "✓ Your current handle";
                    handleStatus.style.color = "gray";
                }
                return;
            }

            try {
                const res = await fetch(`http://localhost:5000/api/profile/check-handle/${value}`, {
                    headers: { Authorization: "Bearer " + token }
                });
                const data = await res.json();
                if (handleStatus) {
                    handleStatus.innerText = data.available ? "✓ Available" : "✗ Already taken";
                    handleStatus.style.color = data.available ? "green" : "red";
                }
            } catch {
                if (handleStatus) handleStatus.innerText = "";
            }
        };
    }

    // LOAD PROFILE DATA
    async function loadProfile() {
        try {
           const res = await fetch(`http://localhost:5000/api/auth/users/${profileUserId}`, {
                    headers: { Authorization: "Bearer " + token }
                });
                const data = await res.json();
                // if (!res.ok) throw new Error(data.message || "Profile fetch failed");

                // follow/unfollow check
                const isFollowing = data.followers?.some(f => String(f._id || f) === String(currentUserId));

                // load posts after profile info
                await loadUserPosts(profileUserId);

            if (!res.ok) throw new Error(data.message || "Profile fetch failed");

            // Profile info
            usernameEl.innerText = data.username || "Unknown";
            handleEl.innerText = data.handle ? `@${data.handle}` : "@handle";
            bioEl.innerText = data.bio || "No bio";
            followersEl.innerText = data.followers?.length || 0;
            followingEl.innerText = data.following?.length || 0;

            // Profile picture
            const imageUrl = data.profileImage ? "http://localhost:5000" + data.profileImage : defaultImage;
            profilePicDiv.innerHTML = `<img src="${imageUrl}" style="width:100%;height:100%;border-radius:50%;object-fit:cover;">`;

            // Edit button visibility
            if (editBtn) editBtn.style.display = isOwnProfile ? "inline-block" : "none";
            if (saveBtn) saveBtn.style.display = "none";
            if (cancelBtn) cancelBtn.style.display = "none";
            viewSection.style.display = "block";
            editSection.style.display = "none";

            // Follow buttons
            await updateFollowButtons(profileUserId);

            // Load user posts **after everything else**
            await loadUserPosts(profileUserId);

        } catch (err) {
            console.error("Profile load error:", err);
            alert("Failed to load profile");
        }
    }

    // FOLLOW / UNFOLLOW
    async function updateFollowButtons(profileUserId) {
        if (!followBtn || !unfollowBtn) return;

        if (isOwnProfile) {
            followBtn.style.display = "none";
            unfollowBtn.style.display = "none";
            return;
        }

        try {
            const res = await fetch(`http://localhost:5000/api/auth/users/${profileUserId}`, {
                headers: { Authorization: "Bearer " + token }
            });
            const profileUser = await res.json(); // already correct
            const isFollowing = profileUser.followers?.some(f => String(f._id || f) === String(currentUserId));

            followBtn.style.display = isFollowing ? "none" : "inline-block";
            unfollowBtn.style.display = isFollowing ? "inline-block" : "none";

            followBtn.onclick = async () => {
                await fetch(`http://localhost:5000/api/auth/${profileUserId}/follow`, {
                    method: "PUT",
                    headers: { Authorization: "Bearer " + token }
                });
                await loadProfile();
                localStorage.removeItem("viewUserId"); // optional
            };

            unfollowBtn.onclick = async () => {
                await fetch(`http://localhost:5000/api/auth/${profileUserId}/unfollow`, {
                    method: "PUT",
                    headers: { Authorization: "Bearer " + token }
                });
                await loadProfile();
                localStorage.removeItem("viewUserId"); // optional
            };
        } catch (err) {
            console.error("Follow error:", err);
        }
    }

    // LOAD USER POSTS
    async function loadUserPosts(userId) {
        if (!postsContainer) return;

        try {
            const res = await fetch(`http://localhost:5000/api/posts/user/${userId}`, {
                headers: { Authorization: "Bearer " + token }
            });
            const data = await res.json();
            const posts = Array.isArray(data.posts) ? data.posts : [];
            postsContainer.innerHTML = "";

            if (posts.length === 0) {
                postsContainer.innerHTML = "<p style='text-align:center;'>No posts yet</p>";
                postCountEl.innerText = "0";
                return;
            }

            posts.forEach(post => {
                const div = document.createElement("div");
                div.className = "post-card";
                const img = post.image ? (post.image.startsWith("http") ? post.image : "http://localhost:5000" + post.image) : "";
                div.innerHTML = `
                    <h4>${post.author?.username || "Unknown"}</h4>
                    <p>@${post.author?.handle || ""}</p>
                    ${post.title ? `<h3>${post.title}</h3>` : ""}
                    ${post.content ? `<p>${post.content}</p>` : ""}
                    ${img ? `<img src="${img}" style="width:100%;margin-top:10px;border-radius:10px;">` : ""}
                `;
                postsContainer.appendChild(div);
            });

            postCountEl.innerText = posts.length;

        } catch (err) {
            console.error("Post load error:", err);
            postsContainer.innerHTML = "<p style='text-align:center;'>Failed to load posts</p>";
        }
    }

    // EDIT PROFILE
    if (editBtn) editBtn.onclick = () => {
        if (!isOwnProfile) return alert("You cannot edit another user's profile");
        editUsername.value = usernameEl.innerText;
        editHandle.value = handleEl.innerText.replace("@", "");
        editBio.value = bioEl.innerText;
        viewSection.style.display = "none";
        editSection.style.display = "block";
        saveBtn.style.display = "inline-block";
        cancelBtn.style.display = "inline-block";
    };

    if (cancelBtn) cancelBtn.onclick = () => {
        viewSection.style.display = "block";
        editSection.style.display = "none";
    };

    if (saveBtn) saveBtn.onclick = async () => {
        if (!isOwnProfile) return alert("Unauthorized action");

        try {
            const formData = new FormData();
            if (editUsername.value.trim()) formData.append("username", editUsername.value.trim());
            formData.append("handle", editHandle.value.trim().replace("@", "").toLowerCase());
            formData.append("bio", editBio.value.trim());
            if (profileImageInput.files[0]) formData.append("profileImage", profileImageInput.files[0]);

            const res = await fetch("http://localhost:5000/api/auth/profile", {
                method: "PUT",
                headers: { Authorization: "Bearer " + token },
                body: formData
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.message);

            localStorage.setItem("user", JSON.stringify({ ...currentUser, ...data.user }));
            await loadProfile();
            alert("Profile updated ✅");
        } catch (err) {
            alert(err.message);
        }
    };
    // PROFILE IMAGE PREVIEW
    if (profileImageInput) {
        profileImageInput.onchange = () => {
            const file = profileImageInput.files[0];
            if (!file) return;
            profileImagePreview.src = URL.createObjectURL(file);
            profileImagePreview.style.display = "block";
        };
    }

    // INITIAL LOAD
    await loadProfile();
}

function openProfile(userId) {
    // Set localStorage for SPA consistency
    localStorage.setItem("viewUserId", userId);

    // Navigate to profile page with query param
    window.location.href = `Pages/profile.html?id=${userId}`;
}
window.openProfile = openProfile;


// SPA safe call
window.initProfilePage = initProfilePage;
window.openProfile = openProfile;