// Import dependencies
import fetch from "node-fetch"; // run: npm install node-fetch

// NASA NEO API fetch
async function fetchNeoData(startDate, endDate, apiKey = "DEMO_KEY") {
  const apiUrl = `https://api.nasa.gov/neo/rest/v1/feed?start_date=${startDate}&end_date=${endDate}&api_key=${apiKey}`;
  try {
    const response = await fetch(apiUrl);
    if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
    const data = await response.json();
    return data.near_earth_objects || {};
  } catch (err) {
    console.error("Error fetching data:", err);
    return {};
  }
}

// Check if object might be a comet based on name
function isLikelyComet(name) {
  const cometPattern = /^[CPD]\/[0-9]{4}\s+[A-Z][0-9]|^[0-9]+[PD]/;
  return cometPattern.test(name);
}

// Impact calculation
function asteroidImpactCalc(diameterKm, densityGcm3, speedKms, impactAngleDeg = 45) {
  const diameterM = diameterKm * 1000;
  const radiusM = diameterM / 2;
  const densityKgM3 = densityGcm3 * 1000;
  const speedMs = speedKms * 1000;

  // Mass (kg)
  const volumeM3 = (4 / 3) * Math.PI * Math.pow(radiusM, 3);
  const massKg = volumeM3 * densityKgM3;

  // Kinetic energy (Joules)
  const keJoules = 0.5 * massKg * Math.pow(speedMs, 2);

  // TNT equivalent (megatons)
  const tntMt = keJoules / 4.184e15;

  // Simple crater diameter (pi-scaling, transient crater in km)
  const rhoTarget = 2.7; // Earth's crust density g/cm³
  const g = 9.81;
  const angleRad = (impactAngleDeg * Math.PI) / 180;
  const keFactor = Math.cbrt(keJoules) * Math.cbrt(Math.sin(angleRad));
  const craterDkm = (1.8 * Math.cbrt(densityGcm3 / rhoTarget) * Math.pow(g, -2 / 3) * keFactor) / 1000;

  return {
    massKg,
    energyExajoules: keJoules / 1e18,
    tntMegatons: tntMt,
    craterDiameterKm: craterDkm,
  };
}

// Main function to process NEOs and simulate impacts
async function processNeoImpacts(startDate = "2025-10-04", endDate = "2025-10-05") {
  const neoData = await fetchNeoData(startDate, endDate);

  for (const [date, asteroids] of Object.entries(neoData)) {
    console.log(`\n=== NEOs for ${date} ===`);
    if (!asteroids || asteroids.length === 0) {
      console.log("No NEOs found for this date.");
      continue;
    }

    for (const asteroid of asteroids) {
      const name = asteroid.name;
      const neoId = asteroid.id;
      const isHazardous = asteroid.is_potentially_hazardous_asteroid;
      const diameterMinKm = asteroid.estimated_diameter.kilometers.estimated_diameter_min;
      const diameterMaxKm = asteroid.estimated_diameter.kilometers.estimated_diameter_max;
      const diameterAvgKm = (diameterMinKm + diameterMaxKm) / 2;
      const speedKms = parseFloat(asteroid.close_approach_data[0].relative_velocity.kilometers_per_second);
      const missDistanceKm = parseFloat(asteroid.close_approach_data[0].miss_distance.kilometers);
      const absMagnitude = asteroid.absolute_magnitude_h;

      const isComet = isLikelyComet(name);
      const densityGcm3 = isComet ? 1.0 : 2.7;

      const impactResults = asteroidImpactCalc(
        diameterAvgKm,
        densityGcm3,
        speedKms,
        45
      );

      console.log(`\nNEO: ${name} (ID: ${neoId})`);
      console.log(`Type: ${isComet ? "Comet" : "Asteroid"}`);
      console.log(`Potentially Hazardous: ${isHazardous}`);
      console.log(`Absolute Magnitude: ${absMagnitude.toFixed(2)}`);
      console.log(`Diameter (avg): ${diameterAvgKm.toFixed(4)} km`);
      console.log(`Speed: ${speedKms.toFixed(2)} km/s`);
      console.log(`Miss Distance: ${(missDistanceKm / 1e6).toFixed(2)} million km`);
      console.log("Impact Simulation (assuming Earth impact):");
      console.log(`  - Mass: ${(impactResults.massKg / 1e9).toFixed(2)} billion kg`);
      console.log(`  - Energy: ${impactResults.energyExajoules.toFixed(2)} exajoules`);
      console.log(`  - TNT Equivalent: ${impactResults.tntMegatons.toFixed(2)} megatons`);
      console.log(`  - Transient Crater Diameter: ~${impactResults.craterDiameterKm.toFixed(1)} km`);
    }
  }
}

// Run the script
processNeoImpacts();
