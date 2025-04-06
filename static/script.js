let charts = [];
let popupChart;
let currentPopupIndex = null;

function fetchData() {
    fetch('/data')
        .then(response => response.json())
        .then(data => {
            console.log(data); // Check the data being fetched
            data.forEach((deviceData) => {
                const deviceId = deviceData.device_id;
                console.log(`Updating device ${deviceId}`); // Debugging statement

                const deviceIdElement = document.getElementById(`device_id_${deviceId}`);
                const deviceNameElement = document.getElementById(`device_name_${deviceId}`);
                const timestampElement = document.getElementById(`timestamp_${deviceId}`);
                const powerConsumptionElement = document.getElementById(`power_consumption_${deviceId}`);
                const powerFactorElement = document.getElementById(`power_factor_${deviceId}`);

                console.log(deviceIdElement, deviceNameElement, timestampElement, powerConsumptionElement, powerFactorElement); // Check if the elements exist

                if (deviceIdElement && deviceNameElement && timestampElement && powerConsumptionElement && powerFactorElement) {
                    deviceIdElement.innerText = deviceData.device_id || 'N/A';
                    deviceNameElement.innerText = deviceData.device_name || 'N/A';
                    timestampElement.innerText = deviceData.timestamp || 'N/A';
                    powerConsumptionElement.innerText = deviceData.power_consumption || 'N/A';
                    powerFactorElement.innerText = deviceData.power_factor || 'N/A';

                    if (charts[deviceId - 1]) {
                        charts[deviceId - 1].data.labels.push(new Date(deviceData.timestamp * 1000));
                        charts[deviceId - 1].data.datasets[0].data.push(deviceData.power_consumption);
                        charts[deviceId - 1].update();
                    }

                    // Update the popup chart if it is open and corresponds to the current device
                    if (currentPopupIndex === deviceId - 1 && popupChart) {
                        popupChart.data.labels.push(new Date(deviceData.timestamp * 1000));
                        popupChart.data.datasets[0].data.push(deviceData.power_consumption);
                        popupChart.update();
                    }
                } else {
                    console.error(`Element not found for device ${deviceId}`);
                }
            });
        })
        .catch(error => console.error('Error fetching data:', error));
}

function createCharts() {
    for (let i = 1; i <= 8; i++) {
        const ctx = document.getElementById(`powerChart_${i}`).getContext('2d');
        charts[i - 1] = new Chart(ctx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [{
                    label: 'Power Consumption (W)',
                    data: [],
                    borderColor: 'rgba(75, 192, 192, 1)',
                    backgroundColor: 'rgba(75, 192, 192, 0.2)',
                    fill: true,
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: {
                        type: 'time',
                        time: {
                            unit: 'second'
                        },
                        title: {
                            display: true,
                            text: 'Time'
                        }
                    },
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Power Consumption (W)'
                        }
                    }
                },
                plugins: {
                    legend: {
                        display: true,
                        position: 'top'
                    },
                    tooltip: {
                        mode: 'index',
                        intersect: false
                    }
                },
                elements: {
                    line: {
                        tension: 0.4 // Smooth the line
                    },
                    point: {
                        radius: 2 // Smaller points
                    }
                }
            }
        });

        document.getElementById(`powerChart_${i}`).onclick = function() {
            console.log(`Chart ${i} clicked`); // Debugging statement
            showPopup(i - 1);
        };
        console.log(charts[i - 1]); // Add this line to check the chart initialization
    }
}

function showPopup(index) {
    currentPopupIndex = index; // Set the current popup index
    const popup = document.getElementById('popup');
    const popupCanvas = document.getElementById('popupChart');
    popup.style.display = 'flex';

    if (popupChart) {
        popupChart.destroy();
    }

    popupChart = new Chart(popupCanvas.getContext('2d'), {
        type: 'line',
        data: JSON.parse(JSON.stringify(charts[index].data)), // Deep clone the data
        options: JSON.parse(JSON.stringify(charts[index].options)) // Deep clone the options
    });
    console.log(`Popup chart for device ${index + 1} created`); // Debugging statement
}

function closePopup() {
    document.getElementById('popup').style.display = 'none';
    if (popupChart) {
        popupChart.destroy();
        popupChart = null;
    }
    currentPopupIndex = null; // Reset the current popup index
}

function exportCSV(index) {
    const data = charts[index].data;
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Time,Power Consumption (W)\n";

    data.labels.forEach((label, i) => {
        const row = `${label.toISOString()},${data.datasets[0].data[i]}`;
        csvContent += row + "\n";
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `device_${index + 1}_data.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

setInterval(fetchData, 1000); // Fetch data every second

window.onload = function() {
    createCharts();
    fetchData();
};
