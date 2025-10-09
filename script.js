// Initialize the map
const map = L.map('map').setView([0, 0], 2); // Initial view set to [0, 0] at zoom level 2

// Base map layer (Standard)
const baseMap = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 19,
  attribution: '© OpenStreetMap contributors'
});

// Relief map layer
const reliefMap = L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
  maxZoom: 17,
  attribution: 'Map data: © OpenStreetMap contributors, SRTM | Map style: © OpenTopoMap (CC-BY-SA)'
});

// Start with the standard map
baseMap.addTo(map);

let isRelief = false;
let curLat = 0;
let curLng = 0;
let asteroidMarker = null;
let lastCalculationResults = null;
let activeTab = 'crater';
let circleLayers = []; // Array to store all impact circles

const angle_ranger = document.getElementById('angle-ranger');
const angle_current_value = document.getElementById('angle-current-value');
const launchBtn = document.getElementById('launchBtn');
const dustHoursInput = document.getElementById('dust-hours-input');

// NEW: Internationalization/Translation Setup
const translations = {
  en: {
    // index.html strings (data-i18n)
    appTitle: '☄️Asteroid Launcher',
    languageLabel: 'Language 🌐',
    locationTitle: 'Meteor Location 📍',
    latitudeLabel: 'Latitude:',
    longitudeLabel: 'Longitude:',
    densityLabel: 'Asteroid Density (kg/m³) ⚖️',
    enterDensityPlaceholder: 'Enter density',
    diameterLabel: 'Diameter (m) 📏',
    enterDiameterPlaceholder: 'Enter diameter',
    speedLabel: 'Speed (m/s) ⚡',
    enterSpeedPlaceholder: 'Enter speed',
    angleLabel: 'Angle (0-90°) 📐',
    zeroDegrees: '0°',
    ninetyDegrees: '90°',
    launchButton: 'Launch 🚀',
    resultTitle: 'Result 📊',
    craterTab: 'Crater 🕳️',
    shockwaveTab: 'Shockwave 💥',
    earthquakeTab: 'Earthquake 🌍',
    dustTab: 'Dust ☁️',
    craterResultTitle: 'Crater 🕳️',
    widthResult: 'Width:',
    depthResult: 'Depth:',
    soundLevelResult: 'Sound Level:',
    energyTNTResult: 'Energy Trinitrotoluene (TNT):',
    earthquakeResultTitle: 'Earthquake 🌍',
    momentMagnitudeResult: 'Moment Magnitude:',
    richterMagnitudeResult: 'Richter Magnitude:',
    intensityResult: 'Intensity:',
    distanceResult: 'Distance:',
    dustResultTitle: 'Dust Cloud ☁️',
    hoursInputLabel: 'Hours After Impact ⏰',
    enterHoursPlaceholder: 'Enter hours',
    radiusResult: 'Radius:',
    heightResult: 'Height:',
    densityResult: 'Density:',
    // Dynamic text
    toggleRelief: 'Toggle Relief Map',
    toggleStandard: 'Toggle Standard Map',
    fatalThreshold: '99% fatal',
    severeLungDamageThreshold: 'Severe Lung damage',
    buildingDestructionThreshold: 'Buildings Destruction',
    eardrumsRuptureThreshold: 'Eardrums Rupture',
    devastatingEqThreshold: 'Devastating (Mw 8+)',
    strongEqThreshold: 'Strong (Mw 6+)',
    lightEqThreshold: 'Light (Mw 4+)',
    craterLabel: 'crater',
    radiusLabelAtHours: 'km radius at', // used for dust marker
  },
  es: {
    // index.html strings (data-i18n)
    appTitle: '☄️Lanzador de Asteroides',
    languageLabel: 'Idioma 🌐',
    locationTitle: 'Ubicación del Meteorito 📍',
    latitudeLabel: 'Latitud:',
    longitudeLabel: 'Longitud:',
    densityLabel: 'Densidad del Asteroide (kg/m³) ⚖️',
    enterDensityPlaceholder: 'Introducir densidad',
    diameterLabel: 'Diámetro (m) 📏',
    enterDiameterPlaceholder: 'Introducir diámetro',
    speedLabel: 'Velocidad (m/s) ⚡',
    enterSpeedPlaceholder: 'Introducir velocidad',
    angleLabel: 'Ángulo (0-90°) 📐',
    zeroDegrees: '0°',
    ninetyDegrees: '90°',
    launchButton: 'Lanzar 🚀',
    resultTitle: 'Resultado 📊',
    craterTab: 'Cráter 🕳️',
    shockwaveTab: 'Onda Expansiva 💥',
    earthquakeTab: 'Terremoto 🌍',
    dustTab: 'Polvo ☁️',
    craterResultTitle: 'Cráter 🕳️',
    widthResult: 'Ancho:',
    depthResult: 'Profundidad:',
    soundLevelResult: 'Nivel de Sonido:',
    energyTNTResult: 'Energía Trinitrotolueno (TNT):',
    earthquakeResultTitle: 'Terremoto 🌍',
    momentMagnitudeResult: 'Magnitud de Momento:',
    richterMagnitudeResult: 'Magnitud de Richter:',
    intensityResult: 'Intensidad:',
    distanceResult: 'Distancia:',
    dustResultTitle: 'Nube de Polvo ☁️',
    hoursInputLabel: 'Horas Después del Impacto ⏰',
    enterHoursPlaceholder: 'Introducir horas',
    radiusResult: 'Radio:',
    heightResult: 'Altura:',
    densityResult: 'Densidad:',
    // Dynamic text
    toggleRelief: 'Cambiar a Mapa de Relieve',
    toggleStandard: 'Cambiar a Mapa Estándar',
    fatalThreshold: '99% mortal',
    severeLungDamageThreshold: 'Daño pulmonar grave',
    buildingDestructionThreshold: 'Destrucción de edificios',
    eardrumsRuptureThreshold: 'Ruptura de tímpanos',
    devastatingEqThreshold: 'Devastador (Mw 8+)',
    strongEqThreshold: 'Fuerte (Mw 6+)',
    lightEqThreshold: 'Ligero (Mw 4+)',
    craterLabel: 'cráter',
    radiusLabelAtHours: 'km de radio en', // used for dust marker
  }
};

