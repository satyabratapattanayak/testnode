
const triggerConfig = () => {
    let config = [
        /* {
            collectionName: "collectionName",
            beforeInsert: {
                rules: [{
                    name: "rule1",
                    matches: [{
                        "method": "always",
                        params: {}, actions: [{ method: "sendCheckInNotification", params: {}, schedule: "now" }, { method: "sendSMS", params: {}, schedule: "now" }]
                    }],

                }]
            }//,
            // afterInsert: (doc) => {
            //     return doc;
            // }
        }, */



        {
            collectionName: 'scheduler',
            beforeInsert: {
                rules: [
                    {
                        name: 'scheduler_add',
                        matches: [
                            {
                                method: 'always',
                                params: {},
                                actions: [
                                    { method: 'sendNewSchedule', params: {}, schedule: 'now' },
                                    { method: 'sendSMS', params: {}, schedule: 'now' }
                                ]
                            }],

                    }]
            }//,
            // afterInsert: (doc) => {
            //     return doc;
            // }
        },
        {
            collectionName: 'audit',
            beforeInsert: {
                rules: [
                    {
                        name: 'scheduler_update',
                        matches: [{
                            'method': 'always',
                            params: {}, actions: [
                                { method: 'sendUpdatedSchedule', params: {}, schedule: 'now' },
                                { method: 'sendSMS', params: {}, schedule: 'now' },
                            ]
                        }],
                    },
                    {
                        name: 'scheduler_add_Notes',
                        matches: [{
                            'method': 'always',
                            params: {}, actions: [
                                { method: 'sendNotification_OnAddNotes', params: {}, schedule: 'now' },
                                { method: 'sendSMS', params: {}, schedule: 'now' },
                            ]
                        }],
                    },
                    {
                        name: 'scheduler_change_status',
                        matches: [{
                            'method': 'always',
                            params: {}, actions: [
                                { method: 'sendNotification_OnChange_ScheduleStatus', params: {}, schedule: 'now' },
                                { method: 'sendSMS', params: {}, schedule: 'now' },
                            ]
                        }],
                    },
                    /* {
                        name: 'scheduler_overdue',
                        matches: [{
                            'method': 'always',
                            params: {}, actions: [
                                { method: 'sendNotification_SchedulerOverdue', params: {}, schedule: 'now' },
                                { method: 'sendSMS', params: {}, schedule: 'now' },
                            ]
                        }],
                    } */
                ]
            }//,
            // afterInsert: (doc) => {
            //     return doc;
            // }
        },
        {
            collectionName: 'audit',
            beforeInsert: {
                rules: [{
                    name: 'lead_add',
                    matches: [{
                        'method': 'always',
                        params: {}, actions: [
                            { method: 'sendNotification_OnNewLeadAdd', params: {}, schedule: 'now' },
                            { method: 'sendSMS', params: {}, schedule: 'now' }]
                    }],

                }]
            },
            // afterInsert: (doc) => {
            //     console.log('AFTER insert: ', doc);

            //     // return doc;
            // }
        },
    ];
    return config;
};

module.exports = triggerConfig;