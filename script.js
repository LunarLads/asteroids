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

function shockWaveDecibels(asteroidDiameter, speed, density, impactAngle, radius) {
    // constants
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
    const P = 808 * Math.pow(W ** (1 / 3) / radius, 3);

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
    const E = 0.5 * mass * vEff * vEff;

    // fireball diameter scaling (Collins et al.)
    const k = 0.136; // tuned so 1 km / 30 km/s / ρ=3000 gives ~17.7 km
    const diameter_m = k * Math.pow(E, 0.25);
    const diameter_km = diameter_m / 1000;

    return {
        diameter_m,
        diameter_km,
        energy_J: E
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

// Run the full calculation and show results
function calculateMagnitude(diameter, speed, density, angle) {
    const r = diameter / 2;
    const volume = (4 / 3) * Math.PI * Math.pow(r, 3);
    const mass = volume * density;

    // effective vertical velocity
    const theta = (angle * Math.PI) / 180;
    const vEff = speed * Math.sin(theta);

    // kinetic energy (J)
    const E = 0.5 * mass * vEff * vEff;
    f_s = 0.00025;
    if (density >= 7000) {
        f_s = 0.0001;
    } else if (density >= 3000) {
        f_s = 0.00015;
    }
    E_seismic = f_s * E
    const Mw = (2 / 3) * Math.log10(E_seismic) - 3.2;

    console.log(`Moment Magnitude (Mw): ${Mw}`);

    return {
        magnitude: Mw,    
    };
};


//function getMagnitudeWaves(asteroidDiameter, speed, density, E_seismic, angle) {
  //  const res = [];
 //   let distance = 1;
  //  while (res.length == 0 || res[res.length - 1].mmi > 3.8) {

   //     const magnitudeWave = asteroidSeismic(asteroidDiameter, speed, density, E_seismic, angle, distance * 1000);
   //     res.push(
    //        {
    //            distance,
    //            db: magnitudeWave.db,
    //            mmi: magnitudeWave.mmi
    //        }
    //    );
    //    distance++;
   // }

   // return res;
//}

const asteroidOutputs = {
    widthEl: document.getElementById('result-width'),
    depthEl: document.getElementById('result-depth'),
    soundLevelEl: document.getElementById('result-soundlevel'),
    energyTNTEl: document.getElementById('result-energytnt'),
    magnitudeEl: document.getElementById('result-magnitude'),

    setCraterWidth(value) {
        this.widthEl.textContent = value === undefined || value === null ? '--' : String(value);
    },

    setCraterDepth(value) {
        this.depthEl.textContent = value === undefined || value === null ? '--' : String(value);
    },

    setSoundLevel(value) {
        this.soundLevelEl.textContent = value === undefined || value === null ? '--' : String(value);
    },

    setEnergyTNT(value) {
        this.energyTNTEl.textContent = value === undefined || value === null ? '--' : String(value);
    },

    setMagnitude(value) {
        this.magnitudeEl.textContent = value === undefined || value === null ? '--' : String(value);
    },
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

// Launch button: place red circle at curLat/curLng with radius 10000
const launchBtn = document.getElementById('launchBtn');

function createCircle(curLat, curLng, radius, tagName, color, fillColor, fillOpacity) {
    const circle = L.circle([curLat, curLng], {
        color: color,
        fillColor: fillColor,
        fillOpacity: fillOpacity,
        radius: radius
    });

    circle.addTo(map);

    const divIcon = L.divIcon({
        className: '', // keep default wrapper empty
        html: `<div class="crater-label">${tagName}</div>`,
        iconSize: null
    });

    const offsetMeters = radius / 2; // adjust as needed
    const metersPerDegLat = 111320; // approximate
    const latOffsetDeg = offsetMeters / metersPerDegLat;
    const labelLat = curLat - latOffsetDeg * 0.7;
    const labelLng = curLng;//+ latOffsetDeg * 0.8;

    L.marker([labelLat, labelLng], { icon: divIcon, interactive: false }).addTo(map);
}

launchBtn.addEventListener('click', () => {
    console.log("Coords:" + curLat + " " + curLng);

    map.eachLayer(function (layer) {
        if (layer instanceof L.TileLayer) return; // keep tiles
        if (layer instanceof L.Marker && layer === asteroidMarker) return;
        map.removeLayer(layer);
    });

    const { density, diameter, speed, angle, E_seismic } = asteroidInputs.getValues();

    console.log("Asteroid: ", asteroidInputs.getValues());

    const { diameter: craterDiameter, depth: craterDepth } = estimateCrater(diameter, speed, angle, density);

    console.log("Crater ", estimateCrater(diameter, speed, angle, density));

    const { db, energyTNT } = shockWaveDecibels(diameter, speed, density, angle, 40);

    console.log("Shockwave ", shockWaveDecibels(diameter, speed, density, angle, 40));

    const { magnitude } = calculateMagnitude(diameter, speed, density, angle);

    console.log("Seismic ", calculateMagnitude(diameter, speed, density, angle));


    asteroidOutputs.setCraterWidth(craterDiameter);
    asteroidOutputs.setCraterDepth(craterDepth);
    asteroidOutputs.setSoundLevel(db);  
    asteroidOutputs.setEnergyTNT(energyTNT);
    asteroidOutputs.setMagnitude(magnitude);

    createCircle(curLat, curLng, craterDiameter / 2, "crater", 'brown', 'rgba(122, 51, 9, 1)', 0.5);

    if (magnitude > 10) {
        thresholds = [
            {
                "name": "Magnitude 10.0",
                "mmi": 10
            },
            {
                "name": "Magnitude 9.0",
                "mmi": 9
            },
            {
                "name": "Magnitude 8.0",
                "mmi": 8
            },
            {
                "name": "Magnitude 7.0",
                "mmi": 7
            },
            {
                "name": "Magnitude 6.0",
                "mmi": 6
            },
            {
                "name": "Magnitude 5.0",
                "mmi": 5
            },
        ];
    } else if (magnitude > 9) {
        thresholds = [
            {
                "name": "Magnitude 9.0",
                "mmi": 9
            },
            {
                "name": "Magnitude 8.0",
                "mmi": 8
            },
            {
                "name": "Magnitude 7.0",
                "mmi": 7
            },
            {
                "name": "Magnitude 6.0",
                "mmi": 6
            },
            {
                "name": "Magnitude 5.0",
                "mmi": 5
            },
        ];
    } else if (magnitude > 8) {
        thresholds = [
            {
                "name": "Magnitude 8.0",
                "mmi": 8
            },
            {
                "name": "Magnitude 7.0",
                "mmi": 7
            },
            {
                "name": "Magnitude 6.0",
                "mmi": 6
            },
            {
                "name": "Magnitude 5.0",
                "mmi": 5
            },
        ];
    } else if (magnitude > 7) {
        thresholds = [
            {
                "name": "Magnitude 7.0",
                "mmi": 7
            },
            {
                "name": "Magnitude 6.0",
                "mmi": 6
            },
            {
                "name": "Magnitude 5.0",
                "mmi": 5
            },
        ]; 
    } else if (magnitude > 6) {
        thresholds = [
            {
                "name": "Magnitude 6.0",
                "mmi": 6
            },
            {
                "name": "Magnitude 5.0",
                "mmi": 5
            },
        ];
    } else {
        thresholds = [
            {
                "name": "Magnitude 5.0",
                "mmi": 5
            },
        ];
    }
    console.log("Thresholds ", thresholds);

function getMagnitudeWaveDistance(magnitude) {
    
    const base = Math.pow(10,  0.5 * (magnitude - 6));
    
    
    return [
        { mmi: 10, distance: base * 0.5 },
        { mmi: 9, distance: base * 1 },
        { mmi: 8, distance: base * 2 },
        { mmi: 7, distance: base * 5 },
        { mmi: 6, distance: base * 10 },
        { mmi: 5, distance: base * 15 } 
    ];
}
    const magnitudeWavePerDistance = getMagnitudeWaveDistance(magnitude);
    console.log("Magnitude waves per distance ", magnitudeWavePerDistance);


    let thresholds_upd = thresholds.map(thr => {
        const match = magnitudeWavePerDistance.find(s => s.mmi === thr.mmi);
        return { ...thr, distance: match.distance };
    });


    thresholds_upd = assignThresholdDistances(thresholds, magnitudeWavePerDistance);
    console.log("Thresholds ", thresholds_upd);

    thresholds_upd.forEach(obj => {
        createCircle(curLat, curLng, obj.distance * 1000, obj.name, "brown", "rgba(122, 51, 9, 1)", 0.5);
    });


    // Optionally pan to the launch location
    map.panTo([curLat, curLng]);
});



function assignThresholdDistances(thresholdsArr, shockArr) {

    thresholdsArr = [...thresholdsArr];

    if (!Array.isArray(thresholdsArr) || !Array.isArray(shockArr)) return thresholdsArr;

    thresholdsArr.forEach(th => {
        const match = shockArr.find(s => Number(th.mmi) >= Number(s.mmi));
        th.distance = match ? match.distance : null;
    });

    return thresholdsArr;
}


    //L.circle([curLat, curLng], {
    //    color: 'red',
    //    fillColor: '#f03',
    //    fillOpacity: 0.3,
     //   radius: craterDiameter
    //}).addTo(map);
    // Optionally pan to the launch location
    //map.panTo([curLat, curLng]);
//});



// Function to calculate average elevation
function calculateAverageElevation() {
    if (elevationData.length === 0) {
        document.getElementById('info').innerHTML = 'No elevation data collected.';
        return;
    }
    const totalElevation = elevationData.reduce((sum, point) => sum + point.elevation, 0);
    const averageElevation = (totalElevation / elevationData.length).toFixed(2);
    document.getElementById('info').innerHTML += `<br>Average Elevation: ${averageElevation} meters`;
};

angle_current_value.innerText = angle_ranger.value + "°";

angle_ranger.addEventListener('input', () => {
    angle_current_value.textContent = angle_ranger.value + "°";
});


