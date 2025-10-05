/**
 * Fetch hazardous asteroids from NASA NEO API for the last N days
 * @param {number} days - Number of days to look back
 * @param {string} apiKey - NASA API key (defaults to DEMO_KEY)
 * @returns {Promise<Array>} Array of hazardous asteroid data
 */

const apiKey = "lAsElMfX1a9N0TT5aKckUMAD31samDINVaT8Mhgk";

async function getHazardousAsteroidsForLastDay(days) {
  const endDate = getTodayDate();
  const startDate = getDateDaysAgo(days);

  try {
    const neoData = await fetchNeoData(startDate, endDate, apiKey);
    const hazardousAsteroids = [];

    for (const [date, asteroids] of Object.entries(neoData)) {
      if (!asteroids || asteroids.length === 0) continue;

      for (const asteroid of asteroids) {
        // Only process potentially hazardous asteroids
        if (!asteroid.is_potentially_hazardous_asteroid) continue;

        const asteroidData = processAsteroidData(asteroid);
        if (asteroidData) {
          hazardousAsteroids.push(asteroidData);
        }
      }
    }

    return hazardousAsteroids;
  } catch (error) {
    console.error("Error fetching hazardous asteroids:", error);
    return [];
  }
}

/**
 * Fetch NEO data from NASA API
 * @param {string} startDate - Start date in YYYY-MM-DD format
 * @param {string} endDate - End date in YYYY-MM-DD format
 * @param {string} apiKey - NASA API key
 * @returns {Promise<Object>} NEO data object
 */
async function fetchNeoData(startDate, endDate) {
  const apiUrl = `https://api.nasa.gov/neo/rest/v1/feed?start_date=${startDate}&end_date=${endDate}&api_key=${apiKey}`;

  try {
    const response = await fetch(apiUrl);
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    const data = await response.json();
    return data.near_earth_objects || {};
  } catch (error) {
    console.error("Error fetching NEO data:", error);
    throw error;
  }
}

/**
 * Process individual asteroid data and extract required information
 * @param {Object} asteroid - Raw asteroid data from NASA API
 * @returns {Object|null} Processed asteroid data or null if invalid
 */
function processAsteroidData(asteroid) {
  try {
    // Basic asteroid information
    const name = asteroid.name;
    const neoId = asteroid.id;
    const isHazardous = asteroid.is_potentially_hazardous_asteroid;

    // Only process hazardous asteroids
    if (!isHazardous) return null;

    // Diameter calculation
    const diameterMinKm = asteroid.estimated_diameter?.kilometers?.estimated_diameter_min;
    const diameterMaxKm = asteroid.estimated_diameter?.kilometers?.estimated_diameter_max;

    if (!diameterMinKm || !diameterMaxKm) {
      console.warn(`Missing diameter data for asteroid ${name}`);
      return null;
    }

    const diameterKm = (diameterMinKm + diameterMaxKm) / 2;
    const diameterM = diameterKm * 1000; // Convert to meters

    // Speed calculation
    const closeApproachData = asteroid.close_approach_data?.[0];
    if (!closeApproachData) {
      console.warn(`Missing close approach data for asteroid ${name}`);
      return null;
    }

    const speedKms = parseFloat(closeApproachData.relative_velocity?.kilometers_per_second);
    const speedMs = speedKms * 1000; // Convert to m/s

    if (!speedMs || isNaN(speedMs)) {
      console.warn(`Invalid speed data for asteroid ${name}`);
      return null;
    }

    // Density calculation
    const density = calculateDensity(asteroid);

    // Impact angle (fixed at 45 degrees as requested)
    const impactAngle = 45;

    return {
      name: name,
      neoId: neoId,
      diameter: diameterM, // in meters
      density: density, // in kg/m³
      speed: speedMs, // in m/s
      angle: impactAngle, // in degrees
      diameterKm: diameterKm, // in km for reference
      speedKms: speedKms, // in km/s for reference
      absoluteMagnitude: asteroid.absolute_magnitude_h,
      missDistanceKm: parseFloat(closeApproachData.miss_distance?.kilometers) || null,
      approachDate: closeApproachData.close_approach_date
    };

  } catch (error) {
    console.error(`Error processing asteroid data:`, error);
    return null;
  }
}

