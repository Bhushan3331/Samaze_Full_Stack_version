// admin.js

const adminToken = localStorage.getItem("token");


// ==============================
// CHECK ADMIN ACCESS
// ==============================
(async function checkAdminAccess(){

    if(!adminToken){
        alert("Please login first");
        window.location.href = "signup.html";
        return;
    }

    try{

        const res = await fetch(`${BASE_URL}/api/auth/me`,{
            headers:{
                "Authorization":"Bearer " + adminToken
            }
        });

        const data = await res.json();

        if(!res.ok || !data.user || data.user.role !== "admin"){
            alert("Access denied. Admin only.");
            window.location.href="home.html";
            return;
        }

        loadAdminDashboard();
        loadReportedPosts();

    }catch(err){

        console.error("Admin auth error:",err);
        localStorage.clear();
        window.location.href="signup.html";

    }

})();



// ==============================
// LOAD DASHBOARD STATS
// ==============================
async function loadAdminDashboard(){

    try{

        // ===== POSTS STATS =====
        const postsRes = await fetch(`${BASE_URL}/api/admin/posts-stats`,{
            headers:{
                "Authorization":"Bearer " + adminToken
            }
        });

        const postsData = await postsRes.json();

        console.log("POST STATS:", postsData); // debug

        const monthEl = document.getElementById("totalPosts");
        if(monthEl){
            monthEl.innerText =
                postsData.totalPostsThisMonth ||
                postsData.postsThisMonth ||
                postsData.monthPosts ||
                0;
        }

        const allPostsEl = document.getElementById("totalPostsAll");
        if(allPostsEl){
            allPostsEl.innerText =
                postsData.totalPosts ||
                postsData.posts ||
                postsData.count ||
                0;
        }


        // ===== USERS STATS =====
        const usersRes = await fetch(`${BASE_URL}/api/admin/users-stats`,{
            headers:{
                "Authorization":"Bearer " + adminToken
            }
        });

        const usersData = await usersRes.json();

        console.log("USERS STATS:", usersData); // debug

        const totalUsersEl = document.getElementById("totalUsers");
        if(totalUsersEl){
            totalUsersEl.innerText =
                usersData.totalUsers ||
                usersData.count ||
                (usersData.users ? usersData.users.length : 0);
        }

        const usersTable = document.getElementById("usersStats");
        if(!usersTable) return;

        usersTable.innerHTML="";

        if(!usersData.users || usersData.users.length === 0){

            usersTable.innerHTML = `
            <tr>
                <td colspan="4">No users found</td>
            </tr>
            `;
            return;

        }

        usersData.users.forEach(u=>{

            const tr = document.createElement("tr");

            const profileImg = u.profilePic
                ? BASE_URL + u.profilePic
                : "/images/default-avatar.png";

            tr.innerHTML = `

            <td class="user-cell">
                <img src="${profileImg}" class="avatar">
                <span>${u.username}</span>
            </td>

            <td>${u.postsCount || 0}</td>

            <td>${u.followers?.length || u.followersGained || 0}</td>

            <td>${u.following?.length || u.followingCount || 0}</td>

            `;

            usersTable.appendChild(tr);

        });

    }catch(err){

        console.error("Failed loading dashboard:",err);

    }

}



// ==============================
// LOAD REPORTED POSTS
// ==============================
async function loadReportedPosts(){

    try{

        const res = await fetch(`${BASE_URL}/api/admin/reported-posts`,{
            headers:{
                "Authorization":"Bearer " + adminToken
            }
        });

        const data = await res.json();

        console.log("REPORT DATA:", data); // debug

        const tableBody = document.getElementById("reportedPostsBody");
        if(!tableBody) return;

        tableBody.innerHTML="";

        const reports = data.posts || data.reports || [];

        if(reports.length === 0){

            tableBody.innerHTML = `
            <tr>
                <td colspan="4">No reported posts</td>
            </tr>
            `;

            return;

        }

        reports.forEach(p=>{

            const tr = document.createElement("tr");

            const profileImg = p.author?.profilePic
                ? BASE_URL + p.author.profilePic
                : "/images/default-avatar.png";

            tr.innerHTML = `

            <td class="user-cell">
                <img src="${profileImg}" class="avatar">
                <span>${p.author?.username || "Unknown"}</span>
            </td>

            <td class="post-preview">
                ${p.content || "-"}
            </td>

            <td>
                <span class="reason">
                    ${p.reason || "Reported"}
                </span>
            </td>

            <td>
                <button class="resolveBtn" data-id="${p._id}">
                    Resolve
                </button>
            </td>

            `;

            tableBody.appendChild(tr);

        });

        document.querySelectorAll(".resolveBtn").forEach(btn=>{

            btn.addEventListener("click", async()=>{

                const postId = btn.dataset.id;

                try{

                    await fetch(`${BASE_URL}/api/admin/reported-posts/${postId}/resolve`,{
                        method:"POST",
                        headers:{
                            "Authorization":"Bearer " + adminToken
                        }
                    });

                    loadReportedPosts();

                }catch(err){
                    console.error("Resolve failed:",err);
                }

            });

        });

    }catch(err){

        console.error("Failed loading reports:",err);

    }

}
