// Import asteroid fetcher functions
import { getHazardousAsteroidsForLastDay } from './asteroid_fetcher.js';

// Initialize the map

// Global object to store hazardous asteroid data
let hazardousAsteroidsData = [];

// Function to fetch and store hazardous asteroid data
async function fetchAndStoreHazardousAsteroids(days = 7) {

  days = 7;
  try {
    const asteroids = await getHazardousAsteroidsForLastDay(days);
    hazardousAsteroidsData = asteroids;
    console.log(`Loaded ${asteroids.length} hazardous asteroids`);
    updateAsteroidDropdown();
    return asteroids;
  } catch (error) {
    console.error('Error fetching hazardous asteroids:', error);
    hazardousAsteroidsData = [];
    updateAsteroidDropdown();
    return [];
  }
}

// Function to update the asteroid dropdown
function updateAsteroidDropdown() {
  const selector = document.getElementById('asteroid-selector');
  if (!selector) return;

  // Clear existing options except the first one
  selector.innerHTML = '<option value="">Select Hazardous Asteroid</option>';

  console.log("Hazardous asteroids data: ", hazardousAsteroidsData);

  // Add asteroid options
  hazardousAsteroidsData.forEach((asteroid, index) => {
    const option = document.createElement('option');
    option.value = index;
    option.textContent = `${asteroid.name} (${asteroid.diameterKm.toFixed(3)}km, ${asteroid.speedKms.toFixed(1)}km/s)`;
    selector.appendChild(option);
  });

  console.log(`Updated dropdown with ${hazardousAsteroidsData.length} asteroids`);
}

// Function to autofill input fields when asteroid is selected
function autofillAsteroidData(asteroidIndex) {
  if (asteroidIndex === '' || !hazardousAsteroidsData[asteroidIndex]) {
    return;
  }

  const asteroid = hazardousAsteroidsData[asteroidIndex];

  // Fill the input fields
  document.getElementById('asteroid-density-input').value = Math.round(asteroid.density);
  document.getElementById('asteroid-diameter-input').value = Math.round(asteroid.diameter);
  document.getElementById('asteroid-speed-input').value = Math.round(asteroid.speed);
  document.getElementById('angle-ranger').value = asteroid.angle;

  // Update angle display
  document.getElementById('angle-current-value').textContent = asteroid.angle + '°';

  console.log(`Autofilled with asteroid: ${asteroid.name}`);
  console.log(`  - Diameter: ${asteroid.diameter}m (${asteroid.diameterKm}km)`);
  console.log(`  - Density: ${asteroid.density}kg/m³`);
  console.log(`  - Speed: ${asteroid.speed}m/s (${asteroid.speedKms}km/s)`);
  console.log(`  - Angle: ${asteroid.angle}°`);
}

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

  // asteroid properties
  const rAst = asteroidDiameter / 2;
  const volume = (4 / 3) * Math.PI * Math.pow(rAst, 3);
  const mass = volume * density;

  // vertical component of velocity
  const theta = (impactAngle * Math.PI) / 180;
  const vEff = speed * Math.sin(theta);

  // kinetic energy (J)
  const E = 0.5 * mass * vEff * vEff;

  // TNT equivalent (kg)
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
    energyTNTKg: W,
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

function getEarthquakeMagnitudes(asteroidDiameter, speed, density, impactAngle) {
  const res = [];
  let distance = 1;
  // Continue until magnitude drops below 3.0 (light earthquake threshold)
  while (res.length == 0 || res[res.length - 1].magnitude > 3.0) {
    const earthquakeData = estimateEarthquakeMagnitude(asteroidDiameter, speed, impactAngle, density, distance * 1000);
    res.push({
      distance,
      magnitude: earthquakeData.moment_magnitude,
      intensity: earthquakeData.intensity
    });
    distance++;
  }

  return res;
}

