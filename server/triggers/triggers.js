// @ts-check
const CronJob = require('cron').CronJob;
const matches = require('./matches');
const actions = require('./actions');
const triggerConfig = require('./tconfig');
const database = require('../service/database');

let db, scheduledActions, triggersConfig;
database.getDb().then(res => {
    db = res;
    scheduledActions = db.collection('scheduled_actions');
    triggersConfig = db.collection('triggers_config');

});
let tconfig;// = triggerConfig();

const checkRules = (rules, docToInsert) => {
    // console.log("checkRules",rules);
    if (rules) {
        rules.forEach(rule => {
            if (rule.matches) {
                rule.matches.forEach(match => {
                    if (match.method) {
                        if (matches[match.method]) {
                            let result = matches[match.method](match.params, docToInsert);
                            if (result) {
                                if (match.actions) {
                                    match.actions.forEach(action => {
                                        if (actions[action.method]) {
                                            let acresult = actions[action.method](action.params, docToInsert);
                                        } else {
                                            // console.log("method not found", action.method);
                                        }
                                    });
                                }
                            }
                        } else {
                            // console.log("method not found", match.method);
                        }

                    }
                });
            }
        });
    }
};
const initDB = (database) => {
    db = database;
    scheduledActions = db.collection('scheduled_actions');
    triggersConfig = db.collection('triggers_config');
    chechTimeCollectionsStamp(db);
};
const chechTimeCollectionsStamp = (db) => {
    console.log('chechTimeCollectionsStamp');
    let timeStamp = new Date();
    let collections = ['region', 'business_division', 'status',
        'business_category', 'business_group', 'customer_category',
        'lead', 'zone', 'area', 'konspecCode', 'methodology', 'city', 'cities', 'state', 'postCode', 'country']
    for (let i = 0; i < collections.length; i++) {
        let collectionName = collections[i];
        let collection = db.collection(collectionName);

        collection.updateMany({ 'modified_At': { '$exists': false } }, { $set: { modified_At: timeStamp } }, function (err, data) {
            if (err) {
                console.log(collectionName, 'err', err);
            } else {
                // console.log(collectionName, 'result', data.result);
            }
        });
    }



};
const initTriggers = (db) => {
    initDB(db);
    triggersConfig.find({ deleted: { $ne: 1 }, disabled: { $ne: 1 } }).toArray(function (err, tconfig) {

        if (tconfig) {
            // console.log('tconfig: ', tconfig);
            tconfig.forEach(item => {
                if (item.collectionName) {
                    if (item.beforeInsert) {
                        db.collection(item.collectionName).before('insertOne', function (docToInsert) {
                            // triggered when calling to insert()
                            if (item.beforeInsert.rules)
                                checkRules(item.beforeInsert.rules, docToInsert);
                            return docToInsert;
                        });
                    }
                    if (item.afterInsert) {
                        db.collection(item.collectionName).after('insertOne', function (docToInsert) {
                            // triggered when calling to insert()
                            // console.log(item.collectionName + " insertOne after trigger", docToInsert);
                            return docToInsert;
                        });
                    }
                }
            });

            const scheduledJobs = new CronJob({
                cronTime: '* * * * *',
                onTick: function () {
                    scheduledActions.find({}).toArray(function (err, docs) {
                        if (docs && docs.forEach) {
                            docs.forEach(element => {
                                if (actions[element.actionName]) {
                                    let acresult = actions[element.actionName](element.params, element.doc);
                                    scheduledActions.deleteOne({ _id: element._id });
                                }
                            });
                        }
                    });
                },
                start: false,
                timeZone: 'America/Los_Angeles'
            });
            if(process.env.DISABLE_CRON != '1'){
                scheduledJobs.start();
            }

        }
    });

    /* setTimeout(() => {
        db.collection('collectionName').insertOne({ "test": "test", userId: objectid("5a858080e6e8f6724d6aa54f") }).then((res) => {
            console.log("collectionName res", res.result);
        });
    }, 1000); */


};




module.exports = initTriggers;