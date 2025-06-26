const mongodb = require('mongodb').MongoClient;
const ObjectId = require('mongodb').ObjectID;
const { isEmpty } = require('lodash');


const config = require('../../config/config');
const DataAccess = require('../../helpers/DataAccess');
const Audit = require('../audit/audit.model');

let mydb;
const database = require('../../service/database');
database.getDb().then(res => { mydb = res; });
const collection_name = 'customer_machinery_details';

const collection = (collectionName) => { return mydb.collection(collectionName); };
const model = {
    create: reqBody => DataAccess.InsertOne(collection_name, reqBody),
    update: (id, body) => {
        return DataAccess.UpdateOne(collection_name, { _id: ObjectId(id) }, { $set: body })
            .then((resp) => {
                return resp.modifiedCount > 0 ? 1 : 0;
            });
    },
    delesteById: (id) => {
        if (mydb) {
            const collections = collection(collection_name);
            return collections
                .updateOne({ _id: ObjectId(id) }, { $set: { deleted: 1 } })
                .then((result) => {
                    console.log('MODEL::deleteOne() called: ', result.deletedCount);
                    if (result.deletedCount > 0) {
                        return 1;
                    } else {
                        return 0;
                    }
                });
        }
    }
}

module.exports = model;