function calculateDustCloud(asteroidDiameter, speed, impactAngle, density, hours) {
  const r = asteroidDiameter / 2;
  const volume = (4 / 3) * Math.PI * Math.pow(r, 3);
  const mass = volume * density;

  // effective vertical velocity
  const theta = (impactAngle * Math.PI) / 180;
  const vEff = speed * Math.sin(theta);

  // kinetic energy (J)
  const E = 0.5 * mass * vEff * vEff;

  // TNT equivalent (kilotons) for scaling
  const W_kt = E / (4.184e9); // joules per kiloton of TNT

  // Dust cloud spread calculation based on impact energy and time
  // Using more conservative scaling based on actual impact crater studies

  // Initial dust cloud radius (m) - immediate post-impact
  // Much smaller scaling factor for more realistic sizes
  const initialRadius = Math.pow(W_kt, 0.33) * 200; // meters (reduced scaling)

  // Dust cloud expansion rate (m/s) - decreases over time
  // Increased expansion rate to make time dependency more visible
  const expansionRate = Math.pow(W_kt, 0.15) * 50; // m/s initially (increased for more time dependency)

  // Time in seconds
  const timeSeconds = hours * 3600;

  // Current radius using more realistic atmospheric dispersion model
  // Dust particles disperse more slowly with atmospheric drag
  // Make radius much more dependent on time by increasing time scaling
  const currentRadius = initialRadius + expansionRate * Math.pow(timeSeconds, 0.8) * 0.5;

  // Dust density calculation (particles per cubic meter)
  // Density decreases with cube of radius (volume expansion)
  const initialDensity = Math.pow(W_kt, 0.25) * 1e9; // particles/m³ (reduced initial density)
  const volumeExpansion = Math.pow(currentRadius / initialRadius, 3);
  const currentDensity = initialDensity / volumeExpansion;

  // Settling rate - larger particles settle faster
  const settlingTime = Math.pow(W_kt, 0.2) * 3600; // seconds for significant settling (faster settling for more time dependency)
  const settlingFactor = Math.exp(-timeSeconds / settlingTime);
  const effectiveDensity = currentDensity * settlingFactor;

  // Visibility/opacity calculation
  // Based on dust concentration and particle size
  const visibilityThreshold = 1e5; // particles/m³ for significant visibility (lower threshold)
  const opacity = Math.min(0.7, Math.log10(Math.max(effectiveDensity / visibilityThreshold, 1)) / 3);
  const finalOpacity = Math.max(0.05, opacity);

  // Dust cloud height (m) - decreases over time due to settling
  const initialHeight = Math.pow(W_kt, 0.3) * 200; // meters (reduced height scaling)
  const currentHeight = initialHeight * Math.exp(-timeSeconds / (settlingTime * 2));

  // Convert to more readable units
  const radiusKm = currentRadius / 1000;
  const heightKm = currentHeight / 1000;

  return {
    radius_m: currentRadius,
    radius_km: radiusKm,
    height_m: currentHeight,
    height_km: heightKm,
    density_per_m3: effectiveDensity,
    opacity: finalOpacity,
    hours: hours,
    energy_kt: W_kt
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

function estimateEarthquakeMagnitude(asteroidDiameter, speed, impactAngle, density, radius) {
  const r = asteroidDiameter / 2;
  const volume = (4 / 3) * Math.PI * Math.pow(r, 3);
  const mass = volume * density;

  // effective vertical velocity
  const theta = (impactAngle * Math.PI) / 180;
  const vEff = speed * Math.sin(theta);

  // kinetic energy (J)
  const E = 0.5 * mass * vEff * vEff;

  // TNT equivalent (kg)
  const W_kg = E / (4.184e6); // joules per kg of TNT

  // Seismic magnitude estimation based on energy and distance
  // Using empirical relationships from impact crater studies

  // Moment magnitude at source (based on energy)
  // Mw = (2/3) * log10(E) - 6.07 (where E is in Joules)
  const Mw_source = (2 / 3) * Math.log10(E) - 6.07;

  // Distance attenuation factor
  // Simplified attenuation model for impact-induced seismic waves
  const distance_km = radius / 1000;

  // Geometric spreading and absorption
  const geometric_spreading = Math.log10(distance_km + 1);
  const absorption = 0.01 * distance_km; // 0.01 magnitude units per km

  // Final magnitude at given distance
  const Mw_at_distance = Mw_source - geometric_spreading - absorption;

  // Ensure magnitude is within reasonable bounds
  const Mw_final = Math.max(0, Math.min(Mw_at_distance, 12));

  // Richter magnitude approximation (for comparison)
  // M_L ≈ M_w - 0.3 for typical earthquake magnitudes
  const Richter_magnitude = Mw_final - 0.3;

  // Intensity estimation (Modified Mercalli Scale)
  let intensity = "I";
  if (Mw_final >= 8.0) intensity = "XII";
  else if (Mw_final >= 7.5) intensity = "XI";
  else if (Mw_final >= 7.0) intensity = "X";
  else if (Mw_final >= 6.5) intensity = "IX";
  else if (Mw_final >= 6.0) intensity = "VIII";
  else if (Mw_final >= 5.5) intensity = "VII";
  else if (Mw_final >= 5.0) intensity = "VI";
  else if (Mw_final >= 4.5) intensity = "V";
  else if (Mw_final >= 4.0) intensity = "IV";
  else if (Mw_final >= 3.5) intensity = "III";
  else if (Mw_final >= 3.0) intensity = "II";

  return {
    moment_magnitude: Mw_final,
    richter_magnitude: Richter_magnitude,
    intensity: intensity,
    energy_J: E,
    energyTNT_kg: W_kg,
    distance_km: distance_km
  };
}

const asteroidInputs = {
  densityEl: document.getElementById('asteroid-density-input'),
  diameterEl: document.getElementById('asteroid-diameter-input'),
  speedEl: document.getElementById('asteroid-speed-input'),
  angleEl: angle_ranger,
  dustHoursEl: document.getElementById('dust-hours-input'),

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
      angle: this._toNumber(this.angleEl),
      dustHours: this._toNumber(this.dustHoursEl)
    };
  }
};

