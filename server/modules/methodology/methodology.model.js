const mongodb = require('mongodb').MongoClient;
const objectid = require('mongodb').ObjectID;
// const Promise = require('bluebird');
const config = require('../../config/config');
// const APIError = require('./APIError');
const { isEmpty } = require('lodash');

const DataAccess = require('../../helpers/DataAccess');


let mydb;
const database = require('../../service/database');
database.getDb().then(res => { mydb = res; });

const collection_name = 'methodology';

const collection = (collectionName) => {
    return mydb.collection(collectionName);
};

const model = {
    findByName: (collectionName, search) => {
        if (!isEmpty(search)) {
            if (mydb) {
                const collections = collection(collectionName);
                return collections
                    .find({ $text: { $search: search } })
                    .toArray()
                    .then((result) => {
                        if (result == null || result == [] || isEmpty(result)) {
                            return collections.insertOne({ type: search }).then((resp) => {
                                return resp.insertedId;
                            });
                        } else {
                            return result[0]._id;
                        }
                    });
            }
        } else {
            if (mydb) {
                const collections = collection(collectionName);
                return collections
                    .find()
                    .toArray()
                    .then((result) => {
                        return;
                    });
            }
        }
    },
    detailsBC: (id) => { return DataAccess.findOne('business_category', { _id: objectid(id) }); },
    detailsBD: (id) => { return DataAccess.findOne('business_division', { _id: objectid(id) }); },
    detailsBG: (id) => { return DataAccess.findOne('business_group', { _id: objectid(id) }); },
    listBC: (filter) => DataAccess.findAll('business_category',filter),
    listBD: (filter) => DataAccess.findAll('business_division', filter),
    listBG: (filter) => DataAccess.findAll('business_group', filter),
    create: (body) => {
        console.log('model:: create user ', body);
        if (mydb) {
            const collections = collection(collection_name);
            return collections
                .findOne({ email: body.email }).then((found) => {
                    if (found) { return 0; } else {
                        return collections
                            .insertOne(body).then((newUser) => {
                                return newUser.ops;
                            });
                    }
                });
        }
    },
    update: (id, body) => {
        console.log('MODEL::data to update role info: ', body);
        if (mydb) {
            const collections = collection(collection_name);
            return collections
                .updateOne({ _id: objectid(id) }, { $set: body }).then((result) => {
                    console.log('MODEL::called updateOne() after update the role: ', result);
                    return result;
                });
        }
    },
};

module.exports = model;