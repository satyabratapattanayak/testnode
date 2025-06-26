const objectid = require('mongodb').ObjectID;
const { isEmpty, first } = require('lodash');

const DataAccess = require('../../helpers/DataAccess');
const Audit = require('../audit/audit.model.js');
const { getModuleName } = require('../shared/shared.controller');


let mydb;
const database = require('../../service/database');
database.getDb().then(res => { mydb = res; });

const collection_name = 'region';

const collection = (collectionName) => {
    return mydb.collection(collectionName);
};

const model = {
    findByName: (userRegion) => {
        let query;
        if (!isEmpty(userRegion)) {
            if (userRegion.indexOf(',') > -1) {
                query = { $text: { $search: userRegion } };
            } else {
                // query = { region: userRegion };
                query = { $text: { $search: userRegion } };
            }
            if (mydb) {
                const collections = collection('region');
                return collections
                    .aggregate([
                        { $match: query },
                        { $project: { region: 0, created_at: 0 } }
                    ])
                    .toArray()
                    .then((result) => {
                        // console.log('region DB: ', result);
                        let id = [];
                        result.forEach(element => {
                            // id = + element._id;
                            id.push(objectid(element._id));
                        });
                        return id;
                    });
            }
        } else {
            if (mydb) {
                const collections = collection('region');
                return collections
                    .find({ $text: { $search: 'ashraf' } })
                    .toArray()
                    .then((result) => {
                        return;
                    });
            }
        }

    },
    find_region: (userRegion) => {
        let query;
        if (!isEmpty(userRegion)) {
            if (userRegion.indexOf(',') > -1) {

            } else {
                query = { $text: { $search: userRegion } };
            }
            if (mydb) {
                const collections = collection(collection_name);
                return collections
                    .aggregate([
                        { $match: query },
                        { $project: { region: 0, created_at: 0 } }
                    ])
                    .toArray()
                    .then((result) => {
                        let id = [];
                        result.forEach(element => {
                            id.push(objectid(element._id));
                        });
                        return id;
                    });
            }
        } else {
            if (mydb) {
                const collections = collection(collection_name);
                return collections
                    .find({ $text: { $search: 'ashraf' } })
                    .toArray()
                    .then((result) => {
                        return;
                    });
            }
        }

    },
    findById: (id) => {
        if (mydb) {
            return mydb.collection('region')
                .aggregate([
                    { $match: { _id: objectid(id) } },
                    { $lookup: { from: 'area', localField: '_id', foreignField: 'region', as: 'area_details' } },
                    { $lookup: { from: 'zone', localField: 'area_details._id', foreignField: 'area', as: 'zone_details' } },
                    { $project: { 'area_details.region': 0, 'area_details.created_at': 0 } }
                ])
                .toArray()
                .then((result) => {
                    return result;
                });
        }
    },
    all: (loggedUser, filter) => {
        let query;
        if (filter) {
            query = filter;
            query.deleted = { $ne: 1 }
        } else {
            query = { deleted: { $ne: 1 } };
        }

        if (loggedUser.group.indexOf('admin') == -1) {
            loggedUser.region.push(objectid('5c5a7e24932704b38ec31a96'));
            query['_id'] = { $in: loggedUser.region };
        }

        return DataAccess.findAll('region', query);
    },
    filter_list: (loggedUser) => {

        /* let elementRegion1 = [];
        loggedUser.region.forEach(elementRegion => {
            elementRegion1.push(objectid(elementRegion));
        });
        elementRegion1.push(objectid('5c5a7e24932704b38ec31a96'));

        if (mydb) {
            const collections = collection(collection_name);
            return collections
                .aggregate([{ $match: { _id: { $in: elementRegion1 } } }]).toArray()
                .then((result) => {
                    return result;
                });
        } */

        let query = { deleted: { $ne: 1 } };

        if (loggedUser.group.indexOf('admin') == -1) {
            loggedUser.region.push(objectid('5c5a7e24932704b38ec31a96'));
            query['_id'] = { $in: loggedUser.region };
        }

        return DataAccess.findAll('region', query);
    },
    listTaggedAreaZone: (loggedUser) => {
        if (mydb) {
            const collections = collection(collection_name);
            return collections
                .find()
                .toArray().then((result) => {
                    console.log(result);
                    return result;
                });
        }
    },
    listAllWithAreaZone: (query, loggedUser) => {
        let loggedUserRegion = [];
        loggedUser.region.forEach(element => {
            console.log('element: ', element);
            loggedUserRegion.push(objectid(element));
        });

        const Nullquery = { $ne: null };

        let temp_region = [];
        let temp_area = [];
        let temp_zone = [];
        let matchQuery = {};

        if (!query.region) { temp_region = Nullquery; } else {
            for (let key in query.region) { temp_region[key] = objectid(query.region[key]); }
            matchQuery = { _id: { $in: temp_region } };
        }
        console.log('temp_region: ', temp_region);

        if (!query.category) { temp_area = Nullquery; } else {
            for (let key in query.category) { temp_area[key] = objectid(query.category[key]); }
            matchQuery = { region: temp_region, category: temp_area };
            console.log('temp_area: ', temp_area);
        }

        if (!query.category) { temp_zone = Nullquery; } else {
            for (let key in query.category) { temp_zone[key] = objectid(query.category[key]); }
            matchQuery = { region: temp_region, area: temp_area, zone: temp_zone };
        }
        console.log('temp_zone: ', temp_zone);

        console.log('matchQuery: ', matchQuery);

        if (mydb) {
            const collections = collection(collection_name);
            return collections
                // .find().sort('created_at', -1)
                .aggregate([
                    // { $match: { region: { $in: elementRegion1 }, area: { $in: emptyArea }, zone: { $in: zoneArea }, $or: [{ access_level: { $gt: emptyaccess_level } }, { _id: objectid(loggedUser._id) }] } },
                    { $match: matchQuery },
                    { $lookup: { from: 'area', localField: '_id', foreignField: 'region', as: 'area_details' } },
                    { $lookup: { from: 'zone', localField: 'area_details._id', foreignField: 'area', as: 'zone_details' } },
                    { $project: { created_at: 0, 'area_details.created_at': 0, 'area_details.region': 0, 'zone_details.created_at': 0 } },
                ])
                .toArray()
                .then((result) => {
                    return result;
                });
        }
    },
    create: (body, loggedUser) => {
        if (mydb) {
            const collections = collection(collection_name);
            return collections.findOne({ region_code: body.region_code, deleted: { $ne: 1 } }).then((found) => {
                return found ? found._id : collections.insertOne(body).then((newRegion) => {
                    Audit.addLog({
                        module: getModuleName().regionModule, // todo: send moduleId
                        action: 'create',
                        documentId: objectid(first(newRegion.ops)._id),
                        userId: loggedUser ? objectid(loggedUser._id) : 'imported',
                        message: 'created a region',
                        data: body,
                        date: new Date()
                    });
                    return newRegion.insertedId;
                });
            });
        }
    },

    update: async (id, body, loggedUser) => {
        const found = await DataAccess.findOne('region', { region_code: body.region_code, _id: { $ne: objectid(id) }, deleted: { $ne: 1 } });
        const crieteria = { _id: objectid(id) };
        const doc = { $set: body };
        return found ? 0 : await DataAccess.UpdateOne('region', crieteria, doc)
            .then((result) => {
                Audit.addLog({
                    module: 'region',
                    action: 'update',
                    documentId: objectid(id),
                    userId: objectid(loggedUser._id),
                    message: 'updated a region',
                    data: body,
                    date: new Date()
                });
                return result.matchedCount > 0 ? 1 : 2;
            });
    },

    // remove region if it is linked anywhere
    deleteById: async (id, loggedUser) => {
        const deleteResult = await DataAccess.DeleteOne('region', { _id: objectid(id) });
        Audit.addLog({
            module: 'region',
            action: 'delete',
            documentId: objectid(id),
            userId: objectid(loggedUser._id),
            message: 'deleted a region',
            data: '',
            date: new Date()
        });
        DataAccess.UpdateMany('area', {}, { $pull: { region: objectid(id) } });
        DataAccess.UpdateMany('users', {}, { $pull: { region: objectid(id) } });
        DataAccess.UpdateMany('customer', {}, { $pull: { customer_region: objectid(id) } });
        DataAccess.UpdateMany('contacts', {}, { $pull: { contact_region: objectid(id) } });
        DataAccess.UpdateMany('lead', {}, { $pull: { lead_region: objectid(id) } });
        return deleteResult.matchedCount > 0 ? 1 : 0;
    },
};

module.exports = model;