function translatePage(lang) {
  const t = translations[lang];
  if (!t) return;

  // 1. Static text in HTML (data-i18n)
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    if (t[key]) {
      el.textContent = t[key];
    }
  });

  // 2. Placeholder attributes (data-i18n-placeholder)
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    const key = el.getAttribute('data-i18n-placeholder');
    if (t[key]) {
      el.setAttribute('placeholder', t[key]);
    }
  });

  // 3. Update result labels (data-i18n-label)
  document.querySelectorAll('[data-i18n-label]').forEach(el => {
    const key = el.getAttribute('data-i18n-label');
    if (t[key]) {
      const newLabel = t[key];
      // Get the current content's parts
      const resultSpan = el.querySelector('span[id^="result-"], span[id^="coord-"]');
      let resultSpanHTML = resultSpan ? resultSpan.outerHTML : '';
      
      // Attempt to preserve the unit (like 'm', 'Mw', 'km') outside the span
      // This is a robust way to extract the unit/suffix if it exists after the span
      const originalText = el.textContent.trim();
      const spanText = resultSpan ? resultSpan.textContent : '';
      const unitMatch = originalText.match(new RegExp(spanText + '\\s*([a-zA-Z\\/\\³]+)'));
      const unit = unitMatch ? unitMatch[1] : '';

      let newHTML = newLabel;
      if (resultSpanHTML) {
        newHTML += ' ' + resultSpanHTML;
      }
      if (unit && !newHTML.includes(unit)) {
        newHTML += ' ' + unit;
      }

      el.innerHTML = newHTML.trim();
    }
  });

  // 4. Update the HTML lang attribute
  document.documentElement.lang = lang;
  
  // 5. Update Map Toggle Button Text
  const toggleButton = document.getElementById('toggleButton');
  if (toggleButton) {
     toggleButton.innerText = isRelief ? t.toggleStandard : t.toggleRelief;
  }
}

// Event listener for language selector
const langSelect = document.getElementById('language-select');
if (langSelect) {
  langSelect.addEventListener('change', (e) => {
    translatePage(e.target.value);
  });
}

