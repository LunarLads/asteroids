// Initialize the map
const map = L.map('map').setView([0, 0], 2);

// Base map layer (OpenStreetMap)
const baseMap = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    maxZoom: 19
});

// Relief map layer (OpenTopoMap)
const reliefMap = L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://opentopomap.org">OpenTopoMap</a> (CC-BY-SA)',
    maxZoom: 17
});

// Add base map by default
baseMap.addTo(map);

// Toggle between base and relief maps
let isRelief = false;
function toggleMap() {
    if (isRelief) {
        map.removeLayer(reliefMap);
        baseMap.addTo(map);
        document.getElementById('toggleButton').innerText = 'Toggle Relief Map';
    } else {
        map.removeLayer(baseMap);
        reliefMap.addTo(map);
        document.getElementById('toggleButton').innerText = 'Toggle Standard Map';
    }
    isRelief = !isRelief;
}

// Array to store coordinate-elevation data
let elevationData = [];

// Function to fetch elevation from Open-Elevation API
async function getElevation(lat, lng) {
    const url = `https://api.open-elevation.com/api/v1/lookup?locations=${lat},${lng}`;
    try {
        const response = await fetch(url);
        const data = await response.json();
        if (data.results && data.results.length > 0) {
            return data.results[0].elevation;
        } else {
            return null;
        }
    } catch (error) {
        console.error('Error fetching elevation:', error);
        return null;
    }
}

// Handle map click to get coordinates and elevation
map.on('click', async function (e) {
    const lat = e.latlng.lat.toFixed(4);
    const lng = e.latlng.lng.toFixed(4);
    const elevation = await getElevation(lat, lng);
    if (elevation !== null) {
        elevationData.push({ lat, lng, elevation });
        const infoDiv = document.getElementById('info');
        infoDiv.innerHTML = `Latitude: ${lat}<br>Longitude: ${lng}<br>Elevation: ${elevation} meters<br>Total points: ${elevationData.length}`;
        // Add a marker at the clicked location
        L.marker([lat, lng]).addTo(map)
            .bindPopup(`Lat: ${lat}, Lng: ${lng}<br>Elevation: ${elevation} m`)
            .openPopup();
    } else {
        document.getElementById('info').innerHTML = 'Error fetching elevation data.';
    }
});

// Function to calculate average elevation
function calculateAverageElevation() {
    if (elevationData.length === 0) {
        document.getElementById('info').innerHTML = 'No elevation data collected.';
        return;
    }
    const totalElevation = elevationData.reduce((sum, point) => sum + point.elevation, 0);
    const averageElevation = (totalElevation / elevationData.length).toFixed(2);
    document.getElementById('info').innerHTML += `<br>Average Elevation: ${averageElevation} meters`;
}