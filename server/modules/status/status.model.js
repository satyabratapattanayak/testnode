const mongodb = require('mongodb').MongoClient;
const ObjectId = require('mongodb').ObjectID;
const { isEmpty, isUndefined } = require('lodash');

const DataAccess = require('../../helpers/DataAccess');

const collection_name = 'status';
let mydb;
const database = require('../../service/database');
database.getDb().then(res => { mydb = res; });

const collection = (collectionName) => {
    console.log('collection: ', collectionName);
    return mydb.collection(collectionName);
};

const model = {
    findById: (id) => {
        if (mydb) {
            const collections = collection(collection_name);
            return collections
                .findOne({ _id: ObjectId(id) }).then((result) => {
                    console.log('DB:: called findOne(): ', result);
                    return result;
                });
        }
    },
    flatList: (filter) => { return DataAccess.findAll(collection_name, filter); },

    all: async (loggedUser, params) => {
        try {
            console.log('status req query: ', params);

            let query = {};

            if (!isEmpty(params) && !isUndefined(params.module)) {
                query['$or'] = [{ modules: { $in: [params.module] } }]
                if (params.module == 'lead' && (
                    loggedUser.group.indexOf('area_manager') != -1
                )) {
                    query['$or'].push({ _id: { $in: [ObjectId('5ce7b28cc348160bd473fe1d')] } });
                }
            }

            console.log('status list query: ', params.module, ' :: ', query);

            const criteria = ([
                { $match: query },
                { $sort: { displayId: 1 } },
            ]);

            return DataAccess.aggregate(collection_name, criteria)
        } catch (error) {
            throw new Error(error)
        }
    },


    /* all: async (options) => {
        try {
            let query = {
                _id: {
                    $nin: [
                        objectid('5af09ba1c94cc441b55524f2'),
                        objectid('5be51e358cad0228c0073613'),
                        objectid('5be51e408cad0228c0073614')
                    ]
                }
            };

            const criteria = ([
                // { $match: { _id: { $ne: objectid('5af09ba1c94cc441b55524f2') } } },
                { $match: query },
                { $sort: { displayId: 1 } },
            ]);

            return DataAccess.aggregate(collection_name, criteria)
        } catch (error) {
            throw new Error(error)
        }
    }, */
};

module.exports = model;