// Initial translation on load (default to 'en' or the selected value if set)
window.addEventListener('load', () => {
  translatePage(langSelect ? langSelect.value : 'en');
});
// END NEW Internationalization/Translation Setup

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
  const J_PER_KG = 4.184e6; // 1 kg of TNT in Joules (approx)

  // Energy calculation
  const mass = (4 / 3) * Math.PI * Math.pow(asteroidDiameter / 2, 3) * density;
  const energyJoules = 0.5 * mass * Math.pow(speed, 2);

  // Energy in kg of TNT
  const energyTNTKg = energyJoules / J_PER_KG;

  // Simplified shockwave overpressure (Pa) for a surface burst
  // E is energy in Joules, R is distance in meters
  // p_atm = 101325 Pa (Standard atmospheric pressure)
  const E = energyJoules;
  const R = radius;
  const overpressure = 12 * Math.pow(E, 1 / 3) / Math.pow(R, 2); // Highly simplified formula

  // Decibels (dB) formula for sound pressure level (SPL)
  // SPL = 20 * log10(P / P_ref) where P is the RMS pressure (Pa). 
  // We use overpressure as an approximation for the pressure pulse amplitude.
  let db = 20 * Math.log10(overpressure / P_ref);

  // Apply angle factor (less airblast at low angles)
  // 90deg -> 1.0, 0deg -> 0.1 (example)
  const angleFactor = Math.sin((impactAngle * Math.PI) / 180);
  db = db * angleFactor;

  return {
    db: db,
    energyTNTKg: energyTNTKg
  };
}

function estimateEarthquakeMagnitude(asteroidDiameter, speed, impactAngle, density, distance_m) {
  // Constants
  const mass = (4 / 3) * Math.PI * Math.pow(asteroidDiameter / 2, 3) * density;
  const energyJoules = 0.5 * mass * Math.pow(speed, 2);

  // Moment Magnitude (Mw) - based on energy release
  // log10(E) = 1.5*Mw + 4.8 (where E is in Joules)
  const moment_magnitude = (Math.log10(energyJoules) - 4.8) / 1.5;

  // Richter Magnitude (ML) - highly variable and less accurate for large impacts
  // Using a simplified conversion/approximation
  const richter_magnitude = moment_magnitude * 1.05 - 0.5;

  // Intensity (MMI - Modified Mercalli Intensity) - approximation based on distance and Mw
  // MMI at distance R (in km) from source with Mw
  const distance_km = distance_m / 1000;
  // This formula is a highly speculative simplification for a large impact
  let intensity = moment_magnitude * 1.5 - 2.5 * Math.log10(distance_km);

  // Clamp intensity to 12 (max MMI)
  intensity = Math.max(1, Math.min(12, intensity));

  return {
    moment_magnitude: moment_magnitude,
    richter_magnitude: richter_magnitude,
    intensity: intensity,
    distance_km: distance_km.toFixed(0) // Distance at which this estimate is made
  };
}

function calculateDustCloud(diameter, speed, impactAngle, density, hoursAfterImpact) {
  // Constants
  const R_A = diameter / 2; // Asteroid radius (m)
  const M_A = (4 / 3) * Math.PI * Math.pow(R_A, 3) * density; // Asteroid mass (kg)
  const E_K = 0.5 * M_A * Math.pow(speed, 2); // Kinetic Energy (J)
  const impact_angle_rad = (impactAngle * Math.PI) / 180;

  // Simplified Dust Ejecta Mass (M_E) estimation (mass of dust ejected into the atmosphere)
  // M_E is roughly 10-100 times the mass of the projectile for a large impact.
  // Using a conservative factor based on energy.
  const M_E = 10 * M_A * Math.pow(E_K / 1e18, 0.1); // Scaled based on E_K, for large events.

  // Cloud Radius (R_cloud) and Height (H_cloud) at T seconds after impact
  const T = hoursAfterImpact * 3600; // Time in seconds

  // Cloud radius (m) - simplified diffusion model
  const diffusion_coeff = 100; // m²/s (atmospheric diffusion coefficient, highly simplified)
  const R_cloud = Math.pow(E_K, 1 / 4) * Math.pow(T, 3 / 4) / 100; // Very rough
  // Use a more stable, time-dependent formula for radius growth.
  const R_cloud_growth = 10000 * hoursAfterImpact * Math.log10(M_E / 1e12 + 1) * 1000; // meters

  // Cloud height (m) - simplified scaling based on impact energy
  // Z(max) ~ 20 * E_K^(1/4) (Z in km, E_K in megatons TNT)
  const E_TNT_MT = (E_K / 4.184e15); // Energy in megatons TNT
  let H_cloud_max = 20 * Math.pow(E_TNT_MT, 1 / 4); // km

  // Simplified height decay (assuming max height at T=1hr, decay after)
  let H_cloud = H_cloud_max * 1000; // meters (max height)
  if (hoursAfterImpact > 1) {
    H_cloud = H_cloud * Math.exp(-(hoursAfterImpact - 1) / 10); // Decay
  }

  // Dust Density (D_dust) at 1m³
  const cloud_volume = Math.PI * R_cloud_growth * R_cloud_growth * H_cloud; // Volume of cylinder (approx)
  // Assume dust particle size is small (e.g., 10^-12 kg per particle)
  const particle_mass = 1e-12; // kg/particle
  const num_particles = M_E / particle_mass;
  let density_per_m3 = num_particles / cloud_volume;

  // Opacity (normalized 0 to 1)
  let opacity = Math.min(1, Math.max(0.01, Math.log10(density_per_m3 / 1e-5) / 5));


  return {
    radius_m: R_cloud_growth,
    radius_km: R_cloud_growth / 1000,
    height_km: H_cloud / 1000,
    density_per_m3: density_per_m3,
    opacity: opacity,
    hours: hoursAfterImpact
  };
}


