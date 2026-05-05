const { app, BrowserWindow, Menu } = require('electron');

let mainWindow;

const createWindow = () => {
  mainWindow = new BrowserWindow({
    width: 640,
    height: 480,
    useContentSize: true,
    //resizable: false,
    movable: true,
    minimizable: true,
    maximizable: false,
    closable: true,
    frame: true,
  });

  // メニューバーを消す
  mainWindow.removeMenu();

  // macOSメニューバー
  if ( process.platform == "darwin" ) {
    Menu.setApplicationMenu(Menu.buildFromTemplate([
      {
        label: "",
        submenu: [
          {
            role: "about",
          },
          {
            label: "Quit",
            accelerator: "Command+Q",
            click() {
              app.quit();
            },
          },
        ],
      },
    ]));
  }

  // ウィンドウのサイズ変更を不可に
  let windowSize = mainWindow.getSize();
  mainWindow.setMinimumSize(windowSize[0], windowSize[1]);
  mainWindow.setMaximumSize(windowSize[0], windowSize[1]);

  mainWindow.loadFile('15.html');
}

app.on("ready", createWindow);

app.on('window-all-closed', () => {
  if ( process.platform !== 'darwin' ) app.quit();
});
