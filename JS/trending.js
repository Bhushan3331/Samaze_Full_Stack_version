// Pages/JS/trending.js

async function loadTrendingPosts() {

    const container = document.getElementById("trendingPosts");

    container.innerHTML = "Loading...";

    try {

        const token = localStorage.getItem("token");

        const res = await fetch("http://localhost:5000/api/posts/trending", {
            headers: {
                Authorization: "Bearer " + token
            }
        });

        const posts = await res.json();

        const currentUser =
            JSON.parse(localStorage.getItem("user"));

        container.innerHTML = posts
            .map(post => renderPost(post, currentUser._id))
            .join("");

    }
    catch (err) {

        console.error(err);

        container.innerHTML =
            "Failed to load trending posts";

    }

}


// required for SPA loading
window.loadTrendingPosts = loadTrendingPosts;