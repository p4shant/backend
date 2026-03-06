/**
 * Stock Management Configuration
 * ================================
 * Central source of truth for all stock-related constants.
 * Shared across services, controllers, and validation layers.
 */

// ---------------------------------------------------------------------------
// Components tracked in inventory
// ---------------------------------------------------------------------------
const STOCK_COMPONENTS = [
    'panel',
    'inverter',
    'acdb',
    'dcdb',
    'earthing_rod',
    'earthing_chemical',
    'lightning_arrestor',
];

// Components that have sub-types
const COMPONENTS_WITH_SUBTYPES = ['panel', 'inverter'];

// ---------------------------------------------------------------------------
// Panel wattages (sub-types for panel)
// ---------------------------------------------------------------------------
const PANEL_WATTAGES = ['570', '575', '580', '585', '590'];

// ---------------------------------------------------------------------------
// Inverter types = System types (sub-types for inverter)
// 1 inverter per system, and its sub_type matches the system type
// ---------------------------------------------------------------------------
const INVERTER_TYPES = ['2KW', '3KW', '4KW', '5(I)KW', '5(III)KW', '6KW', '8KW', '10KW', 'H-3KW', 'H-5KW', 'H-6KW'];

// Hybrid inverter types (for reference)
const HYBRID_INVERTER_TYPES = ['H-3KW', 'H-5KW', 'H-6KW'];
const REGULAR_INVERTER_TYPES = ['2KW', '3KW', '4KW', '5(I)KW', '5(III)KW', '6KW', '8KW', '10KW'];

// ---------------------------------------------------------------------------
// Bill of Materials (BOM) — components required per system type
// NOTE: panel count is total panels needed (wattage chosen separately)
//       inverter is always 1 of matching sub_type
// ---------------------------------------------------------------------------
const SYSTEM_BOM = {
    '2KW': { panel: 4, inverter: 1, acdb: 1, dcdb: 1, earthing_rod: 3, earthing_chemical: 3, lightning_arrestor: 1 },
    '3KW': { panel: 6, inverter: 1, acdb: 1, dcdb: 1, earthing_rod: 3, earthing_chemical: 3, lightning_arrestor: 1 },
    '4KW': { panel: 8, inverter: 1, acdb: 1, dcdb: 1, earthing_rod: 3, earthing_chemical: 3, lightning_arrestor: 1 },
    '5(I)KW': { panel: 9, inverter: 1, acdb: 1, dcdb: 1, earthing_rod: 3, earthing_chemical: 3, lightning_arrestor: 1 },
    '5(III)KW': { panel: 9, inverter: 1, acdb: 1, dcdb: 1, earthing_rod: 3, earthing_chemical: 3, lightning_arrestor: 1 },
    '6KW': { panel: 11, inverter: 1, acdb: 1, dcdb: 1, earthing_rod: 3, earthing_chemical: 3, lightning_arrestor: 1 },
    '8KW': { panel: 15, inverter: 1, acdb: 1, dcdb: 1, earthing_rod: 3, earthing_chemical: 3, lightning_arrestor: 1 },
    '10KW': { panel: 18, inverter: 1, acdb: 1, dcdb: 1, earthing_rod: 3, earthing_chemical: 3, lightning_arrestor: 1 },
};

const SYSTEM_TYPES = Object.keys(SYSTEM_BOM);

// ---------------------------------------------------------------------------
// Brands
// ---------------------------------------------------------------------------
const BRANDS = ['Tata', 'Adani', 'Waree', 'Vikram', 'Other'];
const NON_TATA_BRANDS = ['Adani', 'Waree', 'Vikram', 'Other'];

// ---------------------------------------------------------------------------
// DCR types
// ---------------------------------------------------------------------------
const DCR_TYPES = ['DCR', 'Non-DCR'];

// ---------------------------------------------------------------------------
// District stores
// ---------------------------------------------------------------------------
const STORE_DISTRICTS = ['Ghazipur', 'Varanasi', 'Mau', 'Azamgarh', 'Ballia'];

// ---------------------------------------------------------------------------
// Connectors (hardcoded sales people)
// ---------------------------------------------------------------------------
const CONNECTORS = ['SN Singh', 'Bablu', 'Ashish', 'Upender', 'Devesh', 'Other'];

// ---------------------------------------------------------------------------
// Dispatch types for stock outward
// ---------------------------------------------------------------------------
const DISPATCH_TYPES = ['customer', 'dealer', 'store_transfer'];

// ---------------------------------------------------------------------------
// Movement types for audit log
// ---------------------------------------------------------------------------
const MOVEMENT_TYPES = ['inward', 'outward_customer', 'outward_dealer', 'transfer_out', 'transfer_in'];

// ---------------------------------------------------------------------------
// Helper: calculate planned aggregate components from system quantities
// Returns { panel: N, inverter: N, acdb: N, ... } (flat totals)
// ---------------------------------------------------------------------------
function calculatePlannedComponents(systems) {
    const totals = {};
    STOCK_COMPONENTS.forEach(c => { totals[c] = 0; });

    for (const [systemType, qty] of Object.entries(systems)) {
        const bom = SYSTEM_BOM[systemType];
        if (!bom || qty <= 0) continue;
        for (const [comp, perUnit] of Object.entries(bom)) {
            totals[comp] += perUnit * qty;
        }
    }
    return totals;
}

// ---------------------------------------------------------------------------
// Helper: calculate inverter breakdown by sub_type from system quantities
// Returns { '2KW': 3, '3KW': 2, ... }
// ---------------------------------------------------------------------------
function calculateInverterBreakdown(systems) {
    const breakdown = {};
    for (const [systemType, qty] of Object.entries(systems)) {
        if (qty > 0) {
            breakdown[systemType] = (breakdown[systemType] || 0) + qty;
        }
    }
    return breakdown;
}

// ---------------------------------------------------------------------------
// Helper: calculate expected panel count based on inverter quantities
// "How many panels should exist given these inverters"
// ---------------------------------------------------------------------------
function calculateExpectedPanelsFromInverters(inverterBreakdown) {
    let total = 0;
    for (const [sysType, qty] of Object.entries(inverterBreakdown)) {
        const bom = SYSTEM_BOM[sysType];
        if (bom) {
            total += bom.panel * qty;
        }
    }
    return total;
}

module.exports = {
    STOCK_COMPONENTS,
    COMPONENTS_WITH_SUBTYPES,
    PANEL_WATTAGES,
    INVERTER_TYPES,
    HYBRID_INVERTER_TYPES,
    REGULAR_INVERTER_TYPES,
    SYSTEM_BOM,
    SYSTEM_TYPES,
    BRANDS,
    NON_TATA_BRANDS,
    DCR_TYPES,
    STORE_DISTRICTS,
    CONNECTORS,
    DISPATCH_TYPES,
    MOVEMENT_TYPES,
    calculatePlannedComponents,
    calculateInverterBreakdown,
    calculateExpectedPanelsFromInverters,
};