/**
 * Calculate asteroid density based on available data or type estimation
 * @param {Object} asteroid - Raw asteroid data
 * @returns {number} Density in kg/m³
 */
function calculateDensity(asteroid) {
  const name = asteroid.name;
  const absoluteMagnitude = asteroid.absolute_magnitude_h;

  // Check if mass is available in the data
  if (asteroid.estimated_diameter?.kilometers?.estimated_diameter_min &&
    asteroid.estimated_diameter?.kilometers?.estimated_diameter_max) {

    const diameterKm = (asteroid.estimated_diameter.kilometers.estimated_diameter_min +
      asteroid.estimated_diameter.kilometers.estimated_diameter_max) / 2;

    // Estimate mass from absolute magnitude and diameter
    // This is a rough approximation based on typical asteroid properties
    const estimatedMass = estimateMassFromMagnitude(absoluteMagnitude, diameterKm);

    if (estimatedMass && estimatedMass > 0) {
      const volume = (4 / 3) * Math.PI * Math.pow((diameterKm * 1000) / 2, 3); // Volume in m³
      const calculatedDensity = estimatedMass / volume;

      // Sanity check: density should be between 0.5 and 8.0 g/cm³ (500-8000 kg/m³)
      if (calculatedDensity >= 500 && calculatedDensity <= 8000) {
        return calculatedDensity;
      }
    }
  }

  // Fallback: estimate based on asteroid type and name
  return estimateDensityFromType(name, absoluteMagnitude);
}

/**
 * Estimate asteroid mass from absolute magnitude and diameter
 * @param {number} absoluteMagnitude - Absolute magnitude
 * @param {number} diameterKm - Diameter in kilometers
 * @returns {number|null} Estimated mass in kg
 */
function estimateMassFromMagnitude(absoluteMagnitude, diameterKm) {
  try {
    // Rough estimation: H = absolute magnitude, D = diameter in km
    // This uses a simplified relationship between magnitude and size
    const estimatedMass = Math.pow(10, 15.5 - 0.4 * absoluteMagnitude) * 1000; // Convert to kg
    return estimatedMass;
  } catch (error) {
    return null;
  }
}

/**
 * Estimate density based on asteroid type and characteristics
 * @param {string} name - Asteroid name
 * @param {number} absoluteMagnitude - Absolute magnitude
 * @returns {number} Estimated density in kg/m³
 */
function estimateDensityFromType(name, absoluteMagnitude) {
  // Check if it's likely a comet
  if (isLikelyComet(name)) {
    return 1000; // 1.0 g/cm³ for comets
  }

  // Estimate based on absolute magnitude (size proxy)
  if (absoluteMagnitude < 16) {
    // Large asteroids - typically more dense, metallic or stony
    return 3500; // 3.5 g/cm³
  } else if (absoluteMagnitude < 20) {
    // Medium asteroids - mixed composition
    return 2700; // 2.7 g/cm³ (typical stony asteroid)
  } else {
    // Small asteroids - often more porous
    return 2000; // 2.0 g/cm³
  }
}

/**
 * Check if asteroid is likely a comet based on name patterns
 * @param {string} name - Asteroid name
 * @returns {boolean} True if likely a comet
 */
function isLikelyComet(name) {
  const cometIndicators = ['P/', 'C/', 'D/', 'COMET', 'comet'];
  return cometIndicators.some(indicator => name.includes(indicator));
}

/**
 * Get today's date in YYYY-MM-DD format
 * @returns {string} Today's date
 */
function getTodayDate() {
  const today = new Date();
  return today.toISOString().split('T')[0];
}

/**
 * Get date N days ago in YYYY-MM-DD format
 * @param {number} days - Number of days ago
 * @returns {string} Date N days ago
 */
function getDateDaysAgo(days) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString().split('T')[0];
}

export {
  getHazardousAsteroidsForLastDay,
  fetchNeoData,
  processAsteroidData,
  calculateDensity,
  isLikelyComet,
  getTodayDate,
  getDateDaysAgo
};

