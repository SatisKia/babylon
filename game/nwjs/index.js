var win = nw.Window.get();

win.on("loaded", function() {
});

win.on("close", function() {
  nw.App.quit();
});
