var listOfTabs = []

document.getElementById("loadTabList-button").addEventListener("click", () => {
    chrome.tabs.query({ windowId: chrome.windows.WINDOW_ID_CURRENT }, (tabs) => {
        for (let i = 0; i < tabs.length; i++) {
            var container = document.getElementById("listOfTabs"); // finds the container
            var x = document.createElement("div");
            x.setAttribute("class", "tabListItem");
            x.setAttribute("onclick", "window.location='"+tabs[i].url+"';");
            x.textContent = tabs[i].title;
            container.appendChild(x);
            // listOfTabs.push(tabs[i].url);
            // document.write(`<li>${tabs[i].url}</li>`);
        }
        // document.write('</ul>');
        // var xx = document.createElement("button");
        // xx.setAttribute("id", "clearList-button");
        // xx.textContent = "Clear List";
        // container.appendChild(xx);
        // document.write('<button id="clearList-button" >Back to PopUp</button>');
    });
    console.log(listOfTabs);
});


// Clear list button
document.getElementById("clearList-button").addEventListener("click", () => {
    var container = document.getElementById("listOfTabs");
    container.replaceChildren();
});


