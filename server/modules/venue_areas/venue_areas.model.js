const DataAccess = require('../../helpers/DataAccess');

let mydb;
const collection_name = 'venue_areas';
const database = require('../../service/database');
database.getDb().then(res => { mydb = res; });

const collection = (collectionName) => { return mydb.collection(collectionName); };

const model = {
    findById: (id) => {
        const crieteria = [
            { $match: { _id: ObjectId(id) } },
        ];
        return DataAccess.aggregate(collection_name, crieteria);
    },
    all: () => {
        const crieteria = [
            { $match: { deleted: { $ne: 1 } } },
        ];
        return DataAccess.aggregate(collection_name, crieteria).then((result) => { return result; });
    },
    create: (reqBody, loggedUser) => {
        return DataAccess.InsertOne(collection_name, reqBody).then((newVenue) => {
            return newVenue;
        });
    },
    update: (id, body, loggedUser) => {
        return DataAccess.UpdateOne(collection_name, crieteria, doc)
            .then((result) => {
                return result.matchedCount > 0 ? 1 : 0;
            });
    },
    deleteById: (id) => {
        return DataAccess.UpdateOne(collection_name, { _id: ObjectId(id) }).then((result) => {
            return result;
        });
    }
};

module.exports = model;