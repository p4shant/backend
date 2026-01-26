
const NEXT_TASK_MAPPING = {
    // Initial data gathering phase
    'customer_data_gathering': {
        nextWorkTypes: [],
        notes: 'Terminal task - data gathering complete'
    },

    'collect_remaining_amount': {
        nextWorkTypes: [{
            worktype: 'approval_of_payment_collection',
            requiredRole: 'Master Admin',
            functionName: 'createApprovalOfPaymentCollectionTask'
        }]
    },

    'approval_of_payment_collection': {
        nextWorkTypes: [{
            worktype: 'generate_bill',
            requiredRole: 'Accountant',
            functionName: 'createGenerateBillTask'
        }]
    },

    'complete_registration': {
        nextWorkTypes: [
            {
                worktype: 'hard_copy_indent_creation',
                requiredRole: 'System Admin',
                functionName: 'createHardCopyindentCreationTask'
            },
            {
                worktype: 'approval_of_plant_installation',
                requiredRole: 'Master Admin',
                functionName: 'createApprovalOfPlantInstallationTask'
            }
        ]
    },

    'approval_of_plant_installation': {
        nextWorkTypes: [{
            worktype: 'plant_installation',
            requiredRole: 'Operation Manager',
            functionName: 'createPlantInstallationTask'
        }]
    },

    // Utility/COT/Load/Name correction phase
    'cot_request': {
        nextWorkTypes: [{
            worktype: 'hard_copy_indent_creation',
            requiredRole: 'System Admin',
            functionName: 'createHardCopyindentCreationTask'
        }]
    },

    'load_request': {
        nextWorkTypes: [{
            worktype: 'hard_copy_indent_creation',
            requiredRole: 'System Admin',
            functionName: 'createHardCopyindentCreationTask'
        }]
    },

    'name_correction_request': {
        nextWorkTypes: [{
            worktype: 'hard_copy_indent_creation',
            requiredRole: 'System Admin',
            functionName: 'createHardCopyindentCreationTask'
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
        nextWorkTypes: [{
            worktype: 'approval_of_payment_collection',
            requiredRole: 'Master Admin',
            functionName: 'createApprovalOfPaymentCollectionTask'
        }]
    },

    // Intent/Permission phase
    'hard_copy_indent_creation': {
        nextWorkTypes: [{
            worktype: 'submit_indent_to_electrical_department',
            requiredRole: 'Electrician',
            functionName: 'createSubmitindentToElectricalDeptTask'
        }]
    },

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
            requiredRole: 'Technician',
            functionName: 'createTakeInstalledItemPhotosTask'
        }]
    },

    // Documentation phase
    'take_installed_item_photos': {
        nextWorkTypes: [{
            worktype: 'upload_installed_item_serial_number',
            requiredRole: 'System Admin',
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
                worktype: 'asign_qa',
                requiredRole: 'SFDC Admin',
                functionName: 'createAssignQATask'
            }
        ]
    },

    // QA/Inspection/Subsidy phase
    'inspection': {
        nextWorkTypes: [{
            worktype: 'apply_subsidy',
            requiredRole: 'System Admin',
            functionName: 'createApplySubsidyTask'
        }]
    },

    'apply_subsidy': {
        nextWorkTypes: [{
            worktype: 'subsidy_redemption',
            requiredRole: 'System Admin',
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
            worktype: 'create_cdr',
            requiredRole: 'Master Admin',
            functionName: 'createCdrTask'
        }]
    },

    'create_cdr': {
        nextWorkTypes: [{
            worktype: 'apply_subsidy',
            requiredRole: 'System Admin',
            functionName: 'createApplySubsidyTask'
        }],
        notes: 'Terminal task - CDR created'
    }
};

module.exports = {
    NEXT_TASK_MAPPING
};