function getShockWaves(diameter, speed, density, angle) {
  // Calculates the peak overpressure (psi) at different distances (m)
  const points = [];
  // Calculate up to 200 km (200,000 m)
  for (let r = 1000; r <= 200000; r += 5000) {
    const { db, energyTNTKg } = shockWaveDecibels(diameter, speed, density, angle, r);

    // Convert Overpressure to PSI (1 Pa = 0.000145038 psi)
    // db is based on pressure, so we need to back-calculate pressure (Pa) first
    // Pa = P_ref * 10^(db/20)
    const P_ref = 20e-6; // reference pressure (Pa)
    const pressurePa = P_ref * Math.pow(10, db / 20);

    // Convert pressure from Pa to PSI (1 Pa = 0.000145038 psi)
    const psi = pressurePa * 0.000145038;

    points.push({ distance: r / 1000, psi: psi }); // distance in km
  }
  return points;
}

function getEarthquakeMagnitudes(diameter, speed, density, angle) {
  // Calculates the moment magnitude (Mw) at different distances (m)
  const points = [];
  // Calculate up to 2000 km (2,000,000 m)
  for (let r = 10000; r <= 2000000; r += 50000) {
    const { moment_magnitude } = estimateEarthquakeMagnitude(diameter, speed, angle, density, r);

    points.push({ distance: r / 1000, magnitude: moment_magnitude }); // distance in km
  }
  return points;
}


// Function to assign distances to thresholds
function assignThresholdDistances(thresholds, dataPoints, thresholdKey, dataKey) {
  const updatedThresholds = [];
  const distances = dataPoints.map(p => p.distance);

  thresholds.forEach(threshold => {
    let bestDistance = null;

    // Find the furthest distance where the data point still meets the threshold
    for (let i = 0; i < dataPoints.length; i++) {
      if (dataPoints[i][dataKey] >= threshold[thresholdKey]) {
        bestDistance = dataPoints[i].distance;
      }
    }

    updatedThresholds.push({
      name: threshold.name,
      value: threshold[thresholdKey],
      distance: bestDistance
    });
  });

  return updatedThresholds.filter(t => t.distance !== null).sort((a, b) => b.distance - a.distance);
}


// Toggles between the base map and relief map
function toggleMap() {
  const currentLang = document.documentElement.lang;
  if (isRelief) {
    map.removeLayer(reliefMap);
    baseMap.addTo(map);
    document.getElementById('toggleButton').innerText = translations[currentLang].toggleRelief;
  } else {
    map.removeLayer(baseMap);
    reliefMap.addTo(map);
    document.getElementById('toggleButton').innerText = translations[currentLang].toggleStandard;
  }
  isRelief = !isRelief;
}

// Map Marker Setup
// Create an icon for the asteroid marker
const asteroidIcon = L.icon({
  iconUrl: 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#FFA500"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 17.93c-3.95-.49-7-3.85-7-7.93h2c0 2.21 1.79 4 4 4s4-1.79 4-4h2c0 4.08-3.05 7.44-7 7.93zM12 4c3.95.49 7 3.85 7 7.93h-2c0-2.21-1.79-4-4-4s-4 1.79-4 4H5c0-4.08 3.05-7.44 7-7.93z"/></svg>'),
  iconSize: [32, 32],
  iconAnchor: [16, 32],
  popupAnchor: [0, -32]
});

