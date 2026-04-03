console.log("Follow List script loaded ✅");


// ==========================
// OPEN PROFILE SAFELY
// ==========================
function openUserProfile(userId) {

    if (!userId) return;

    localStorage.setItem("viewUserId", userId);

    loadPage("Pages/profile.html");
}



// ==========================
// FOLLOW USER
// ==========================
async function followUser(userId, token) {

    try {

        await fetch(
            `http://localhost:5000/api/auth/${userId}/follow`,
            {
                method: "PUT",
                headers: {
                    Authorization: "Bearer " + token
                }
            }
        );

        initFollowListPage();

    }
    catch (err) {

        console.error("Follow error:", err);

    }

}



// ==========================
// UNFOLLOW USER
// ==========================
async function unfollowUser(userId, token) {

    try {

        await fetch(
            `http://localhost:5000/api/auth/${userId}/unfollow`,
            {
                method: "PUT",
                headers: {
                    Authorization: "Bearer " + token
                }
            }
        );

        initFollowListPage();

    }
    catch (err) {

        console.error("Unfollow error:", err);

    }

}



// ==========================
// INIT FOLLOW LIST PAGE
// ==========================
async function initFollowListPage() {

    const token = localStorage.getItem("token");
    const userRaw = localStorage.getItem("user");

    if (!token || !userRaw) {

        alert("Please login first");
        loadPage("Pages/signup.html");
        return;

    }

    const currentUser = JSON.parse(userRaw);
    const currentUserId = currentUser._id;


    const profileUserId =
        localStorage.getItem("followListUserId") ||
        currentUserId;


    const type =
        localStorage.getItem("followListType") ||
        "followers";


    const title = document.getElementById("followListTitle");
    const container = document.getElementById("followList");


    if (!title || !container) {

        console.error("Elements missing");
        return;

    }


    title.innerText =
        type === "followers"
            ? "Followers"
            : "Following";


    try {

        const res = await fetch(
            `http://localhost:5000/api/auth/users/${profileUserId}`,
            {
                headers: {
                    Authorization: "Bearer " + token
                }
            }
        );

        const data = await res.json();

        if (!res.ok)
            throw new Error(data.message);


        const list =
            type === "followers"
                ? data.followers
                : data.following;


        container.innerHTML = "";


        if (!list || list.length === 0) {

            container.innerHTML =
                "<p style='text-align:center;'>No users found</p>";

            return;

        }


        list.forEach(user => {

            if (!user || !user._id)
                return;


            const div = document.createElement("div");

            div.className = "follow-user-card";


            div.style.display = "flex";
            div.style.alignItems = "center";
            div.style.justifyContent = "space-between";
            div.style.padding = "10px";
            div.style.borderBottom = "1px solid #ddd";


            const imageUrl =
                user.profileImage
                    ? user.profileImage.startsWith("http")
                        ? user.profileImage
                        : "http://localhost:5000" + user.profileImage
                    : "../Images/default-profile.png";


            const isOwn =
                String(user._id) === String(currentUserId);


            const isFollowing =
                currentUser.following?.includes(user._id);


            div.innerHTML = `
                <div style="display:flex;align-items:center;gap:10px;cursor:pointer;" class="user-info">
                    
                    <img src="${imageUrl}"
                        style="
                            width:50px;
                            height:50px;
                            border-radius:50%;
                            object-fit:cover;
                        "
                        onerror="this.src='../Images/default-profile.png'">

                    <div>
                        <div style="font-weight:bold;">
                            ${user.username || "Unknown"}
                        </div>

                        <div style="color:gray;">
                            @${user.handle || ""}
                        </div>
                    </div>

                </div>

                ${
                    isOwn
                        ? ""
                        : `
                    <button class="follow-btn"
                        style="
                            padding:6px 12px;
                            border:none;
                            border-radius:6px;
                            cursor:pointer;
                        ">
                        ${isFollowing ? "Unfollow" : "Follow"}
                    </button>
                `
                }
            `;


            // profile click
            div.querySelector(".user-info").onclick =
                () => openUserProfile(user._id);


            // follow button click
            const btn =
                div.querySelector(".follow-btn");

            if (btn) {

                btn.onclick = () => {

                    if (isFollowing) {

                        unfollowUser(user._id, token);

                    } else {

                        followUser(user._id, token);

                    }

                };

            }


            container.appendChild(div);

        });

    }
    catch (err) {

        console.error(err);

        container.innerHTML =
            "<p style='text-align:center;'>Failed to load</p>";

    }

}



// ==========================
// SPA SAFE EXPORT
// ==========================
window.initFollowListPage = initFollowListPage;
window.openUserProfile = openUserProfile;