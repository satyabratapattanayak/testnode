const mongodb = require('mongodb').MongoClient;
const objectid = require('mongodb').ObjectID;
const { isEmpty, sortBy } = require('lodash');

const DataAccess = require('../../helpers/DataAccess');

const collection_name = 'priority';
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
                .findOne({ _id: objectid(id) }).then((result) => {
                    console.log('DB:: called findOne(): ', result);
                    return result;
                });
        }
    },
    /* all: (query) => {
        if (mydb) {
            const collections = collection(collection_name);
            return collections
                .find()
                .sort('created_at', -1)
                .toArray()
                .then((result) => {
                    return result;
                });
        }
    }, */
    all: (params) => {
        console.log('req.query model: ', params);
        let query = {};
        if (params && params.cmrform == 1) {
            query = { _id: { $nin: [objectid('5a8eb0ab62a646e65f27a4fd'), objectid('5a8eb09762a646e65f27a4fb'), objectid('5a8eb0a262a646e65f27a4fc')] } }
        }
        return DataAccess.findAll(collection_name, query)
    },
};

module.exports = model;