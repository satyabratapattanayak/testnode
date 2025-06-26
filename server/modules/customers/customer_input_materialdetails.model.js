const mongodb = require('mongodb').MongoClient;
const ObjectId = require('mongodb').ObjectID;
const { isEmpty } = require('lodash');

const config = require('../../config/config');
const DataAccess = require('../../helpers/DataAccess');
const Audit = require('../audit/audit.model');

let mydb;
const database = require('../../service/database');
database.getDb().then(res => { mydb = res; });
const collection_name = 'customer_input_material_details';

const model = {
    create: reqBody => DataAccess.InsertOne(collection_name, reqBody),
    update: (id, body) => {
        return DataAccess
            .UpdateOne(collection_name, { _id: ObjectId(id) }, { $set: body })
            .then((resp) => { return resp.modifiedCount > 0 ? 1 : 0; });
    },
}

module.exports = model;