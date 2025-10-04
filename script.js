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

// // Handle map click to get coordinates and elevation
// map.on('click', async function (e) {
//     const lat = e.latlng.lat.toFixed(4);
//     const lng = e.latlng.lng.toFixed(4);
//     const elevation = await getElevation(lat, lng);
//     if (elevation !== null) {
//         elevationData.push({ lat, lng, elevation });
//         const infoDiv = document.getElementById('info');
//         infoDiv.innerHTML = `Latitude: ${lat}<br>Longitude: ${lng}<br>Elevation: ${elevation} meters<br>Total points: ${elevationData.length}`;
//         // Add a marker at the clicked location
//         L.marker([lat, lng]).addTo(map)
//             .bindPopup(`Lat: ${lat}, Lng: ${lng}<br>Elevation: ${elevation} m`)
//             .openPopup();
//     } else {
//         document.getElementById('info').innerHTML = 'Error fetching elevation data.';
//     }
// });


const latSpan = document.getElementById('coord-lat');
const lngSpan = document.getElementById('coord-lng');

let curLat = 0;
let curLng = 0;

updateCoords = function (lat, lng) {
    if (!latSpan || !lngSpan) return;
    curLat = lat;
    curLng = lng;
    const fLat = Number(lat).toFixed(2);
    const fLng = Number(lng).toFixed(2);
    latSpan.textContent = fLat;
    lngSpan.textContent = fLng;
};

let asteroidMarker = null;

map.on('click', async function (e) {
    const lat = e.latlng.lat;
    const lng = e.latlng.lng;
    // Add a red circle with radius 300 meters at the clicked location

    updateCoords(lat, lng);

    if (asteroidMarker === null) {
        asteroidMarker = L.marker([lat, lng]);
        asteroidMarker.addTo(map);
    }
    else {
        asteroidMarker.setLatLng(L.latLng(lat, lng));
    }

    // L.circle([lat, lng], {
    //     color: 'red',
    //     fillColor: '#f03',
    //     fillOpacity: 0.3,
    //     radius: 10000
    // }).addTo(map);
});

// Launch button: place red circle at curLat/curLng with radius 10000
const launchBtn = document.getElementById('launchBtn');
if (launchBtn) {
    launchBtn.addEventListener('click', () => {
        console.log("Coords:" + curLat + " " + curLng);

        map.eachLayer(function (layer) {
            if (layer instanceof L.TileLayer) return; // keep tiles
            if (layer instanceof L.Marker && layer === asteroidMarker) return;
            map.removeLayer(layer);
        });

        L.circle([curLat, curLng], {
            color: 'red',
            fillColor: '#f03',
            fillOpacity: 0.3,
            radius: 10000
        }).addTo(map);
        // Optionally pan to the launch location
        map.panTo([curLat, curLng]);
        // } else {
        //     alert('No valid launch coordinates set. Click on the map first.');
        // }
    });
}



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