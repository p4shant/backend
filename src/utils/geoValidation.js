/**
 * Geo-validation utilities for attendance geofencing.
 * Uses the Haversine formula to compute distance between two lat/lng points.
 */

const { officeLocations, DEFAULT_RADIUS_METERS } = require('../config/officeLocations');

/**
 * Calculate the distance (in meters) between two geographic points
 * using the Haversine formula.
 *
 * @param {number} lat1 - Latitude of point 1 (degrees)
 * @param {number} lon1 - Longitude of point 1 (degrees)
 * @param {number} lat2 - Latitude of point 2 (degrees)
 * @param {number} lon2 - Longitude of point 2 (degrees)
 * @returns {number} Distance in meters
 */
function haversineDistance(lat1, lon1, lat2, lon2) {
    const R = 6371000; // Earth's radius in meters
    const toRad = (deg) => (deg * Math.PI) / 180;

    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);

    const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

/**
 * Check if a given lat/lng is within the allowed radius of ANY configured office.
 *
 * @param {number} lat - Employee's latitude
 * @param {number} lng - Employee's longitude
 * @returns {{ allowed: boolean, nearestOffice: string, distance: number, radius: number }}
 */
function isWithinAnyOffice(lat, lng) {
    if (!officeLocations || officeLocations.length === 0) {
        // No offices configured — allow attendance (fail-open)
        return { allowed: true, nearestOffice: 'N/A', distance: 0, radius: 0 };
    }

    let nearestOffice = officeLocations[0].name;
    let minDistance = Infinity;
    let nearestRadius = DEFAULT_RADIUS_METERS;

    for (const office of officeLocations) {
        const dist = haversineDistance(lat, lng, office.latitude, office.longitude);
        const radius = office.radiusMeters || DEFAULT_RADIUS_METERS;

        if (dist < minDistance) {
            minDistance = dist;
            nearestOffice = office.name;
            nearestRadius = radius;
        }

        // Within this office's radius — allowed
        if (dist <= radius) {
            return {
                allowed: true,
                nearestOffice: office.name,
                distance: Math.round(dist),
                radius,
            };
        }
    }

    // Not within any office
    return {
        allowed: false,
        nearestOffice,
        distance: Math.round(minDistance),
        radius: nearestRadius,
    };
}

module.exports = { haversineDistance, isWithinAnyOffice };
