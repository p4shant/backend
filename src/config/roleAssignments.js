/**
 * Static role assignments for automatic task distribution
 * Defines who should be assigned tasks based on role and other criteria
 * Update these values as employee assignments change
 */

const ROLE_ASSIGNMENTS = {
    // System Admin - fixed assignment
    SYSTEM_ADMIN: {
        name: 'Mohammad Bilal Ansari',
        phone: '7275094145'
        // Note: Use phone or employee_role to look up ID in DB
    },

    // SFDC Admin - typically single user
    SFDC_ADMIN: {
        notes: 'Single SFDC Admin user in DB'
    },

    // Master Admin - typically single user
    MASTER_ADMIN: {
        notes: 'Single Master Admin user in DB'
    },

    // Operation Manager - varies by district
    OPERATION_MANAGER: {
        Varanasi: {
            name: 'Aashish Singh',
            phone: '7905692846'
        },
        default: {
            name: 'Upendra Nath',
            phone: '9795108581'
        }
    },

    // Electrician - assigned from same district as customer
    ELECTRICIAN: {
        notes: 'Find from same district as registered customer'
    },

    // Sales Executive - use logged-in user
    SALES_EXECUTIVE: {
        notes: 'Use logged-in user credentials (any logged-in user)'
    }
};

module.exports = {
    ROLE_ASSIGNMENTS
};
