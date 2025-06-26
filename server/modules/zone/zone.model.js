const mongodb = require('mongodb').MongoClient;
const ObjectId = require('mongodb').ObjectID;
const httpStatus = require('http-status');
const { isEmpty, first } = require('lodash');

const Audit = require('../audit/audit.model.js');
const DataAccess = require('../../helpers/DataAccess');

const config = require('../../config/config');

let mydb;
const collection_name = 'zone';
const database = require('../../service/database');
database.getDb().then(res => { mydb = res; });

const collection = (collectionName) => { return mydb.collection(collectionName); };

async function getZone(area) {
    console.log('zone: ', area);
    const collections = collection(collection_name);
    return await collections.findOne({ zone: area });
    // .findOne({ $text: { $search: area } });
}

function zoneValue(area) {
    return new Promise((resolve, reject) => {
        let i = 0;
        let idArray = [];
        checkzone();
        function checkzone() {
            getZone(area[i]).then((data) => {
                // console.log('data: ', data);
                idArray.push(data._id);
                i++;
                if (i < area.length) {
                    checkzone();

                } else {
                    resolve(idArray);
                }
            });
        }
    });

}
const model = {

    /* findByName: (userZone) => {
        console.log('userZone: ', userZone);

        let query;
        if (!isEmpty(userZone)) {
            if (userZone.indexOf(',') > -1) {
                const zoneArray = userZone.split(',');
                return zoneValue(zoneArray).then((idarray) => {
                    // console.log('idarray: ', idarray);
                    return idarray;
                });
                //  query = { $text: { $search: userZone } };
            } else {
                // query = { $text: { $search: userZone } };
                query = { zone: userZone };

                if (mydb) {
                    const collections = collection(collection_name);
                    return collections
                        // .find({ $text: { $search: userZone } })
                        .aggregate([
                            { $match: query },
                            { $project: { region: 0, created_at: 0 } }
                        ])
                        .toArray()
                        .then((result) => {
                            let id = [];
                            result.forEach(element => {
                                id.push(ObjectId(element._id));
                            });
                            // console.log('idarray id: ', id);
                            return id;
                        });
                }
            }
        } else {
            return new Promise((resolve, reject) => {
                resolve([]);
            });
        }
    }, */
    filterAll: (filter, loggedUser) => {
        let query;
        if (filter) {
            query = filter;
            query.deleted = { $ne: 1 }
        } else {
            query = { deleted: { $ne: 1 } };
        }

        return DataAccess.findAll(collection_name, query);
    },
    all: (query, loggedUser) => {
        let matchQuery = { $or: [{ zone_code: 'na' }, { $and: [{ deleted: { $ne: 1 } }] }] };
        let crieteria;
        if (!query || !query.area) {
            crieteria = [
                // { $match: { deleted: { $ne: 1 } } },
                { $match: matchQuery },
                { $lookup: { from: 'area', localField: 'area', foreignField: '_id', as: 'area_details' } },
                { $lookup: { from: 'region', localField: 'area_details.region', foreignField: '_id', as: 'region_details' } },
                { $sort: { created_at: -1 } }
            ];
        } else if (query.area == 'na') {
            crieteria = [
                { $match: { zone_code: 'na' } },
                { $lookup: { from: 'region', localField: 'region', foreignField: '_id', as: 'region_details' } },
                { $sort: { created_at: -1 } }
            ];
        } else {
            let tempArea = [];
            query.area.forEach(element => {
                tempArea.push(ObjectId(element));
            });
            // matchQuery['area'] = { $in: tempArea };
            matchQuery['$or'][1]['$and'].push({ area: { $in: tempArea } });


            loggedUser.zone.push(ObjectId('5c5ac9021086f2e73b5ddb67'));
            matchQuery['$or'][1]['$and'].push({ _id: { $in: loggedUser.zone } });

            crieteria = [
                // { $match: { area: { $in: tempArea }, deleted: { $ne: 1 } } },
                { $match: matchQuery },
                {
                    $group: {
                        _id: '$area',
                        zones: {
                            $push:
                            {
                                id: '$_id',
                                zone: '$zone',

                            }
                        },

                    }
                },
                { $lookup: { from: 'area', localField: '_id', foreignField: '_id', as: 'area_details' } },
                { $lookup: { from: 'region', localField: 'area_details.region', foreignField: '_id', as: 'region_details' } },
            ];
        }

        if (query && query.modified_At) {
            crieteria["$match"]['modified_At'] = query.modified_At;
        }

        return DataAccess.aggregate(collection_name, crieteria).then((result) => {
            return result;
        });
    },

    filterList: (loggedUser, body) => {

        let query = { deleted: { $ne: 1 } };
        let selectedArea = [];
        if (!isEmpty(body.area)) {
            body.area.forEach(area => {
                selectedArea.push(ObjectId(area));
            });
            selectedArea.push(ObjectId('5c5ac8c11086f2e73b5ddb66'));
            query['area'] = { $in: selectedArea };
        }
        // else {
        //     if (loggedUser && loggedUser.area) {
        //         loggedUser.area.forEach(area => {
        //             selectedArea.push(ObjectId(area));
        //         });
        //     }
        // }

        loggedUser.zone.push(ObjectId('5c5ac9021086f2e73b5ddb67'));
        query['_id'] = { $in: loggedUser.zone };

        if (mydb) {
            const collections = collection(collection_name);
            return collections
                .aggregate([
                    { $match: query },
                    { $lookup: { from: 'area', localField: 'area', foreignField: '_id', as: 'area_details' } },
                ]).toArray()
                .then((result) => { return result; });
        }
    },

    findById: (id) => {
        const crieteria = [
            { $match: { _id: ObjectId(id) } },
            // { $group: { _id: '$region', areas: { $push: { id: '$_id', area: '$area' } } } },
            { $lookup: { from: 'area', localField: 'area', foreignField: '_id', as: 'area_details' } }
        ];
        return DataAccess.aggregate('zone', crieteria);
    },

    create: (reqBody, loggedUser) => {
        return DataAccess.findOne('zone', { zone_code: reqBody.zone_code, deleted: { $ne: 1 } }).then((found) => {
            return found ? found._id : DataAccess.InsertOne('zone', reqBody).then((newZone) => {
                Audit.addLog({
                    module: 'zone', // todo: send moduleId
                    action: 'create',
                    documentId: ObjectId(first(newZone)._id),
                    userId: loggedUser ? ObjectId(loggedUser._id) : 'imported',
                    message: 'created a zone',
                    data: reqBody,
                    date: new Date()
                });
                return newZone.insertedId;
            });
        });
    },

    update: (id, body, loggedUser) => {
        return DataAccess.findOne('zone', { zone_code: body.zone_code, _id: { $ne: ObjectId(id) }, deleted: { $ne: 1 } }).then((found) => {
            const crieteria = { _id: ObjectId(id) }; const doc = { $set: body };
            return found ? 0 : DataAccess.UpdateOne('zone', crieteria, doc)
                .then((result) => {
                    Audit.addLog({
                        module: 'zone', // todo: send moduleId
                        action: 'update',
                        documentId: ObjectId(id),
                        userId: ObjectId(loggedUser._id),
                        message: 'updated a zone',
                        data: body,
                        date: new Date()
                    });
                    return result.matchedCount > 0 ? 1 : 0;
                });
        });
    },

    linkArea: async (id, body) => {
        const found = await DataAccess.findOne('zone', { _id: ObjectId(body.id), area: { $in: [ObjectId(id)] }, deleted: { $ne: 1 } });
        const crieteria = { _id: ObjectId(body.id) };
        const doc = { $push: { area: ObjectId(id) } };
        return found ? 0 : DataAccess.UpdateOne('zone', crieteria, doc)
            .then((result) => {
                return result.matchedCount > 0 ? 1 : 0;
            });
    },

    deleteById: (id, loggedUser) => {
        return DataAccess.DeleteOne('zone', { _id: ObjectId(id) })
            .then((deleteResult) => {
                Audit.addLog({
                    module: 'zone', // todo: send moduleId
                    action: 'delete',
                    documentId: ObjectId(id),
                    userId: ObjectId(loggedUser._id),
                    message: 'deleted a zone',
                    data: '',
                    date: new Date()
                });
                DataAccess.UpdateMany('users', {}, { $pull: { zone: ObjectId(id) } });
                DataAccess.UpdateMany('customer', {}, { $pull: { customer_zone: ObjectId(id) } });
                DataAccess.UpdateMany('contacts', {}, { $pull: { contact_zone: ObjectId(id) } });
                DataAccess.UpdateMany('lead', {}, { $pull: { lead_zone: ObjectId(id) } });
                return deleteResult.matchedCount > 0 ? 1 : 0;
            });
    },
};

module.exports = model;