// Event handler for map click
map.on('click', function (e) {
  curLat = e.latlng.lat;
  curLng = e.latlng.lng;

  // Remove existing marker
  if (asteroidMarker) {
    map.removeLayer(asteroidMarker);
  }

  // Create new marker
  asteroidMarker = L.marker([curLat, curLng], { icon: asteroidIcon }).addTo(map);

  // Update display
  document.getElementById('coord-lat').textContent = curLat.toFixed(4);
  document.getElementById('coord-lng').textContent = curLng.toFixed(4);
});

// Add a dummy marker on load so coords are visible and it can be moved
map.fire('click', { latlng: map.getCenter() });

// Add a toggle button for the map type (standard/relief)
const toggleButton = L.control({ position: 'topright' });
toggleButton.onAdd = function (map) {
  const div = L.DomUtil.create('div', 'info legend');
  div.innerHTML = '<button id="toggleButton" onclick="toggleMap()" class="form-control">Toggle Relief Map</button>';
  div.style.backgroundColor = 'white';
  div.style.padding = '5px';
  div.style.borderRadius = '5px';
  return div;
};
toggleButton.addTo(map);


// Input Handlers
const asteroidInputs = {
  density: document.getElementById('asteroid-density-input'),
  diameter: document.getElementById('asteroid-diameter-input'),
  speed: document.getElementById('asteroid-speed-input'),
  dustHours: document.getElementById('dust-hours-input'),

  getValues: function () {
    // Ensure all inputs are parsed as numbers and have sensible defaults
    return {
      density: parseFloat(this.density.value) || 1000,
      diameter: parseFloat(this.diameter.value) || 1000,
      speed: parseFloat(this.speed.value) || 30000,
      angle: parseFloat(angle_ranger.value) || 45,
      dustHours: parseFloat(this.dustHours.value) || 1
    };
  }
};

// Output Handlers
const asteroidOutputs = {
  // Crater
  setCraterWidth: (val) => document.getElementById('result-width').textContent = val ? val.toFixed(2) : '--',
  setCraterDepth: (val) => document.getElementById('result-depth').textContent = val ? val.toFixed(2) : '--',
  // Shockwave
  setSoundLevel: (val) => document.getElementById('result-soundlevel').textContent = val ? val.toFixed(0) : '--',
  setEnergyTNT: (val) => document.getElementById('result-energytnt').textContent = val ? val.toFixed(2) : '--',
  // Earthquake
  setMomentMagnitude: (val) => document.getElementById('result-moment-mag').textContent = val ? val.toFixed(2) : '--',
  setRichterMagnitude: (val) => document.getElementById('result-richter-mag').textContent = val ? val.toFixed(2) : '--',
  setIntensity: (val) => document.getElementById('result-intensity').textContent = val ? val.toFixed(1) : '--',
  setEarthquakeDistance: (val) => document.getElementById('result-earthquake-distance').textContent = val ? val : '--',
  // Dust
  setDustRadius: (val) => document.getElementById('result-dust-radius').textContent = val ? val.toFixed(1) : '--',
  setDustHeight: (val) => document.getElementById('result-dust-height').textContent = val ? val.toFixed(1) : '--',
  setDustDensity: (val) => document.getElementById('result-dust-density').textContent = val ? val.toExponential(2) : '--',
};


