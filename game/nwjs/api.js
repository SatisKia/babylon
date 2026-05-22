var win = nw.Window.get();

win.on("loaded", function() {
});

win.on("close", function() {
  nw.App.quit();
});

function DesktopAppAPI() {
}

DesktopAppAPI.prototype = {
};

window.desktopAppAPI = new DesktopAppAPI();
