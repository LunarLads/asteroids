// Example usage of the asteroid fetcher functions
import { getHazardousAsteroidsForLastDay } from './asteroid_fetcher.js';

// Example 1: Get hazardous asteroids from the last 7 days
async function exampleUsage() {
  try {
    console.log("Fetching hazardous asteroids from the last 7 days...");
    const hazardousAsteroids = await getHazardousAsteroidsForLastDay(7);

    console.log(`Found ${hazardousAsteroids.length} hazardous asteroids:`);

    hazardousAsteroids.forEach((asteroid, index) => {
      console.log(`\n${index + 1}. ${asteroid.name}`);
      console.log(`   - Diameter: ${asteroid.diameterKm.toFixed(4)} km (${asteroid.diameter.toFixed(1)} m)`);
      console.log(`   - Density: ${asteroid.density.toFixed(0)} kg/m³`);
      console.log(`   - Speed: ${asteroid.speedKms.toFixed(2)} km/s (${asteroid.speed.toFixed(1)} m/s)`);
      console.log(`   - Impact Angle: ${asteroid.angle}°`);
      console.log(`   - Absolute Magnitude: ${asteroid.absoluteMagnitude}`);
      if (asteroid.missDistanceKm) {
        console.log(`   - Miss Distance: ${(asteroid.missDistanceKm / 1e6).toFixed(2)} million km`);
      }
    });

    return hazardousAsteroids;
  } catch (error) {
    console.error("Error in example usage:", error);
    return [];
  }
}
// Run examples
if (typeof window === 'undefined') {
  // Node.js environment
  exampleUsage().then(() => {
    return getAsteroidDataForImpactCalc(7);
  });
}