// Launch button handler
launchBtn.addEventListener('click', () => {
  // Apply a shake effect to indicate launch/processing
  document.body.classList.add('shake');
  setTimeout(() => document.body.classList.remove('shake'), 500);
  // ... (inside launchBtn.addEventListener, near the end) ...

// 4. Store Results and Display
lastCalculationResults = {
    // FIX: Explicitly include the current coordinates
    curLat: curLat,
    curLng: curLng,
    
    craterDiameter,
    thresholds_upd,
    earthquakeData,
    earthquakeThresholds_upd,
    dustData,
    density,
    diameter,
    speed,
    angle
};

displayCirclesForActiveTab();
map.panTo([curLat, curLng]);
const translations = {
  en: {
    // ... existing keys ...
    launchButton: 'Launch 🚀',
    shareButton: 'Share 🌐', // NEW
    resultTitle: 'Result 📊',
    // ... rest of keys ...
  },
  es: {
    // ... existing keys ...
    launchButton: 'Lanzar 🚀',
    shareButton: 'Compartir 🌐', // NEW
    resultTitle: 'Resultado 📊',
    // ... rest of keys ...
  }
  
};

  // Clear all previous circles/layers except the base map and the asteroid marker
  map.eachLayer(function (layer) {
    if (layer instanceof L.TileLayer) return; // keep tiles
    if (layer instanceof L.Marker && layer === asteroidMarker) return; // keep the asteroid marker
    map.removeLayer(layer);
  });

  const { density, diameter, speed, angle, dustHours } = asteroidInputs.getValues();

  // 1. Calculations
  const { diameter: craterDiameter, depth: craterDepth } = estimateCrater(diameter, speed, angle, density);
  const { db, energyTNTKg } = shockWaveDecibels(diameter, speed, density, angle, 60 * 1000); // 60km distance
  const earthquakeData = estimateEarthquakeMagnitude(diameter, speed, angle, density, 100000); // 100km distance
  const dustData = calculateDustCloud(diameter, speed, angle, density, dustHours || 1);

  // 2. Output Display
  asteroidOutputs.setCraterWidth(craterDiameter);
  asteroidOutputs.setCraterDepth(craterDepth);
  asteroidOutputs.setSoundLevel(db);
  const energyTNT_megatons = energyTNTKg / 1_000_000;
  asteroidOutputs.setEnergyTNT(energyTNT_megatons);
  asteroidOutputs.setMomentMagnitude(earthquakeData.moment_magnitude);
  asteroidOutputs.setRichterMagnitude(earthquakeData.richter_magnitude);
  asteroidOutputs.setIntensity(earthquakeData.intensity);
  asteroidOutputs.setEarthquakeDistance(earthquakeData.distance_km);
  asteroidOutputs.setDustRadius(dustData.radius_km);
  asteroidOutputs.setDustHeight(dustData.height_km);
  asteroidOutputs.setDustDensity(dustData.density_per_m3);


  // 3. Circle Data Generation
  const currentLang = document.documentElement.lang;

  let thresholds = [
    { "name": translations[currentLang].fatalThreshold, "psi": 70 },
    { "name": translations[currentLang].severeLungDamageThreshold, "psi": 30 },
    { "name": translations[currentLang].buildingDestructionThreshold, "psi": 10 },
    { "name": translations[currentLang].eardrumsRuptureThreshold, "psi": 5 }
  ];

  schockWavePerDistance = getShockWaves(diameter, speed, density, angle);
  thresholds_upd = assignThresholdDistances(thresholds, schockWavePerDistance, 'psi', 'psi');

  const earthquakeMagnitudeData = getEarthquakeMagnitudes(diameter, speed, density, angle);

  const earthquakeThresholds = [
    { "name": translations[currentLang].devastatingEqThreshold, "magnitude": 8.0 },
    { "name": translations[currentLang].strongEqThreshold, "magnitude": 6.0 },
    { "name": translations[currentLang].lightEqThreshold, "magnitude": 4.0 }
  ];

  earthquakeThresholds_upd = assignThresholdDistances(earthquakeThresholds, earthquakeMagnitudeData, 'magnitude', 'magnitude');

  // 4. Store Results and Display
  lastCalculationResults = {
    curLat,
    curLng,
    craterDiameter,
    thresholds_upd,
    earthquakeData,
    earthquakeThresholds_upd,
    dustData,
    density,
    diameter,
    speed,
    angle
  };

  displayCirclesForActiveTab();
  map.panTo([curLat, curLng]);
});


// Angle slider handler
angle_ranger.addEventListener('input', (e) => {
  angle_current_value.textContent = `${e.target.value}°`;
});

// Dust hours input handler
dustHoursInput.addEventListener('input', () => {
  // Only recalculate if we have previous calculation results
  if (lastCalculationResults) {
    const { density, diameter, speed, angle } = lastCalculationResults;
    const hours = parseFloat(dustHoursInput.value) || 1;

    // Recalculate dust data with new hours
    const newDustData = calculateDustCloud(diameter, speed, angle, density, hours);

    // Update stored results
    lastCalculationResults.dustData = newDustData;

    // Update display values
    asteroidOutputs.setDustRadius(newDustData.radius_km);
    asteroidOutputs.setDustHeight(newDustData.height_km);
    asteroidOutputs.setDustDensity(newDustData.density_per_m3);

    // Force update circles if dust tab is active
    if (activeTab === 'dust') {
      displayCirclesForActiveTab();
    }
  }
});