const asteroidOutputs = {
  widthEl: document.getElementById('result-width'),
  depthEl: document.getElementById('result-depth'),
  soundLevelEl: document.getElementById('result-soundlevel'),
  energyTNTEl: document.getElementById('result-energytnt'),
  momentMagEl: document.getElementById('result-moment-mag'),
  richterMagEl: document.getElementById('result-richter-mag'),
  intensityEl: document.getElementById('result-intensity'),
  earthquakeDistanceEl: document.getElementById('result-earthquake-distance'),
  dustRadiusEl: document.getElementById('result-dust-radius'),
  dustHeightEl: document.getElementById('result-dust-height'),
  dustDensityEl: document.getElementById('result-dust-density'),
  dustOpacityEl: document.getElementById('result-dust-opacity'),

  setCraterWidth(value) {
    this.widthEl.textContent = value === undefined || value === null ? '--' : String(value.toFixed(2));
  },

  setCraterDepth(value) {
    this.depthEl.textContent = value === undefined || value === null ? '--' : String(value.toFixed(2));
  },

  setSoundLevel(value) {
    this.soundLevelEl.textContent = value === undefined || value === null ? '--' : String(value.toFixed(2));
  },

  setEnergyTNT(value) {
    this.energyTNTEl.textContent = value === undefined || value === null ? '--' : String(value.toFixed(2));
  },

  setMomentMagnitude(value) {
    this.momentMagEl.textContent = value === undefined || value === null ? '--' : String(value.toFixed(2));
  },

  setRichterMagnitude(value) {
    this.richterMagEl.textContent = value === undefined || value === null ? '--' : String(value.toFixed(2));
  },

  setIntensity(value) {
    this.intensityEl.textContent = value === undefined || value === null ? '--' : String(value);
  },

  setEarthquakeDistance(value) {
    this.earthquakeDistanceEl.textContent = value === undefined || value === null ? '--' : String(value.toFixed(1));
  },

  setDustRadius(value) {
    this.dustRadiusEl.textContent = value === undefined || value === null ? '--' : String(value.toFixed(2));
  },

  setDustHeight(value) {
    this.dustHeightEl.textContent = value === undefined || value === null ? '--' : String(value.toFixed(2));
  },

  setDustDensity(value) {
    this.dustDensityEl.textContent = value === undefined || value === null ? '--' : String(value.toExponential(2));
  },

  setDustOpacity(value) {
    this.dustOpacityEl.textContent = value === undefined || value === null ? '--' : String((value * 100).toFixed(1));
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

const updateCoords = (lat, lng) => {
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

// Function to create explosion animation
function createExplosionAnimation(lat, lng, maxRadius, duration = 2500) {
  const explosionCircles = [];
  const numCircles = 4; // Reduced number of expanding circles
  const interval = duration / numCircles; // Time between each circle

  // Create multiple expanding circles
  for (let i = 0; i < numCircles; i++) {
    setTimeout(() => {
      const circle = L.circle([lat, lng], {
        color: 'red',
        fillColor: 'red',
        fillOpacity: 0.05,
        radius: 0,
        weight: 5
      });

      circle.addTo(map);
      explosionCircles.push(circle);

      // Animate the circle expansion (2x faster)
      let currentRadius = 0;
      const targetRadius = maxRadius;
      const animationDuration = (duration * 0.8) / 2; // 2x faster expansion
      const steps = 60; // Number of animation steps
      const stepTime = animationDuration / steps;
      const radiusIncrement = targetRadius / steps;

      let step = 0;
      const animateCircle = () => {
        if (step < steps) {
          currentRadius += radiusIncrement;
          circle.setRadius(currentRadius);
          step++;
          setTimeout(animateCircle, stepTime);
        } else {
          // Fade out the circle
          let opacity = 0.05;
          const fadeSteps = 20;
          const fadeInterval = ((duration * 0.2) / 2) / fadeSteps; // 2x faster fade
          let fadeStep = 0;

          const fadeOut = () => {
            if (fadeStep < fadeSteps) {
              opacity -= 0.05 / fadeSteps;
              circle.setStyle({
                fillOpacity: opacity,
                opacity: opacity
              });
              fadeStep++;
              setTimeout(fadeOut, fadeInterval);
            } else {
              // Remove the circle
              map.removeLayer(circle);
            }
          };

          setTimeout(fadeOut, 100);
        }
      };

      setTimeout(animateCircle, 50);
    }, i * interval);
  }
}

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
  const labelLat = curLat - latOffsetDeg * 0.97;
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

  const { density, diameter, speed, angle, dustHours } = asteroidInputs.getValues();

  console.log("Asteroid: ", asteroidInputs.getValues());

  const { diameter: craterDiameter, depth: craterDepth } = estimateCrater(diameter, speed, angle, density);

  console.log("Crater ", estimateCrater(diameter, speed, angle, density));

  const { db, energyTNTKg } = shockWaveDecibels(diameter, speed, density, angle, 60 * 1000); // 1km distance

  console.log("Shockwave ", shockWaveDecibels(diameter, speed, density, angle, 60 * 1000));

  // Calculate earthquake magnitude at 100km distance (representative distance)
  const earthquakeData = estimateEarthquakeMagnitude(diameter, speed, angle, density, 100000); // 100km in meters
  console.log("Earthquake ", earthquakeData);

  // Calculate dust cloud data at specified hours
  const dustData = calculateDustCloud(diameter, speed, angle, density, dustHours || 1);
  console.log("Dust cloud ", dustData);

  asteroidOutputs.setCraterWidth(craterDiameter);
  asteroidOutputs.setCraterDepth(craterDepth);
  asteroidOutputs.setSoundLevel(db);
  // Convert kg to megatons for display (1 megaton = 1,000,000 kg)
  const energyTNT_megatons = energyTNTKg / 1_000_000;
  asteroidOutputs.setEnergyTNT(energyTNT_megatons);

  // Set earthquake data
  asteroidOutputs.setMomentMagnitude(earthquakeData.moment_magnitude);
  asteroidOutputs.setRichterMagnitude(earthquakeData.richter_magnitude);
  asteroidOutputs.setIntensity(earthquakeData.intensity);
  asteroidOutputs.setEarthquakeDistance(earthquakeData.distance_km);

  // Set dust data
  asteroidOutputs.setDustRadius(dustData.radius_km);
  asteroidOutputs.setDustHeight(dustData.height_km);
  asteroidOutputs.setDustDensity(dustData.density_per_m3);
  // asteroidOutputs.setDustOpacity(dustData.opacity);

  const thresholds = [
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

  const schockWavePerDistance = getShockWaves(diameter, speed, density, angle);
  // Assign distances to thresholds based on PSI values
  const thresholds_upd = assignThresholdDistances(thresholds, schockWavePerDistance, 'psi', 'psi');
  console.log("Db per distance: ", schockWavePerDistance);
  console.log("Thr Upd ", thresholds_upd);

  // Generate earthquake magnitude data at different distances
  const earthquakeMagnitudeData = getEarthquakeMagnitudes(diameter, speed, density, angle);

  // Earthquake magnitude thresholds
  const earthquakeThresholds = [
    {
      "name": "Devastating (Mw 8+)",
      "magnitude": 8.0
    },
    {
      "name": "Strong (Mw 6+)",
      "magnitude": 6.0
    },
    {
      "name": "Light (Mw 4+)",
      "magnitude": 4.0
    }
  ];

  // Assign distances to earthquake thresholds based on magnitude values
  const earthquakeThresholds_upd = assignThresholdDistances(earthquakeThresholds, earthquakeMagnitudeData, 'magnitude', 'magnitude');
  console.log("Earthquake magnitude per distance: ", earthquakeMagnitudeData);
  console.log("Earthquake thresholds updated: ", earthquakeThresholds_upd);

  // Store results for tab switching
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

  // Create explosion animation (travel much further)
  const explosionRadius = Math.max(craterDiameter * 8, 25000); // Much larger distance, at least 25km radius
  createExplosionAnimation(curLat, curLng, explosionRadius, 2500); // 2.5 second duration

  // Display circles based on active tab (delay crater until animation ends)
  setTimeout(() => {
    displayCirclesForActiveTab(false); // Don't show crater during animation
  }, 500);

  // Show crater circle after animation ends (2.5 seconds)
  setTimeout(() => {
    if (activeTab === 'crater') {
      displayCirclesForActiveTab(true); // Show crater after animation
    }
  }, 2500);

  // Optionally pan to the launch location
  map.panTo([curLat, curLng]);
});


/**
 * For each threshold object adds a `distance` property.
 * Finds the first shock entry where the threshold field value >= shock field value.
 * If no match found, distance is set to null.
 *
 * @param {Array<object>} thresholdsArr  - array of threshold objects
 * @param {Array<object>} shockArr       - array of shock entries with distance property
 * @param {string} thresholdField        - field name in threshold objects to compare (e.g., 'psi', 'magnitude')
 * @param {string} shockField            - field name in shock objects to compare against (e.g., 'psi', 'magnitude')
 * @returns {Array<object>} the mutated thresholdsArr with distance property added
 * 
 */
function assignThresholdDistances(thresholdsArr, shockArr, thresholdField = 'psi', shockField = 'psi') {

  thresholdsArr = [...thresholdsArr];

  if (!Array.isArray(thresholdsArr) || !Array.isArray(shockArr)) return thresholdsArr;

  thresholdsArr.forEach(th => {
    const thresholdValue = Number(th[thresholdField]);
    const match = shockArr.find(s => thresholdValue >= Number(s[shockField]));
    th.distance = match ? match.distance : null;
  });

  return thresholdsArr;
}

angle_current_value.innerText = angle_ranger.value + "°";

angle_ranger.addEventListener('input', () => {
  angle_current_value.textContent = angle_ranger.value + "°";
});

// Dust hours input event listener
const dustHoursInput = document.getElementById('dust-hours-input');
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
    // asteroidOutputs.setDustOpacity(newDustData.opacity);

    // Force update circles if dust tab is active
    if (activeTab === 'dust') {
      displayCirclesForActiveTab(true);
    }
  }
});

