//DEV
//const socket = io("http://localhost:7373");
const socket = io("http://192.168.0.120:7373");

let charts = {};

const upTimeText = document.querySelector(".upTimeText");
const onlineStatusDiv = document.querySelector(".onlineStatus");
const onlineStatusText = document.querySelector(".onlineStatusText");

//Current uptime - I don't fetch it every time, I just set interval
let currUpTime = 0,
  upTimeInterval;

let isOnline = false;

class Chart {
  currentValue = 0;
  constructor(label, value, divClass, whatToShowAfterValue) {
    const options = {
      chart: {
        width: "100%",
        type: "radialBar",
        sparkline: {
          enabled: true,
        },
      },
      series: [value],
      colors: ["#20E647"],
      plotOptions: {
        radialBar: {
          hollow: {
            margin: 0,
            size: "70%",
            background: "#3579b8",
          },
          track: {
            dropShadow: {
              enabled: true,
              top: 2,
              left: 0,
              blur: 4,
              opacity: 0.15,
            },
          },
          dataLabels: {
            name: {
              offsetY: -10,
              color: "#fff",
              fontSize: "4em",
              fontFamily: "Roboto",
            },
            value: {
              color: "#fff",
              fontSize: "2.5em",
              offsetY: "30%",
              fontFamily: "Roboto",
              show: true,
              formatter: (val) => {
                return parseInt(val) + whatToShowAfterValue;
              },
            },
          },
        },
      },
      fill: {
        type: "gradient",
        gradient: {
          shade: "dark",
          type: "vertical",
          gradientToColors: ["#87D4F9"],
          stops: [0, 100],
        },
      },
      stroke: {
        lineCap: "round",
      },
      labels: [label],
    };
    this.chart = new ApexCharts(
      document.querySelector(`.${divClass}`),
      options
    );
    this.chart.render();
  }
  updateSeries(newValue) {
    if (isNaN(newValue) || newValue > 100 || newValue < 0) return;
    this.chart.updateSeries([newValue]);
    this.currentValue = newValue;
  }

  setColour(value, isInverted) {
    let colour;
    if (this.currentValue == value) return;
    if ((!isInverted && value > 89) || (isInverted && value < 15)) {
      colour = "#ba3329";
    } else {
      colour = "#3579b8";
    }
    this.chart.updateOptions({
      plotOptions: {
        radialBar: {
          hollow: {
            background: colour,
          },
        },
      },
    });
  }
}

function updateUpTime() {
  //Convert the seconds to HH:MM:SS
  /* it doesn't work because when the time is above 1 day, it resets (because the day value increments in date) and the value is above 30/31 days, the same thing happens with month value
  let date = new Date(null);
  date.setSeconds(currUpTime);
  upTimeText.innerText = date.toISOString().substr(11, 8);
  */
  let tempUpTime = currUpTime;
  let days = Math.floor(tempUpTime / 86400);
  tempUpTime -= days * 86400;
  let hours = Math.floor(tempUpTime / 3600);
  tempUpTime -= hours * 3600;
  let minutes = Math.floor(tempUpTime / 60);
  tempUpTime -= minutes * 60;
  let seconds = tempUpTime;

  days = addZero(days);
  hours = addZero(hours);
  minutes = addZero(minutes);
  seconds = addZero(seconds);

  upTimeText.innerText = `${days}:${hours}:${minutes}:${seconds}`;
  currUpTime++;
}
function addZero(value) {
  //When value is lower than 10, add 0
  return value < 10 ? "0" + value : value.toString();
}

function setOnlineStatus(isOnline, hostname) {
  if (isOnline) {
    //Replace the offline class with the online one
    onlineStatusDiv.classList.remove("offline");
    onlineStatusDiv.classList.add("online");
    //Display the hostname
    onlineStatusText.innerText = hostname;
  } else {
    //Replace the online class with the offline one
    onlineStatusDiv.classList.remove("online");
    onlineStatusDiv.classList.add("offline");
    //Replace the hostname to the offline text
    onlineStatusText.innerText = "Offline";
  }
}

charts.ramUsage = new Chart("RAM", 0, "RAM", "%");
charts.usedSpace = new Chart("Miejsce", 0, "DISK", "%");
charts.temperature = new Chart("Temp", 0, "TEMPERATURE", "°C");
charts.wifiSignalStrength = new Chart("Zasięg", 0, "WIFISIGNAL", "%");

let defaultOptions = {
  ramUsage: 0,
  usedSpace: 0,
  temperature: 0,
  wifiSignalStrength: 0,
  upTime: 0,
  hostname: 0,
};

socket.on("performanceData", (usage) => {
  let newUsage = { ...defaultOptions, ...usage };
  for (let [key, value] of Object.entries(newUsage)) {
    if (charts[key]) {
      charts[key].setColour(value, key == "wifiSignalStrength" ? true : false);
      charts[key].updateSeries(value);
    }
  }
  if (currUpTime < 10) {
    //For safety, it depends on the performance, 0 is very rarely
    currUpTime = newUsage.upTime;
    if (upTimeInterval) {
      clearInterval(upTimeInterval);
    }
    upTimeInterval = setInterval(updateUpTime, 1000);
  }

  //If the online status is not set, set it
  if (!isOnline) {
    setOnlineStatus(true, newUsage.hostname);
  }
});

socket.on("disconnect", () => {
  //Clear the upTime interval and the span
  currUpTime = 0;
  if (upTimeInterval) {
    clearInterval(upTimeInterval);
  }
  updateUpTime();

  //Set the charts values to 0
  for (let [key, value] of Object.entries(charts)) {
    value.updateSeries(0);
  }

  //Update online status
  setOnlineStatus(false);
});