// Tab switching functionality
document.querySelectorAll('.tab-button').forEach(button => {
  button.addEventListener('click', function () {
    // Update active tab variable
    activeTab = this.getAttribute('data-tab');

    // Remove active class from all buttons and add to clicked one
    document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
    this.classList.add('active');

    // Hide all result content and show the active one
    document.querySelectorAll('.result-content').forEach(content => content.classList.remove('active'));
    document.getElementById(activeTab + '-results').classList.add('active');

    // Redraw circles for the new active tab
    displayCirclesForActiveTab();
  });
});

// Function to create a Leaflet circle with a popup
function createCircle(lat, lng, radiusMeters, name, color, fillColor, fillOpacity) {
  const circle = L.circle([lat, lng], {
    color: color,
    fillColor: fillColor,
    fillOpacity: fillOpacity,
    radius: radiusMeters,
    weight: 2,
  }).addTo(map);

  // Bind a popup with the name and radius in km
  const radiusKm = (radiusMeters / 1000).toFixed(1);
  circle.bindPopup(`<b>${name}</b><br>Radius: ${radiusKm} km`).openPopup();
  circleLayers.push(circle); // Keep track of the circle layer
}

function displayCirclesForActiveTab() {
  if (!lastCalculationResults) return;

  const { curLat, curLng, craterDiameter, thresholds_upd, earthquakeThresholds_upd, dustData, density, diameter, speed, angle } = lastCalculationResults;

  // Clear existing circles (except asteroid marker)
  map.eachLayer(function (layer) {
    if (layer instanceof L.TileLayer) return;
    if (layer instanceof L.Marker && layer === asteroidMarker) return;
    map.removeLayer(layer);
  });
const translations = {
  en: {
    // ... existing keys ...
    launchButton: 'Launch 🚀',
    shareButton: 'Share 🌐', // NEW
    resultTitle: 'Result 📊',
    // ... rest of keys ...
  },
  es: {
    // ... existing keys ...
    launchButton: 'Lanzar 🚀',
    shareButton: 'Compartir 🌐', // NEW
    resultTitle: 'Resultado 📊',
    // ... rest of keys ...
  }
};
  const currentLang = document.documentElement.lang;

  if (activeTab === 'crater') {
    // Show crater circle
    createCircle(curLat, curLng, craterDiameter, translations[currentLang].craterLabel, "red", "red", 0.5);
  } else if (activeTab === 'shockwave') {
    // Show shockwave circles
    thresholds_upd.forEach(obj => {
      createCircle(curLat, curLng, obj.distance * 1000, obj.name, "blue", "#34bbc9", 0.15);
    });
  } else if (activeTab === 'earthquake') {
    // Show earthquake magnitude threshold circles
    const reverseEqThresholds = [
      { name: translations[currentLang].devastatingEqThreshold, color: "#8B0000" },
      { name: translations[currentLang].strongEqThreshold, color: "#FF4500" },
      { name: translations[currentLang].lightEqThreshold, color: "#FFFF00" }
    ];

    earthquakeThresholds_upd.forEach(obj => {
      if (obj.distance) {
        const eqColorObj = reverseEqThresholds.find(t => t.name === obj.name);
        const color = eqColorObj ? eqColorObj.color : "#808080";
        createCircle(curLat, curLng, obj.distance * 1000, obj.name, color, color, 0.2);
      }
    });

  } else if (activeTab === 'dust') {
    // Show dust cloud circle with opacity based on density
    const currentHours = parseFloat(document.getElementById('dust-hours-input').value) || 1;

    let currentDustData = dustData;
    // Check if the dust data needs recalculation (if hours changed since last launch)
    if (!currentDustData || Math.abs(currentDustData.hours - currentHours) > 0.01) {
      currentDustData = calculateDustCloud(diameter, speed, angle, density, currentHours);
    }

    if (currentDustData) {
      const dustRadius = currentDustData.radius_m;
      const dustOpacity = currentDustData.opacity;
      const radiusText = currentDustData.radius_km.toFixed(1);
      const hoursText = currentDustData.hours;

      const dustLabel = `${radiusText} ${translations[currentLang].radiusLabelAtHours} ${hoursText}h`;

      createCircle(curLat, curLng, dustRadius, dustLabel, "#8B4513", "#8B4513", dustOpacity);
    }
  }
}
