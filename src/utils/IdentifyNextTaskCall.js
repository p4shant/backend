
const NEXT_TASK_MAPPING = {
    // Initial data gathering phase
    'customer_data_gathering': {
        nextWorkTypes: [],
        notes: 'Terminal task - data gathering complete'
    },

    'collect_remaining_amount': {
        nextWorkTypes: [],
        notes: 'Removed from task flow - handled via Payment Collection page'
    },

    'approval_of_payment_collection': {
        nextWorkTypes: [{
            worktype: 'generate_bill',
            requiredRole: 'Accountant',
            functionName: 'createGenerateBillTask'
        }],
        notes: 'Triggered from Payment Approval page, not from task chain'
    },

    'complete_registration': {
        nextWorkTypes: [
            {
                worktype: 'submit_indent_to_electrical_department',
                requiredRole: 'Electrician',
                functionName: 'createSubmitindentToElectricalDeptTask'
            },
            {
                worktype: 'plant_installation',
                requiredRole: 'Operation Manager',
                functionName: 'createPlantInstallationTask'
            }
        ]
    },

    // Utility/COT/Load/Name correction phase
    'cot_request': {
        nextWorkTypes: [{
            worktype: 'submit_indent_to_electrical_department',
            requiredRole: 'Electrician',
            functionName: 'createSubmitindentToElectricalDeptTask'
        }]
    },

    'load_request': {
        nextWorkTypes: [{
            worktype: 'submit_indent_to_electrical_department',
            requiredRole: 'Electrician',
            functionName: 'createSubmitindentToElectricalDeptTask'
        }]
    },

    'name_correction_request': {
        nextWorkTypes: [{
            worktype: 'submit_indent_to_electrical_department',
            requiredRole: 'Electrician',
            functionName: 'createSubmitindentToElectricalDeptTask'
        }]
    },

    // Finance phase
    'finance_registration': {
        nextWorkTypes: [{
            worktype: 'submit_finance_to_bank',
            requiredRole: 'Sale Executive',
            functionName: 'createSubmitFinanceToBankTask'
        }]
    },
    'submit_finance_to_bank': {
        nextWorkTypes: [],
        notes: 'Terminal - finance customer appears on Payment Approval page after this'
    },

    // Intent/Permission phase
    'submit_indent_to_electrical_department': {
        nextWorkTypes: [{
            worktype: 'meter_installation',
            requiredRole: 'Electrician',
            functionName: 'createMeterInstallationTask'
        }]
    },

    // Installation phase
    'meter_installation': {
        nextWorkTypes: [{
            worktype: 'inspection',
            requiredRole: 'Electrician',
            functionName: 'createInspectionTask'
        }]
    },

    'plant_installation': {
        nextWorkTypes: [{
            worktype: 'take_installed_item_photos',
            requiredRole: 'Help Desk',
            functionName: 'createTakeInstalledItemPhotosTask'
        }]
    },

    // Documentation phase
    'take_installed_item_photos': {
        nextWorkTypes: [{
            worktype: 'upload_installed_item_serial_number',
            requiredRole: 'Help Desk',
            functionName: 'createUploadInstalledItemSerialNumberTask'
        }]
    },

    'upload_installed_item_serial_number': {
        nextWorkTypes: [
            {
                worktype: 'inspection',
                requiredRole: 'Electrician',
                functionName: 'createInspectionTask'
            },
            {
                worktype: 'assign_qa',
                requiredRole: 'SFDC Admin',
                functionName: 'createAssignQATask'
            }
        ]
    },

    // QA/Inspection/Subsidy phase
    'inspection': {
        nextWorkTypes: [{
            worktype: 'apply_subsidy',
            requiredRole: 'Help Desk',
            functionName: 'createApplySubsidyTask'
        }]
    },

    'apply_subsidy': {
        nextWorkTypes: [{
            worktype: 'subsidy_redemption',
            requiredRole: 'Help Desk',
            functionName: 'createSubsidyRedemptionTask'
        }]
    },

    'subsidy_redemption': {
        nextWorkTypes: [
            {
                worktype: 'document_handover',
                requiredRole: 'Sale Executive',
                functionName: 'createDocumentHandoverTask'
            }
        ]
    },

    // Handover phase
    'document_handover': {
        nextWorkTypes: [],
        notes: 'Terminal task - documents handed over'
    },

    'assign_qa': {
        nextWorkTypes: [{
            worktype: 'quality_assurance',
            requiredRole: 'Technical Assistant',
            functionName: 'createQualityAssuranceTask'
        }]
    },

    'quality_assurance': {
        nextWorkTypes: [{
            worktype: 'submit_warranty_document',
            requiredRole: 'SFDC Admin',
            functionName: 'createSubmitWarrantyDocumentTask'
        }]
    },

    'submit_warranty_document': {
        nextWorkTypes: [],
        notes: 'Terminal task - warranty document submitted'
    },

    // Billing phase
    'generate_bill': {
        nextWorkTypes: [{
            worktype: 'create_dcr',
            requiredRole: 'Accountant',
            functionName: 'createDcrTask'
        }]
    },

    'create_dcr': {
        nextWorkTypes: [{
            worktype: 'apply_subsidy',
            requiredRole: 'Help Desk',
            functionName: 'createApplySubsidyTask'
        }],
        notes: 'DCR created - triggers apply_subsidy'
    }
};

module.exports = {
    NEXT_TASK_MAPPING
};
