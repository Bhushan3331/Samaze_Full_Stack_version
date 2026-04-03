function renderPost(post, currentUserId) {

    const liked = post.likes?.includes(currentUserId);
    const bookmarked = post.bookmarks?.includes(currentUserId);
    const isOwner = post.author?._id === currentUserId;

    const avatar = post.author?.profileImage
    ? (post.author.profileImage.startsWith("http")
        ? post.author.profileImage
        : `http://localhost:5000${post.author.profileImage}`)
    : "http://localhost:5000/uploads/default-avatar.png";

    return `
        <div class="post-card clickable-post" 
             data-userid="${post.author?._id || ""}" 
             data-postid="${post._id}">

            <!-- HEADER -->
            <div class="post-header">

                <img src="${avatar}" class="post-avatar">

                <div class="post-user-info">
                    <span class="post-username">${post.author?.username || "Unknown"}</span>
                    <span class="post-handle">@${post.author?.handle || ""}</span>
                </div>

                ${
                    isOwner
                    ? `<button class="delete-btn">⋯</button>`
                    : ""
                }

            </div>

            <!-- TITLE -->
            ${post.title ? `<h3 class="post-title">${post.title}</h3>` : ""}

            <!-- CONTENT -->
            ${post.content ? `<p class="post-content">${post.content}</p>` : ""}

            <!-- IMAGE -->
            ${
                post.image
                ? `<img src="http://localhost:5000${post.image}" class="post-image">`
                : ""
            }

            <!-- ACTIONS -->
            <div class="post-actions">

                <button class="action-btn like-btn ${liked ? "liked" : ""}">
                    ❤️ <span>${post.likes?.length || 0}</span>
                </button>

                <button class="action-btn comment-btn">
                    💬
                </button>

            </div>

            <div class="comment-section"></div>

        </div>
    `;
}
