let charts = [];
let popupChart;
let currentPopupIndex = null;
let previousData = Array(8).fill(null); // Array to store the previous data for each device
let lastUpdateTimes = Array(8).fill(0); // Array to track the last update time for each device
let isReceivedData = Array(8).fill(false); // Array to track if data has been received at least once
let runningAverages = Array(8).fill(0); // Array to store the running average for each device
let peakValues = Array(8).fill(0); // Array to store the peak value for each device

function fetchData() {
    fetch('/data')
        .then(response => response.json())
        .then(data => {
            const currentTime = Date.now();
            console.log(data); // Check the data being fetched
            let consolidatedPower = 0; // Initialize consolidated power

            data.forEach((deviceData, index) => {
                const deviceId = deviceData.device_id;
                console.log(`Updating device ${deviceId}`); // Debugging statement
                const deviceIdElement = document.getElementById(`device_id_${deviceId}`);
                const deviceNameElement = document.getElementById(`device_name_${deviceId}`);
                const timestampElement = document.getElementById(`timestamp_${deviceId}`);
                const powerConsumptionElement = document.getElementById(`power_consumption_${deviceId}`);
                const powerFactorElement = document.getElementById(`power_factor_${deviceId}`);
                const notConnectedElement = document.getElementById(`not_connected_${deviceId}`);
                const chartCanvas = document.getElementById(`powerChart_${deviceId}`);
                const chartContainer = chartCanvas ? chartCanvas.parentElement : null;
                console.log(deviceIdElement, deviceNameElement, timestampElement, powerConsumptionElement, powerFactorElement); // Check if the elements exist

                if (deviceIdElement && deviceNameElement && timestampElement && powerConsumptionElement && powerFactorElement) {
                    if (deviceData.timestamp) {
                        lastUpdateTimes[deviceId - 1] = currentTime; // Update the last update time
                        isReceivedData[deviceId - 1] = true; // Mark that data has been received at least once

                        // Check if the data has changed
                        if (JSON.stringify(previousData[deviceId - 1]) !== JSON.stringify(deviceData)) {
                            previousData[deviceId - 1] = deviceData; // Update the previous data
                            deviceIdElement.innerHTML = `Device ${deviceData.device_id}`;
                            deviceNameElement.innerText = deviceData.device_name || 'Not Connected';
                            timestampElement.innerText = new Date(deviceData.timestamp * 1000).toLocaleString() || 'Not Connected';
                            powerConsumptionElement.innerText = `${deviceData.power_consumption || 0} W`;
                            powerFactorElement.innerText = deviceData.power_factor || 'Not Connected';

                            if (charts[deviceId - 1]) {
                                const chart = charts[deviceId - 1];
                                const powerConsumption = deviceData.power_consumption || 0;

                                // Update the chart data
                                chart.data.labels.push(new Date(deviceData.timestamp * 1000));
                                chart.data.datasets[0].data.push(powerConsumption);

                                // Calculate running average
                                const totalPoints = chart.data.datasets[0].data.length;
                                runningAverages[deviceId - 1] = (runningAverages[deviceId - 1] * (totalPoints - 1) + powerConsumption) / totalPoints;
                                chart.data.datasets[1].data.push(runningAverages[deviceId - 1]);

                                // Update peak value
                                peakValues[deviceId - 1] = Math.max(peakValues[deviceId - 1], powerConsumption);
                                chart.data.datasets[2].data.push(peakValues[deviceId - 1]);

                                chart.update();
                            }

                            // Update the popup chart if it is open and corresponds to the current device
                            if (currentPopupIndex === deviceId - 1 && popupChart) {
                                const powerConsumption = deviceData.power_consumption || 0;

                                popupChart.data.labels.push(new Date(deviceData.timestamp * 1000));
                                popupChart.data.datasets[0].data.push(powerConsumption);

                                // Calculate running average
                                const totalPoints = popupChart.data.datasets[0].data.length;
                                runningAverages[deviceId - 1] = (runningAverages[deviceId - 1] * (totalPoints - 1) + powerConsumption) / totalPoints;
                                popupChart.data.datasets[1].data.push(runningAverages[deviceId - 1]);

                                // Update peak value
                                peakValues[deviceId - 1] = Math.max(peakValues[deviceId - 1], powerConsumption);
                                popupChart.data.datasets[2].data.push(peakValues[deviceId - 1]);

                                popupChart.update();
                            }

                            if (notConnectedElement && chartContainer) {
                                notConnectedElement.style.display = 'none';
                                chartContainer.style.display = 'block';
                            }
                        } else {
                            // If data is the same, mark power consumption and power factor as 0
                            deviceData.power_consumption = 0;
                            deviceData.power_factor = 0;

                            deviceIdElement.innerHTML = `Device ${deviceId} <span style="color: red;">(disconnected)</span>`;
                            powerConsumptionElement.innerText = '0 W';
                            powerFactorElement.innerText = '0';
                        }
                    } else {
                        if (notConnectedElement && chartContainer) {
                            notConnectedElement.style.display = 'block';
                            chartContainer.style.display = 'none';
                        }
                    }
                } else {
                    console.error(`Element not found for device ${deviceId}`);
                }

                // Add power consumption to consolidated power only if the device is active
                if (deviceData.timestamp && deviceData.power_consumption) {
                    consolidatedPower += deviceData.power_consumption;
                    console.log(`Device ${deviceId} contributing power: ${deviceData.power_consumption} W`); // Debugging statement
                }
            });

            // Update the consolidated power element
            document.getElementById('consolidated_power').innerText = `Consolidated Power: ${consolidatedPower.toFixed(2)} W`;
            console.log(`Consolidated Power: ${consolidatedPower.toFixed(2)} W`); // Debugging statement

            // Check for devices that have not received data for more than 10 seconds
            lastUpdateTimes.forEach((lastUpdateTime, index) => {
                const deviceId = index + 1;
                const deviceIdElement = document.getElementById(`device_id_${deviceId}`);
                if (isReceivedData[index] && (currentTime - lastUpdateTime > 10000)) { // 10 seconds
                    if (deviceIdElement) {
                        deviceIdElement.innerHTML = `Device ${deviceId} <span style="color: red;">(disconnected)</span>`;
                        // Clear the buffer of the reading power and power factor
                        const powerConsumptionElement = document.getElementById(`power_consumption_${deviceId}`);
                        const powerFactorElement = document.getElementById(`power_factor_${deviceId}`);
                        if (powerConsumptionElement) powerConsumptionElement.innerText = '0 W';
                        if (powerFactorElement) powerFactorElement.innerText = '0';
                    }
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
                datasets: [
                    {
                        label: 'Power Consumption (W)',
                        data: [],
                        borderColor: 'rgba(75, 192, 192, 1)',
                        backgroundColor: 'rgba(75, 192, 192, 0.2)',
                        fill: true,
                    },
                    {
                        label: 'Average Power (W)',
                        data: [],
                        borderColor: 'rgba(255, 159, 64, 1)',
                        backgroundColor: 'rgba(255, 159, 64, 0.2)',
                        fill: false,
                        borderDash: [5, 5],
                    },
                    {
                        label: 'Peak Power (W)',
                        data: [],
                        borderColor: 'rgba(255, 99, 132, 1)',
                        backgroundColor: 'rgba(255, 99, 132, 0.2)',
                        fill: false,
                        borderDash: [5, 5],
                    }
                ]
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
    csvContent += "Time,Power Consumption (W),Running Average (W),Peak Value (W)\n";
    data.labels.forEach((label, i) => {
        const row = `${label.toISOString()},${data.datasets[0].data[i]},${data.datasets[1].data[i]},${data.datasets[2].data[i]}`;
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

setInterval(fetchData, 2000); // Fetch data every 2 seconds
window.onload = function() {
    createCharts();
    fetchData();
};

// Add this function to handle the beforeunload event
window.addEventListener('beforeunload', function (e) {
    if (currentPopupIndex !== null) {
        const confirmationMessage = 'You have a popup open. Reloading the page will cause older data to be lost. Do you want to proceed?';
        e.returnValue = confirmationMessage; // Standard for most browsers
        return confirmationMessage; // For some older browsers
    }
});
