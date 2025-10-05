// Initialize the map

const angle_ranger = document.getElementById('angle-ranger');
const angle_current_value = document.getElementById('angle-current-value');

function estimateCrater(asteroidDiameter, speed, impactAngle, density) {
    const g = 9.81; // gravity m/s²
    const targetDensity = 2500; // rock density kg/m³

    // Convert angle to radians
    const theta = (impactAngle * Math.PI) / 180;

    // Effective velocity component
    const vEffective = speed * Math.sin(theta);

    // Scaling law exponents (from Holsapple/Melosh)
    const mu = 0.22;
    const alpha = 0.78;
    const beta = 0.44;
    const k1 = 1.161;

    // ================= Dust Constants =================
    const R_EARTH = 6.371e6;          // radius of Earth in meters
    const GRAVITY = 9.81;             // m/s²
    const AIR_DENSITY = 1.2;          // kg/m³
    const AIR_VISCOSITY = 1.8e-5;     // Pa·s

    // Final crater diameter (m)
    const finalDiameter =
        k1 *
        Math.pow(g, -mu) *
        Math.pow(density / targetDensity, 1 / 3) *
        Math.pow(asteroidDiameter, alpha) *
        Math.pow(vEffective, beta);

    // Depth ~ 1/3 of diameter (gravity regime)
    let depth = finalDiameter / 3;

    return {
        diameter: finalDiameter,
        depth: depth
    };
}

const asteroidInputs = {
    densityEl: document.getElementById('asteroid-density-input'),
    diameterEl: document.getElementById('asteroid-diameter-input'),
    speedEl: document.getElementById('asteroid-speed-input'),
    angleEl: angle_ranger,

    // parse element value to number (NaN if missing/invalid)
    _toNumber(el) {
        if (!el) return NaN;
        const v = el.value?.trim();
        return v === undefined || v === '' ? NaN : Number(v);
    },

    // return current values as numbers
    getValues() {
        return {
            density: this._toNumber(this.densityEl),
            diameter: this._toNumber(this.diameterEl),
            speed: this._toNumber(this.speedEl),
            angle: this._toNumber(this.angleEl)
        };
    }
};

const asteroidOutputs = {
    widthEl: document.getElementById('result-width'),
    depthEl: document.getElementById('result-depth'),
    temperatureEl: document.getElementById('result-temperature'),// NEW
    windEl: document.getElementById('result-wind'),// NEW
    dustEl: document.getElementById('result-dust'),// NEW
    tsunamiHeightEl: document.getElementById('result-tsunami'), // NEW
    floodRadiusEl: document.getElementById('result-flood'),      // NEW

    setCraterWidth(value) {
        this.widthEl.textContent = value === undefined || value === null ? '--' : String(value);
    },

    setCraterDepth(value) {
        this.depthEl.textContent = value === undefined || value === null ? '--' : String(value);
    },
    setTemperature(value) {
        this.temperatureEl.textContent = value === undefined || value === null ? '--' : String(value);
    },// NEW
    setWind(value) {
        this.windEl.textContent = value === undefined || value === null ? '--' : String(value);
    },// NEW
    setDust(value) { this.dustEl.textContent = value ?? '--'; },//new
    setTsunamiHeight(value) { this.tsunamiHeightEl.textContent = value ?? '--'; },//new
    setFloodRadius(value) { this.floodRadiusEl.textContent = value ?? '--'; }//new
};


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

// ================= Dust & Climate Effects =================
function ejectedMass(asteroidDensity, diameter, fraction = 0.1) {
    return fraction * asteroidDensity * Math.pow(diameter, 3);
}

function opticalDepth(dustMass, dustRadius, dustDensity) {
    return (3 * dustMass) / (4 * Math.PI * Math.pow(R_EARTH, 2) * dustRadius * dustDensity);
}

function sunlightFraction(tau) {
    return Math.exp(-tau);
}

function settlingVelocity(particleRadius, particleDensity) {
    return (2 * Math.pow(particleRadius, 2) * GRAVITY * (particleDensity - AIR_DENSITY)) / (9 * AIR_VISCOSITY);
}

function settlingTime(particleRadius, particleDensity, stratosphereHeight = 20000) {
    const v_s = settlingVelocity(particleRadius, particleDensity);
    return stratosphereHeight / v_s;
}

function globalSpreadTime(windSpeed = 40) {
    return (2 * Math.PI * R_EARTH) / windSpeed;
}

// ================= Dust Radius Over Time =================
function dustRadius(timeSeconds, diffusionCoefficient = 5000) {
    return Math.sqrt(2 * diffusionCoefficient * timeSeconds);
}

