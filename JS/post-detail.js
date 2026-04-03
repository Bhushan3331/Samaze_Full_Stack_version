
function goBack() {

    const mainContent = document.getElementById("mainContent");

    if (mainContent) {
        fetch("Pages/home-content.html")
            .then(res => res.text())
            .then(data => {
                mainContent.innerHTML = data;
            });
    } else {
        window.location.href = "home.html";
    }
}
function loadPage(page) {
    fetch(page)
        .then(res => res.text())
        .then(data => {
            document.getElementById("mainContent").innerHTML = data;
        });
}