// Tab switching functionality
const tabButtons = document.querySelectorAll('.tab-button');
const resultContents = document.querySelectorAll('.result-content');
let activeTab = 'crater';

function switchTab(tabName) {
  // Update active button
  tabButtons.forEach(button => {
    button.classList.toggle('active', button.dataset.tab === tabName);
  });

  // Update active content
  resultContents.forEach(content => {
    content.classList.toggle('active', content.id === `${tabName}-results`);
  });

  activeTab = tabName;

  // Re-display circles based on active tab
  displayCirclesForActiveTab(true);
}

// Add click listeners to tab buttons
tabButtons.forEach(button => {
  button.addEventListener('click', () => {
    switchTab(button.dataset.tab);
  });
});

// Asteroid selector event listener
const asteroidSelector = document.getElementById('asteroid-selector');
asteroidSelector.addEventListener('change', (e) => {
  autofillAsteroidData(e.target.value);
});

// Fetch hazardous asteroids when page loads
document.addEventListener('DOMContentLoaded', () => {
  fetchAndStoreHazardousAsteroids(28);
});

// Store last calculation results for circle display
let lastCalculationResults = null;

function displayCirclesForActiveTab(showCrater = true) {
  if (!lastCalculationResults) return;

  const { curLat, curLng, craterDiameter, thresholds_upd, earthquakeData, earthquakeThresholds_upd, dustData, density, diameter, speed, angle } = lastCalculationResults;

  // Clear existing circles (except asteroid marker)
  map.eachLayer(function (layer) {
    if (layer instanceof L.TileLayer) return; // keep tiles
    if (layer instanceof L.Marker && layer === asteroidMarker) return;
    map.removeLayer(layer);
  });

  if (activeTab === 'crater' && showCrater) {
    // Show crater circle only if showCrater is true
    createCircle(curLat, curLng, craterDiameter, "crater", "red", "red", 0.5);
  } else if (activeTab === 'shockwave') {
    // Show shockwave circles
    thresholds_upd.forEach(obj => {
      createCircle(curLat, curLng, obj.distance * 1000, obj.name, "blue", "#34bbc9", 0.15);
    });
  } else if (activeTab === 'earthquake') {
    // Show earthquake magnitude threshold circles using the same mechanism as shockwaves
    const earthquakeColors = {
      "Devastating (Mw 8+)": "#8B0000",    // Dark red
      "Major (Mw 7+)": "#DC143C",         // Crimson
      "Strong (Mw 6+)": "#FF4500",        // Orange red
      "Moderate (Mw 5+)": "#FFA500",      // Orange
      "Light (Mw 4+)": "#FFFF00"          // Yellow
    };

    earthquakeThresholds_upd.forEach(obj => {
      if (obj.distance) {
        const color = earthquakeColors[obj.name] || "#808080";
        createCircle(curLat, curLng, obj.distance * 1000, obj.name, color, color, 0.2);
      }
    });
  } else if (activeTab === 'dust') {
    // Show dust cloud circle with opacity based on density
    // Get current hours from input field and recalculate if needed
    const currentHours = parseFloat(document.getElementById('dust-hours-input').value) || 1;

    // Use current dust data or recalculate if not available
    let currentDustData = dustData;
    if (!currentDustData || Math.abs(currentDustData.hours - currentHours) > 0.01) {
      // Recalculate with current hours
      currentDustData = calculateDustCloud(diameter, speed, angle, density, currentHours);
    }

    if (currentDustData) {
      const dustRadius = currentDustData.radius_m;
      const dustOpacity = currentDustData.opacity;
      const dustLabel = `${currentDustData.radius_km.toFixed(1)}km radius at ${currentDustData.hours}h`;

      createCircle(curLat, curLng, dustRadius, dustLabel, "#8B4513", "#8B4513", dustOpacity);
    }
  }
}


