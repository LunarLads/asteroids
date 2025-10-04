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

// Map state
let isRelief = false;
let elevationData = [];
let asteroidMarker = null;
let impactCircles = [];
let craterLabels = [];

// Global variables for current coordinates
let curLat = 0;
let curLng = 0;

// DOM Elements
const angle_ranger = document.getElementById('angle-ranger');
const angle_current_value = document.getElementById('angle-current-value');
const latSpan = document.getElementById('coord-lat');
const lngSpan = document.getElementById('coord-lng');
const launchBtn = document.getElementById('launchBtn');

// Initialize angle display and indicator
function initializeAngleIndicator() {
    const angle = angle_ranger.value;
    angle_current_value.textContent = angle + "°";
    
    // Update the angle line indicator position
    const indicator = document.getElementById('angle-line-indicator');
    if (indicator) {
        const percentage = (angle / 90) * 100;
        indicator.style.left = percentage + '%';
    }
}

// Impact calculation functions
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

    // Final crater diameter (m)
    const finalDiameter = k1 *
        Math.pow(g, -mu) *
        Math.pow(density / targetDensity, 1 / 3) *
        Math.pow(asteroidDiameter, alpha) *
        Math.pow(vEffective, beta);

    // Depth ~ 1/3 of diameter (gravity regime)
    const depth = finalDiameter / 3;

    return {
        diameter: finalDiameter,
        depth: depth
    };
}

function shockWaveDecibels(asteroidDiameter, speed, density, impactAngle, radius) {
    const P_ref = 20e-6; // reference pressure (Pa)
    const TNT_J = 4.184e9; // joules per ton TNT

    // asteroid properties
    const r = asteroidDiameter / 2;
    const volume = (4 / 3) * Math.PI * Math.pow(r, 3);
    const mass = volume * density;

    // effective velocity (account for impact angle, vertical=90°)
    const vEffective = speed * Math.sin((impactAngle * Math.PI) / 180);

    // kinetic energy (Joules)
    const E = 0.5 * mass * Math.pow(vEffective, 2);

    // TNT equivalent (tons)
    const W = E / TNT_J;

    // peak overpressure at radius (Pa), cube law approximation
    const P = 808 * Math.pow(Math.pow(W, 1/3) / radius, 3);

    // convert to dB SPL
    const db = 20 * Math.log10(P / P_ref);

    return {
        energyJoules: E,
        energyTNT: W,
        overpressurePa: P,
        db: db
    };
}

function estimateFireballDiameter(asteroidDiameter, speed, impactAngle, density) {
    const r = asteroidDiameter / 2;
    const volume = (4 / 3) * Math.PI * Math.pow(r, 3);
    const mass = volume * density;

    // effective vertical velocity
    const theta = (impactAngle * Math.PI) / 180;
    const vEff = speed * Math.sin(theta);

    // kinetic energy (J)
    const E = 0.5 * mass * Math.pow(vEff, 2);

    // fireball diameter scaling (Collins et al.)
    const k = 0.136;
    const diameter_m = k * Math.pow(E, 0.25);
    const diameter_km = diameter_m / 1000;

    return {
        diameter_m,
        diameter_km,
        energy_J: E
    };
}

function asteroidImpactFullDecay(diameter, density, velocity, overpressure, maxDistanceKm = 100) {
    // 1. Asteroid mass (spherical)
    const radius = diameter / 2;
    const volume = (4 / 3) * Math.PI * Math.pow(radius, 3);
    const mass = density * volume;

    // 2. Kinetic energy
    const kineticEnergy = 0.5 * mass * Math.pow(velocity, 2);

    // 3. Shock wave wind speed at epicenter
    const airDensity = 1.225; // kg/m³
    const windSpeed = Math.sqrt((2 * overpressure) / airDensity);
    const windSpeedKmh = windSpeed * 3.6;

    // 4. Wind decay with distance (each kilometer)
    const r0 = 1000; // base distance 1 km
    const alpha = 0.5; // decay coefficient
    const windDecay = [];

    for (let km = 1; km <= maxDistanceKm; km++) {
        const r = km * 1000; // convert to meters
        const v = windSpeed * Math.pow(r0 / r, alpha);
        windDecay.push({ 
            distanceKm: km, 
            windSpeed: v, 
            windSpeedKmh: v * 3.6 
        });
    }

    return {
        mass,
        kineticEnergy,
        windSpeed,
        windSpeedKmh,
        windDecay
    };
}

