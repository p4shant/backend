/**
 * Office Locations Configuration
 * 
 * Each entry represents a company office/site.
 * Employees can only mark attendance when within `radiusMeters` of any office.
 * 
 * To add a new office:
 *   1. Get the latitude & longitude from Google Maps (right-click → "What's here?")
 *   2. Add a new object to the array below
 *   3. Restart the server
 * 
 * Default radius: 500 meters (can be overridden per office)
 */

const DEFAULT_RADIUS_METERS = 500;

const officeLocations = [
    {
        name: 'Banaras',
        latitude: 25.373836,
        longitude: 83.004539,
        radiusMeters: 500,
    },
    {
        name: 'Jangipur',
        latitude: 25.644666,
        longitude: 83.561205,
        radiusMeters: 500,
    },
    {
        name: 'Alawalpur',
        latitude: 25.666870,
        longitude: 83.516363,
        radiusMeters: 500,
    },
    {
        name: 'Ghazipur',
        latitude: 25.580533,
        longitude: 83.572535,
        radiusMeters: 500,
    },
];

module.exports = { officeLocations, DEFAULT_RADIUS_METERS };
