const mongodb = require('mongodb').MongoClient;
const ObjectId = require('mongodb').ObjectID;
const httpStatus = require('http-status');
const config = require('../../config/config');

let mydb;
const collection_name = 'userLocation';
const database = require('../../service/database');
database.getDb().then(res => { mydb = res; ensureIndex(); });
const collection = (collectionName) => {
    return mydb.collection(collectionName);
};
const ensureIndex = () => {
    let locCollection = collection(collection_name);
    // console.log("ensureIndex collection ", locCollection);
    locCollection.ensureIndex("meta.userId", (err, name) => {
        console.log("ensureIndex meta.userId ", err, name);
    });
    locCollection.ensureIndex("meta.created_at", (err, name) => {
        console.log("ensureIndex meta.userId ", err, name);
    });
    locCollection.ensureIndex("meta.device.uuid", (err, name) => {
        console.log("ensureIndex meta.uuid ", err, name);
    });
    locCollection.ensureIndex("meta.device.manufacturer", (err, name) => {
        console.log("ensureIndex meta.manufacturer ", err, name);
    });
    locCollection.ensureIndex("meta.device.model", (err, name) => {
        console.log("ensureIndex meta.model ", err, name);
    });
    locCollection.ensureIndex("meta.location.timestamp", (err, name) => {
        console.log("ensureIndex meta.location.timestamp ", err, name);
    });
}

const model = {
    findById: (id) => {
        if (mydb) {
            const collections = collection(collection_name);
            return collections
                .findOne({ _id: ObjectId(id) })
                .then((result) => {
                    return result;
                });
        }
    },
    all: () => {
        if (mydb) {
            const collections = collection(collection_name);
            return collections
                .find().sort('meta.location.timestamp', 1)
                .toArray()
                .then((result) => {
                    return result;
                });
        }
    },
    create: (body) => {
        if (mydb) {
            const collections = collection(collection_name);
            return collections
                .insertOne(body).then((newUser) => {
                    return newUser.ops;
                });
        }
    },
    update: (id, body) => {
        console.log('MODEL::data to update user info: ', body);
        if (mydb) {
            const collections = collection(collection_name);
            return collections
                .updateOne({ _id: ObjectId(id) }, { $set: body }).then(() => {
                    return collections
                        .findOne({ _id: ObjectId(id) }).then((result) => {
                            return result;
                        });
                });
        }
    },
    aggregate: (query, opts) => {
        const collections = collection(collection_name);
        return collections.aggregate(query, opts).toArray();
    },
    deleteById: (id) => {
        if (mydb) {
            const collections = collection(collection_name);
            return collections
                .deleteOne({ _id: ObjectId(id) })
                .then((result) => {
                    console.log('MODEL::deleteOne() called: ', result.deletedCount);
                    if (result.deletedCount > 0) {
                        return collections
                            .aggregate([
                                { $lookup: { from: 'state', localField: 'state', foreignField: '_id', as: 'state_details' } },
                                { $sort: { 'created_at': -1 } }
                            ])
                            .toArray();
                        // return result.deletedCount;
                    } else {
                        return 0;
                    }
                });
        }
    },
};

module.exports = model;