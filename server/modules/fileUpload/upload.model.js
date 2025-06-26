const mongodb = require('mongodb').MongoClient;
const ObjectId = require('mongodb').ObjectID;
const httpStatus = require('http-status');
const { isEmpty } = require('lodash');

const database = require('../../service/database');
const config = require('../../config/config');

let mydb;
const collection_name = 'files_storage';

database.getDb().then(res => { mydb = res; });

const collection = (collectionName) => { return mydb.collection(collectionName); };

const model = {
    upload: (body) => {
        if (mydb) {
            const collections = collection(collection_name);
            return collections.insertOne(body).then((result) => {
                return result.ops;
            });
        }
    },
    getFile: (query) => {
        if (mydb) {
            const collections = collection(collection_name);
            return collections.findOne({ _id: ObjectId(query.fileId) }).then((result) => {
                if (isEmpty(result) || result == null) { return 0; }
                return result;
            });
        }
    }
};

module.exports = model;