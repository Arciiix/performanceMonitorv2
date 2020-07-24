const OPTIONS = {
  port: 7373,
  isWindows: true, //DEV
  hasWIFI: false, //DEV
  workingInterval: 15, //in minutes, time between saving the current date (to check whether the device working)
  networkCheckInterval: 15, //in minutes, time between checking the network
};

const express = require("express");
const app = express();
const server = app.listen(OPTIONS.port, () => {
  console.log(`App has started on port ${OPTIONS.port}`);
});

const fs = require("fs");
const fetch = require("node-fetch");

//Libraries which allow to get the info
const si = require("systeminformation"); //RAM
const checkDiskSpace = require("check-disk-space"); //DISK SPACE
const temp = require("pi-temperature"); //TEMPERATURE
const iwconfig = require("wireless-tools/iwconfig"); //WIFI SIGNAL STRENGTH

async function getInfo() {
  let ramUsage, usedSpace, temperature, wifiSignalStrength, upTime, hostname;
  try {
    //Get ramUsage, upTime and hostname at one request
    ({ ramUsage, upTime, hostname } = await new Promise((resolve, reject) => {
      si.get({
        mem: "used, total",
        time: "uptime",
        osInfo: "hostname",
      })
        .then((data) => {
          let percent;
          percent = data.mem.used / data.mem.total;
          percent *= 100;
          resolve({
            ramUsage: Math.round(percent),
            upTime: data.time.uptime,
            hostname: data.osInfo.hostname,
          });
        })
        .catch((err) => {
          reject(err);
        });
    }));

    usedSpace = await new Promise((resolve, reject) => {
      checkDiskSpace(OPTIONS.isWindows ? "C:/" : "/")
        .then((space) => {
          let percent;
          let distinction = space.size - space.free;
          percent = distinction / space.size;
          percent *= 100;
          resolve(Math.round(percent));
        })
        .catch((err) => {
          reject(err);
        });
    });

    if (!OPTIONS.isWindows) {
      temperature = await new Promise((resolve, reject) => {
        temp.measure((err, temp) => {
          if (err) {
            reject(err);
          } else {
            resolve(temp);
          }
        });
      });
    }

    if (OPTIONS.hasWIFI) {
      wifiSignalStrength = await new Promise((resolve, reject) => {
        iwconfig.status((err, status) => {
          if (err) reject(err);
          let quality = status[0].quality;
          resolve(quality);
        });
      });
    }
  } catch (err) {
    console.log(err);
    return;
  }

  return {
    ramUsage: ramUsage,
    usedSpace: usedSpace,
    temperature: temperature,
    wifiSignalStrength: wifiSignalStrength,
    upTime: upTime,
    hostname: hostname,
  };
}

async function sendUsage() {
  if (clientsCount > 0) {
    let usage = await getInfo();
    io.sockets.emit("performanceData", usage);
    setTimeout(async () => {
      await sendUsage();
    }, 1000);
  } else {
    setTimeout(async () => {
      await sendUsage();
    }, 10000);
  }
}

function isWorking() {
  let date = dateFormatter();
  fs.writeFile("working.txt", `Latest reading: ${date}`, (err) => {
    if (err) throw err;
  });
}
function networkTest() {
  fetch(`https://www.google.com/`)
    .then(() => {})
    .catch((err) => {
      let date = dateFormatter();
      fs.appendFile(
        "network.txt",
        `${date} - Network test failed! Error description: ${err} \r\n`,
        (err) => {
          if (err) throw err;
        }
      );
    });
}

function dateFormatter() {
  let currDate = new Date();

  //Formating
  let day = addZero(currDate.getDate());
  let month = addZero(currDate.getMonth() + 1);
  let year = currDate.getFullYear();
  let hour = addZero(currDate.getHours());
  let minute = addZero(currDate.getMinutes());
  let second = addZero(currDate.getSeconds());

  return `${day}.${month}.${year} ${hour}:${minute}:${second}`;
}

function addZero(value) {
  return value < 10 ? "0" + value.toString() : value.toString();
}

const io = require("socket.io")(server);
let clientsCount = 0;

io.on("connection", (socket) => {
  clientsCount++;
  socket.on("disconnect", () => {
    clientsCount--;
  });
});

setInterval(isWorking, OPTIONS.workingInterval * 60000);
setInterval(networkTest, OPTIONS.networkCheckInterval * 60000);
setTimeout(async () => {
  await sendUsage();
}, 5000);