// Asteroid Inputs Manager
const asteroidInputs = {
    densityEl: document.getElementById('asteroid-density-input'),
    diameterEl: document.getElementById('asteroid-diameter-input'),
    speedEl: document.getElementById('asteroid-speed-input'),
    angleEl: angle_ranger,

    _toNumber(el) {
        if (!el) return NaN;
        const v = el.value?.trim();
        return v === undefined || v === '' ? NaN : Number(v);
    },

    getValues() {
        return {
            density: this._toNumber(this.densityEl),
            diameter: this._toNumber(this.diameterEl),
            speed: this._toNumber(this.speedEl),
            angle: this._toNumber(this.angleEl)
        };
    },

    validateValues() {
        const values = this.getValues();
        const errors = [];
        
        if (isNaN(values.density) || values.density < 1000 || values.density > 8000) {
            errors.push('Density must be between 1000 and 8000 kg/m³');
        }
        if (isNaN(values.diameter) || values.diameter < 10 || values.diameter > 100000) {
            errors.push('Diameter must be between 10 and 100,000 meters');
        }
        if (isNaN(values.speed) || values.speed < 1000 || values.speed > 100000) {
            errors.push('Speed must be between 1000 and 100,000 m/s');
        }
        if (isNaN(values.angle) || values.angle < 0 || values.angle > 90) {
            errors.push('Angle must be between 0 and 90 degrees');
        }
        
        return { isValid: errors.length === 0, errors };
    }
};

// Asteroid Outputs Manager
const asteroidOutputs = {
    widthEl: document.getElementById('result-width'),
    depthEl: document.getElementById('result-depth'),
    soundLevelEl: document.getElementById('result-soundlevel'),
    energyTNTEl: document.getElementById('result-energytnt'),

    setCraterWidth(value) {
        this._setValue(this.widthEl, value, 'm');
    },

    setCraterDepth(value) {
        this._setValue(this.depthEl, value, 'm');
    },

    setSoundLevel(value) {
        this._setValue(this.soundLevelEl, value, 'dB');
    },

    setEnergyTNT(value) {
        this._setValue(this.energyTNTEl, value, 'tons');
    },

    _setValue(element, value, unit = '') {
        if (value === undefined || value === null || isNaN(value)) {
            element.textContent = '--';
            return;
        }
        
        let formattedValue;
        if (value >= 1e12) {
            formattedValue = (value / 1e12).toFixed(2) + 'T';
        } else if (value >= 1e9) {
            formattedValue = (value / 1e9).toFixed(2) + 'B';
        } else if (value >= 1e6) {
            formattedValue = (value / 1e6).toFixed(2) + 'M';
        } else if (value >= 1e3) {
            formattedValue = (value / 1e3).toFixed(2) + 'k';
        } else {
            formattedValue = value.toFixed(2);
        }
        
        element.textContent = `${formattedValue} ${unit}`;
    },

    clearResults() {
        this.setCraterWidth(null);
        this.setCraterDepth(null);
        this.setSoundLevel(null);
        this.setEnergyTNT(null);
    }
};

// Map Functions
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

function updateCoords(lat, lng) {
    if (!latSpan || !lngSpan) return;
    curLat = lat;
    curLng = lng;
    const fLat = Number(lat).toFixed(4);
    const fLng = Number(lng).toFixed(4);
    latSpan.textContent = fLat;
    lngSpan.textContent = fLng;
}

function createCraterLabel(lat, lng, text, radius) {
    const divIcon = L.divIcon({
        className: 'crater-label',
        html: `<div class="crater-label-text">${text}</div>`,
        iconSize: [100, 20]
    });

    // Position label slightly above the crater
    const offsetMeters = radius * 0.6;
    const metersPerDegLat = 111320;
    const latOffsetDeg = offsetMeters / metersPerDegLat;
    const labelLat = lat - latOffsetDeg;

    const label = L.marker([labelLat, lng], { 
        icon: divIcon, 
        interactive: false 
    }).addTo(map);
    
    craterLabels.push(label);
    return label;
}

function clearPreviousImpact() {
    // Remove previous impact circles
    impactCircles.forEach(circle => {
        map.removeLayer(circle);
    });
    impactCircles = [];

    // Remove previous crater labels
    craterLabels.forEach(label => {
        map.removeLayer(label);
    });
    craterLabels = [];
}

// Event Listeners
angle_ranger.addEventListener('input', () => {
    const angle = angle_ranger.value;
    angle_current_value.textContent = angle + "°";
    
    // Update the angle line indicator position
    const indicator = document.getElementById('angle-line-indicator');
    if (indicator) {
        const percentage = (angle / 90) * 100;
        indicator.style.left = percentage + '%';
    }
});

