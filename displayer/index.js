const electron = require("electron");

const url = require("url");
const path = require("path");

const { app, BrowserWindow, screen } = electron;

let mainWindow;

let pathToIcon = path.join(__dirname, "img/icon.ico");

//For development - live reload
require("electron-reload")(__dirname);

app.on("ready", () => {
  //Get screen size
  let { width, height } = screen.getPrimaryDisplay().workAreaSize;
  //Set the app size to 80% of width and 95% of height
  width *= 0.8;
  height *= 0.95;

  //Create new window
  mainWindow = new BrowserWindow({
    width: width,
    height: height,
    minHeight: 600,
    minWidth: 800,
    icon: pathToIcon,
  });

  //Load the site into the window
  mainWindow.loadURL(
    url.format({
      pathname: path.join(__dirname, "index.html"),
      protocol: "file",
    })
  );

  //Set the title of the window
  mainWindow.setTitle("Performance monitor"); //TODO - The initial title will be - disconnected, but when the collector connects, it changes to connected

  //Hide the menu - the app doesn't use it
  mainWindow.setMenu(null);

  //DEV - Open dev tools
  //mainWindow.webContents.openDevTools();
});
