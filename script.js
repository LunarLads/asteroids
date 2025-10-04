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

// todo make this function more percise
function shockWaveDecibels(asteroidDiameter, speed, density, impactAngle, radius) {
    // constants
    const P_ref = 20e-6; // reference pressure (Pa)
    const J_PER_KG = 4.184e6; // joules per kg of TNT
    const PSI_TO_PA = 6895; // psi -> Pa conversion

    // asteroid properties
    const rAst = asteroidDiameter / 2;
    const volume = (4 / 3) * Math.PI * Math.pow(rAst, 3);
    const mass = volume * density;

    // vertical component of velocity
    const theta = (impactAngle * Math.PI) / 180;
    const vEff = speed * Math.sin(theta);

    // kinetic energy (J)
    const E = 0.5 * mass * vEff * vEff;

    // TNT equivalent (kilotons)
    const W = E / J_PER_KG;

    // scaled distance
    const Z = radius / Math.cbrt(W);

    const P = (1772 / (Z ** 3) + 114 / (Z ** 2) + 10.4 / Z) * 1000;

    // peak overpressure in psi
    const P_psi = P / 6894;

    // convert to dB SPL
    const db = 20 * Math.log10(P / P_ref);

    return {
        energyJoules: E,
        energyTNT_kilotons: W,
        overpressurePa: P,
        psi: P_psi,
        db: db
    };
}

function getShockWaves(asteroidDiameter, speed, density, impactAngle) {
    const res = [];
    let distance = 1;
    while (res.length == 0 || res[res.length - 1].psi > 3.8) {

        const shochWave = shockWaveDecibels(asteroidDiameter, speed, density, impactAngle, distance * 1000);
        res.push(
            {
                distance,
                db: shochWave.db,
                psi: shochWave.psi
            }
        );
        distance++;
    }

    return res;
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

const asteroidOutputs = {
    widthEl: document.getElementById('result-width'),
    depthEl: document.getElementById('result-depth'),
    soundLevelEl: document.getElementById('result-soundlevel'),
    energyTNTEl: document.getElementById('result-energytnt'),

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

launchBtn.addEventListener('click', function () {
    document.body.classList.add('shake');

    // Remove the class after animation ends to reset
    setTimeout(() => {
        document.body.classList.remove('shake');
    }, 1000); // Matches the animation duration
});

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

    const offsetMeters = radius; // adjust as needed
    const metersPerDegLat = 111320; // approximate
    const latOffsetDeg = offsetMeters / metersPerDegLat;
    const labelLat = curLat - latOffsetDeg * 0.94;
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

    const { density, diameter, speed, angle } = asteroidInputs.getValues();

    console.log("Asteroid: ", asteroidInputs.getValues());

    const { diameter: craterDiameter, depth: craterDepth } = estimateCrater(diameter, speed, angle, density);

    console.log("Crater ", estimateCrater(diameter, speed, angle, density));

    const { db, energyTNT } = shockWaveDecibels(diameter, speed, density, angle, 40);

    console.log("Shockwave ", shockWaveDecibels(diameter, speed, density, angle, 40));

    asteroidOutputs.setCraterWidth(craterDiameter);
    asteroidOutputs.setCraterDepth(craterDepth);
    asteroidOutputs.setSoundLevel(db);
    asteroidOutputs.setEnergyTNT(energyTNT);


    createCircle(curLat, curLng, craterDiameter, "crater", "red", "red", 0.5);

    thresholds = [
        {
            "name": "99% fatal",
            "psi": 70
        },
        {
            "name": "Severe Lung damage",
            "psi": 30
        },
        {
            "name": "Buildings Destruction",
            "psi": 10
        },
        {
            "name": "Eardrums Rupture",
            "psi": 5
        }
    ];


    schockWavePerDistance = getShockWaves(diameter, speed, density, angle);

    thresholds_upd = assignThresholdDistances(thresholds, schockWavePerDistance);
    console.log("Db per distance: ", schockWavePerDistance);

    console.log("Thr Upd ", thresholds_upd);

    thresholds_upd.forEach(obj => {
        createCircle(curLat, curLng, obj.distance * 1000, obj.name, "blue", "#34bbc9", 0.15);
    });


    // Optionally pan to the launch location
    map.panTo([curLat, curLng]);
});


/**
 * For each threshold object adds a `distance` property.
 * distance = first shockWavePerDistance entry.distance where entry.psi >= threshold.psi
 * If no match found, distance is set to null.
 *
 * @param {Array<object>} thresholdsArr  - array of threshold objects ({name, psi, ...})
 * @param {Array<object>} shockArr       - array of shock entries ({distance, db, psi, ...})
 * @returns {Array<object>} the mutated thresholdsArr
 */
function assignThresholdDistances(thresholdsArr, shockArr) {

    thresholdsArr = [...thresholdsArr];

    if (!Array.isArray(thresholdsArr) || !Array.isArray(shockArr)) return thresholdsArr;

    thresholdsArr.forEach(th => {
        const match = shockArr.find(s => Number(th.psi) >= Number(s.psi));
        th.distance = match ? match.distance : null;
    });

    return thresholdsArr;
}

angle_current_value.innerText = angle_ranger.value + "°";

angle_ranger.addEventListener('input', () => {
    angle_current_value.textContent = angle_ranger.value + "°";
});