map.on('click', async function (e) {
    const lat = e.latlng.lat;
    const lng = e.latlng.lng;

    updateCoords(lat, lng);

    // Get elevation data
    const elevation = await getElevation(lat, lng);
    const infoDiv = document.getElementById('info');
    if (elevation !== null) {
        elevationData.push({ lat, lng, elevation });
        infoDiv.innerHTML = `📍 Location: ${lat.toFixed(4)}, ${lng.toFixed(4)}<br>🏔️ Elevation: ${elevation.toFixed(0)} meters`;
    } else {
        infoDiv.innerHTML = '📍 Location set<br>⚠️ Could not fetch elevation data';
    }

    // Update or create asteroid marker
    if (asteroidMarker === null) {
        asteroidMarker = L.marker([lat, lng], {
            icon: L.divIcon({
                className: 'asteroid-marker',
                html: '☄️',
                iconSize: [30, 30]
            })
        }).addTo(map);
    } else {
        asteroidMarker.setLatLng([lat, lng]);
    }
});

launchBtn.addEventListener('click', () => {
    // Validate coordinates
    if (curLat === 0 && curLng === 0) {
        alert('Please select an impact location on the map first!');
        return;
    }

    // Validate inputs
    const validation = asteroidInputs.validateValues();
    if (!validation.isValid) {
        alert('Please fix the following errors:\n' + validation.errors.join('\n'));
        return;
    }

    const { density, diameter, speed, angle } = asteroidInputs.getValues();

    console.log("Asteroid Parameters:", { density, diameter, speed, angle });
    console.log("Impact Location:", { curLat, curLng });

    // Calculate impact effects
    const crater = estimateCrater(diameter, speed, angle, density);
    const shockwave = shockWaveDecibels(diameter, speed, density, angle, 40);
    const fireball = estimateFireballDiameter(diameter, speed, angle, density);
    const windDecay = asteroidImpactFullDecay(diameter, density, speed, shockwave.overpressurePa, 100);

    console.log("Crater:", crater);
    console.log("Shockwave:", shockwave);
    console.log("Fireball:", fireball);
    console.log("Wind Decay:", windDecay);

    // Update UI with results
    asteroidOutputs.setCraterWidth(crater.diameter);
    asteroidOutputs.setCraterDepth(crater.depth);
    asteroidOutputs.setSoundLevel(shockwave.db);
    asteroidOutputs.setEnergyTNT(shockwave.energyTNT);

    // Clear previous impact visualization
    clearPreviousImpact();

    // Create crater visualization
    const craterCircle = L.circle([curLat, curLng], {
        color: '#e74c3c',
        fillColor: '#c0392b',
        fillOpacity: 0.3,
        radius: crater.diameter / 2
    }).addTo(map);

    impactCircles.push(craterCircle);

    // Create crater label
    createCraterLabel(curLat, curLng, `Crater: ${(crater.diameter / 1000).toFixed(2)} km`, crater.diameter / 2);

    // Create fireball visualization (if significant)
    if (fireball.diameter_km > 1) {
        const fireballCircle = L.circle([curLat, curLng], {
            color: '#f39c12',
            fillColor: '#f1c40f',
            fillOpacity: 0.2,
            radius: fireball.diameter_m / 2
        }).addTo(map);

        impactCircles.push(fireballCircle);
        createCraterLabel(curLat, curLng, `Fireball: ${fireball.diameter_km.toFixed(2)} km`, fireball.diameter_m / 2);
    }

    // Pan to impact location
    map.panTo([curLat, curLng]);

    // Update info with impact summary
    const infoDiv = document.getElementById('info');
    infoDiv.innerHTML = `💥 Impact simulated!<br>
                        🕳️ Crater: ${(crater.diameter / 1000).toFixed(2)} km diameter<br>
                        💣 Energy: ${(shockwave.energyTNT / 1e6).toFixed(1)} megatons TNT`;
});

function calculateAverageElevation() {
    if (elevationData.length === 0) {
        document.getElementById('info').innerHTML = 'No elevation data collected. Click on the map first.';
        return;
    }
    
    const totalElevation = elevationData.reduce((sum, point) => sum + point.elevation, 0);
    const averageElevation = (totalElevation / elevationData.length).toFixed(2);
    
    document.getElementById('info').innerHTML += `<br>📊 Average Elevation: ${averageElevation} meters (${elevationData.length} points)`;
}

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    // Initialize angle indicator
    initializeAngleIndicator();
    
    // Add custom CSS for crater labels and markers
    const style = document.createElement('style');
    style.textContent = `
        .crater-label-text {
            background: rgba(0, 0, 0, 0.7);
            color: white;
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 12px;
            font-weight: bold;
            text-align: center;
            white-space: nowrap;
        }
        .asteroid-marker {
            background: transparent;
            border: none;
        }
        .angle-line-indicator {
            position: absolute;
            top: -8px;
            width: 3px;
            height: 20px;
            background: #2c3e50;
            transform: translateX(-50%);
            transition: left 0.3s ease;
        }
    `;
    document.head.appendChild(style);
    
    console.log('Asteroid Impact Simulator initialized');
});