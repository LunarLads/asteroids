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

// Get Today’s Date
function getTodayDate() {
  const today = new Date();
  return today.toISOString().split("T")[0]; // YYYY-MM-DD
}

// Extending by 2 Weeks if Too few Objects
function getDateDaysAgo(days) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString().split("T")[0];
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

  // Shockwave estimates (blast radius)
  const shockwave1psiKm = 20 * Math.cbrt(tntMt); // windows broken
  const shockwave5psiKm = 8 * Math.cbrt(tntMt);  // moderate building damage

  return {
    massKg,
    energyExajoules: keJoules / 1e18,
    tntMegatons: tntMt,
    craterDiameterKm: craterDkm,
    shockwave1psiKm,
    shockwave5psiKm,
  };
}

// ✅ Famous Impacts Function
function displayFamousMeteorImpacts() {
  const famousImpacts = [
    { name: "Chicxulub Crater", location: "Yucatán, Mexico", year: "66 million years ago", sizeKm: 150, energyMt: "100,000,000+", notes: "Linked to dinosaur extinction event." },
    { name: "Tunguska Event", location: "Siberia, Russia", year: 1908, sizeKm: 0.05, energyMt: "10–15", notes: "Flattened 2,000 km² of forest." },
    { name: "Chelyabinsk Meteor", location: "Chelyabinsk, Russia", year: 2013, sizeKm: 0.02, energyMt: "~0.5", notes: "1,500 injured, windows shattered across city." },
    { name: "Barringer (Meteor Crater)", location: "Arizona, USA", year: "50,000 years ago", sizeKm: 1.2, energyMt: "~10", notes: "Best-preserved impact crater on Earth." },
    { name: "Vredefort Crater", location: "South Africa", year: "2 billion years ago", sizeKm: 300, energyMt: "Unknown", notes: "World’s largest known impact structure." },
    { name: "Sudbury Basin", location: "Ontario, Canada", year: "1.85 billion years ago", sizeKm: 250, energyMt: "Unknown", notes: "Created valuable nickel/copper deposits." },
    { name: "Manicouagan Crater", location: "Quebec, Canada", year: "215 million years ago", sizeKm: 100, energyMt: "Millions", notes: "Forms a ring-shaped lake today." },
    { name: "Popigai Crater", location: "Siberia, Russia", year: "35 million years ago", sizeKm: 100, energyMt: "Millions", notes: "Linked to global climate disruption." },
    { name: "Morokweng Crater", location: "South Africa", year: "145 million years ago", sizeKm: 70, energyMt: "Millions", notes: "Asteroid fragments found deep below." },
    { name: "Campo del Cielo", location: "Argentina", year: "~4,000–5,000 years ago", sizeKm: 0.1, energyMt: "~2–3", notes: "Iron meteorite field with many fragments." }
  ];

  console.log("\n=== 10 Famous Meteor Crashes on Earth ===");
  famousImpacts.forEach((impact, i) => {
    console.log(`\n${i + 1}. ${impact.name} (${impact.location}, ${impact.year})`);
    console.log(`   - Size: ~${impact.sizeKm} km`);
    console.log(`   - Energy: ${impact.energyMt} megatons TNT`);
    console.log(`   - Notes: ${impact.notes}`);
  });
}

// Main function to process NEOs and simulate impacts
async function processNeoImpacts() {
  const endDate = getTodayDate();
  const startDate = getDateDaysAgo(1); // yesterday → today
  let neoData = await fetchNeoData(startDate, endDate);

  // Count total NEOs
  let totalCount = Object.values(neoData).reduce((sum, arr) => sum + arr.length, 0);

  if (totalCount < 5) {
    console.log("Too few NEOs found. Expanding search window by 2 weeks...");
    const extendedStart = getDateDaysAgo(14);
    neoData = await fetchNeoData(extendedStart, endDate);
  }

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

      const impactResults = asteroidImpactCalc(diameterAvgKm, densityGcm3, speedKms, 45);

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
      console.log(`  - Crater Diameter: ~${impactResults.craterDiameterKm.toFixed(1)} km`);
      console.log(`  - Shockwave (1 psi, windows break): ~${impactResults.shockwave1psiKm.toFixed(1)} km`);
      console.log(`  - Shockwave (5 psi, building damage): ~${impactResults.shockwave5psiKm.toFixed(1)} km`);
    }
  }
}

// Run the script
(async () => {
  await processNeoImpacts();
  displayFamousMeteorImpacts();
})();


