
const mongodb = require('mongodb-hooks');
const config = require('../config/config');

let db;
const DBService = {

    init: () => {
        let self = this;
        // console.log('db config', config);
        return new Promise((resolve, reject) => {
            if (self.db) {
                resolve(db);
            } else {
                mongodb.connect(config.mongoDBurl, (err, database) => {
                    if (err) {
                        console.log('db connection err: ', err);
                        reject(err);
                    } else {
                        db = database.db(config.db_name);
                        self.db = db;
                        resolve(db);
                    }
                });
            }
        });
    },

    getDb: () => {
        let self = this;
        return new Promise((resolve, reject) => {
            let checkDB = () => {
                if (!self.db) {
                    // console.log('db not init', self);
                    setTimeout(() => { checkDB(); }, 10);
                } else {
                    resolve(self.db);
                }

            };
            checkDB();
        });
    }
};
module.exports = DBService;