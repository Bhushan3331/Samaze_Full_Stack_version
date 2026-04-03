function initFollowSystem() {

    const followBtn = document.getElementById("followBtn");
    const unfollowBtn = document.getElementById("unfollowBtn");

    if (!followBtn || !unfollowBtn) {
        console.log("Follow buttons not found");
        return;
    }

    const token = localStorage.getItem("token");
    const currentUser = JSON.parse(localStorage.getItem("user"));

    const viewedUserId =
        localStorage.getItem("viewUserId") ||
        currentUser._id;

    // hide buttons if own profile
    if (viewedUserId === currentUser._id) {

        followBtn.style.display = "none";
        unfollowBtn.style.display = "none";

        return;
    }

    // FOLLOW
    followBtn.onclick = async () => {

        try {

            const res = await fetch(
                `/api/profile/follow/${viewedUserId}`,
                {
                    method: "POST",
                    headers: {
                        Authorization: "Bearer " + token
                    }
                }
            );

            const data = await res.json();

            console.log(data);

            alert("Followed ✅");

        }
        catch (err) {

            console.error(err);

        }

    };

    // UNFOLLOW
    unfollowBtn.onclick = async () => {

        try {

            const res = await fetch(
                `/api/profile/unfollow/${viewedUserId}`,
                {
                    method: "POST",
                    headers: {
                        Authorization: "Bearer " + token
                    }
                }
            );

            const data = await res.json();

            console.log(data);

            alert("Unfollowed ❌");

        }
        catch (err) {

            console.error(err);

        }

    };

}


// SPA safe load
window.initFollowSystem = initFollowSystem;