// ================= Tsunami Generation =================
function craterDiameterForTsunami(mass, velocity, targetDensity = 1000, gravity = 9.81, angle = Math.PI/2, k = 1) {
    return k * Math.pow(mass / targetDensity, 1/3) * Math.pow(velocity, 0.44) * Math.pow(gravity, -0.22) * Math.pow(Math.sin(angle), 1/3);
}

function initialWaveHeight(craterDiameter) {
    return 0.1 * craterDiameter;
}

function waveHeightAtDistance(H0, craterDiameter, distance) {
    return H0 * Math.pow(craterDiameter / distance, 0.5);
}

// Launch button: place red circle at curLat/curLng with radius 10000
const launchBtn = document.getElementById('launchBtn');

launchBtn.addEventListener('click', async () => {
    console.log("Coords:" + curLat + " " + curLng);

    map.eachLayer(function (layer) {
        if (layer instanceof L.TileLayer) return; // keep tiles
        if (layer instanceof L.Marker && layer === asteroidMarker) return;
        map.removeLayer(layer);
    });

    const { density, diameter, speed, angle } = asteroidInputs.getValues();

    console.log("Asteroid: ", asteroidInputs.getValues());

    const { diameter: craterDiameter, depth: craterDepth } = estimateCrater(diameter, speed, angle, density);

    console.log("Crater ", estimateCrater(diameter, speed, angle, density));

    asteroidOutputs.setCraterWidth(craterDiameter);
    asteroidOutputs.setCraterDepth(craterDepth);
    const maxTemp = (0.5 * density * Math.pow(speed, 2)) / 4200; // ~J/kg*K → °C scale
    asteroidOutputs.setTemperature(maxTemp.toFixed(0));
    const maxWind = (speed * 0.2) * 3.6; // km/h
    asteroidOutputs.setWind(maxWind.toFixed(2));


    L.circle([curLat, curLng], {
        color: 'red',
        fillColor: '#f03',
        fillOpacity: 0.3,
        radius: craterDiameter
    }).addTo(map);

        // Dust calculations
    const mass = ejectedMass(density, diameter); // total ejected mass
    const hours = document.getElementById('dust-time').value;
    const t = hours * 3600; // example: 1 hour after impact (you’ll replace with user input later)
    const dustR = dustRadius(t); // radius spread in meters

    asteroidOutputs.setDust((dustR / 1000).toFixed(2) + " km"); // show km in UI

    // Draw dust circle on map
    L.circle([curLat, curLng], {
        color: 'gray',
        fillColor: 'gray',
        fillOpacity: 0.2,
        radius: dustR
    }).addTo(map).bindPopup("Dust coverage zone after " + (t/3600) + "h<br>Airborne protection needed");

    // Tsunami calculations (only if impact in water)
    const tsunamiMass = density * Math.pow(diameter, 3); // rename variable
    const angleRad = (angle * Math.PI) / 180;
    const craterD = craterDiameterForTsunami(tsunamiMass, speed, 1000, 9.81, angleRad);
    const H0 = initialWaveHeight(craterD);

    // Example: flooded area up to 50 km radius (or adapt to map)
    const floodRadius = 50000; // meters, can adjust based on distance or user input
    const H_at_distance = waveHeightAtDistance(H0, craterD, floodRadius);

    asteroidOutputs.setTsunamiHeight(H_at_distance.toFixed(2));
    asteroidOutputs.setFloodRadius((floodRadius / 1000).toFixed(2)); // in km

    // Check elevation before showing tsunami
const elevation = await getElevation(curLat, curLng);

if (elevation !== null) {
    if (elevation <= 0) { // Water
        // Show tsunami circle
        L.circle([curLat, curLng], {
            color: 'blue',
            fillColor: 'blue',
            fillOpacity: 0.2,
            radius: floodRadius
        }).addTo(map).bindPopup("Potential flooded area<br>Wave height: " + H_at_distance.toFixed(2) + " m");

        // Set outputs
        asteroidOutputs.setTsunamiHeight(H_at_distance.toFixed(2));
        asteroidOutputs.setFloodRadius((floodRadius / 1000).toFixed(2));
    } else { // Land → no tsunami
        console.log("Asteroid landed on land, no tsunami generated.");

        // Set outputs to 0
        asteroidOutputs.setTsunamiHeight("0");
        asteroidOutputs.setFloodRadius("0");
    }
} else {
    console.log("Elevation data not available.");

    // Optional: set outputs to 0 if elevation cannot be fetched
    asteroidOutputs.setTsunamiHeight("0");
    asteroidOutputs.setFloodRadius("0");
}


    // Optionally pan to the launch location
    map.panTo([curLat, curLng]);
    // } else {
    //     alert('No valid launch coordinates set. Click on the map first.');
    // }
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



angle_current_value.innerText = angle_ranger.value + "°";

angle_ranger.addEventListener('input', () => {
    angle_current_value.textContent = angle_ranger.value + "°";
});