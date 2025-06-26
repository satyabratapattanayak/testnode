const mongodb = require('mongodb').MongoClient;
const ObjectId = require('mongodb').ObjectID;
const httpStatus = require('http-status');
const { isEmpty, first } = require('lodash');

const Audit = require('../audit/audit.model.js');
const DataAccess = require('../../helpers/DataAccess');
const config = require('../../config/config');

let mydb;

const database = require('../../service/database');
database.getDb().then(res => { mydb = res; });
const collection_name = 'area';


const collection = (collectionName) => { return mydb.collection(collectionName); };

async function getArea(area) {
    const collections = collection(collection_name);
    return await collections
        .findOne({ area: area });
}

function areaValue(area) {
    console.log('area: ', area);
    return new Promise((resolve, reject) => {
        let i = 0;
        let idArray = [];
        checkzone();
        function checkzone() {
            console.log('area[i]: ', area[i]);
            getArea(area[i]).then((data) => {
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
        // console.log('then 2: ', idArray);

    });

}

const model = {
    /* findByName: (userArea) => {
        let query;
        if (!isEmpty(userArea)) {
            if (userArea.indexOf(',') > -1) {
                console.log('came');
                const areaArray = userArea.split(',');
                return areaValue(areaArray).then((idarray) => {
                    console.log('idarray: ', idarray);
                    return idarray;
                });
            } else {

                query = { $text: { $search: userArea } };

                console.log('QUERY: ', query);


                if (mydb) {
                    const collections = collection('area');
                    return collections
                        // .find({ $text: { $search: userArea } })
                        .aggregate([
                            { $match: query },
                            { $project: { region: 0, created_at: 0 } }
                        ])
                        .toArray()
                        .then((result) => {
                            console.log('AREA DB: ', result);

                            let id = [];
                            result.forEach(element => {
                                id.push(ObjectId(element._id));
                            });
                            return id;
                        });
                }
            }
        } else {
            if (mydb) {
                const collections = collection('area');
                return collections
                    .find({ $text: { $search: userArea } })
                    .toArray()
                    .then((result) => {
                        return;
                    });
            }
        }
    }, */
    findById: (id) => {
        const crieteria = [
            { $match: { _id: ObjectId(id) } },
            // { $group: { _id: '$region', areas: { $push: { id: '$_id', area: '$area' } } } },
            { $lookup: { from: 'region', localField: 'region', foreignField: '_id', as: 'region_details' } }
        ];
        return DataAccess.aggregate('area', crieteria);
    },
    filterAll: (filter, loggedUser) => {
        let query;
        if (filter) {
            query = filter;
            query.deleted = { $ne: 1 }
        } else {
            query = { deleted: { $ne: 1 } };
        }
        
        loggedUser.area.push(ObjectId('5c5ac8c11086f2e73b5ddb66'));
        query["_id"]= { $in: loggedUser.area } ;
       
        return DataAccess.findAll('area', query);
    },
    all: async (query, loggedUser) => {

        let matchQuery = { $or: [{ area_code: 'na' }, { $and: [{ deleted: { $ne: 1 } }] }] };
        let crieteria;
        if (!query || !query.region || query.region == '[]' || query.region == '') {
            crieteria = [
                { $match: matchQuery },
                { $lookup: { from: 'region', localField: 'region', foreignField: '_id', as: 'region_details' } },
                { $sort: { created_at: -1 } }
            ];
        } else if (query.region == 'na') {
            crieteria = [
                { $match: { area_code: 'na' } },
                { $lookup: { from: 'region', localField: 'region', foreignField: '_id', as: 'region_details' } },
                { $sort: { created_at: -1 } }
            ];
        } else {
            let tempRegion = [];
            query.region.forEach(element => {
                tempRegion.push(ObjectId(element));
            });
            matchQuery['$or'][1]['$and'].push({ region: { $in: tempRegion } });


            loggedUser.area.push(ObjectId('5c5ac8c11086f2e73b5ddb66'));
            matchQuery['$or'][1]['$and'].push({ _id: { $in: loggedUser.area } });

            crieteria = [
                { $match: matchQuery },
                { $group: { _id: '$region', areas: { $push: { id: '$_id', area: '$area' } } } },
                { $lookup: { from: 'region', localField: '_id', foreignField: '_id', as: 'region_details' } },
            ];
        }
        if (query && query.modified_At) {
            crieteria["$match"]['modified_At'] = query.modified_At;
        }

        const result = await DataAccess.aggregate('area', crieteria);
        return result;
    },

    filterList: (loggedUser, body) => {
        let query = { deleted: { $ne: 1 } };

        let selectedRegion = [];
        if (!isEmpty(body.region)) {
            body.region.forEach(region => {
                selectedRegion.push(ObjectId(region));
            });
            selectedRegion.push(ObjectId('5c5a7e24932704b38ec31a96'));
            query['region'] = { $in: selectedRegion };
        }
        // else {
        //     /* if (!isEmpty(loggedUser.region)) {
        //         loggedUser.region.forEach(element => {
        //             selectedRegion.push(ObjectId(element));
        //         });
        //     } */
        //     loggedUser.area.push(ObjectId('5c5ac8c11086f2e73b5ddb66'));
        //     query['_id'] = { $in: loggedUser.area };
        // }

        loggedUser.area.push(ObjectId('5c5ac8c11086f2e73b5ddb66'));
        query['_id'] = { $in: loggedUser.area };

        // console.log('filer_list area query ==>: ', query);
        if (mydb) {
            const collections = collection(collection_name);
            return collections
                .aggregate([
                    { $match: query },
                    { $lookup: { from: 'region', localField: 'region', foreignField: '_id', as: 'region_details' } },
                ])
                .toArray()
                .then((result) => {
                    return result;
                });
        }
    },

    create: async (reqBody, loggedUser) => {
        const found = await DataAccess.findOne(collection_name, { area_code: reqBody.area_code, deleted: { $ne: 1 } });
        return found ? found._id : DataAccess.InsertOne(collection_name, reqBody).then((newArea) => {
            Audit.addLog({
                module: 'area',
                action: 'create',
                documentId: ObjectId(first(newArea)._id),
                userId: loggedUser ? ObjectId(loggedUser._id) : 'imported',
                message: 'created a area',
                data: reqBody,
                date: new Date()
            });
            return newArea.insertedId;
        });
    },

    update: async (id, body, loggedUser) => {
        const found = await DataAccess.findOne(collection_name, { area_code: body.area_code, _id: { $ne: ObjectId(id) }, deleted: { $ne: 1 } });
        const crieteria = { _id: ObjectId(id) };
        const doc = { $set: body };
        return found ? 0 : DataAccess.UpdateOne(collection_name, crieteria, doc)
            .then((result) => {
                Audit.addLog({
                    module: 'area',
                    action: 'update',
                    documentId: ObjectId(id),
                    userId: ObjectId(loggedUser._id),
                    message: 'updated a area',
                    data: body,
                    date: new Date()
                });
                return result.matchedCount > 0 ? 1 : 0;
            });
    },

    linkRegion: async (id, body) => {
        const found = await DataAccess.findOne('area', { _id: ObjectId(body.id), region: { $in: [ObjectId(id)] }, deleted: { $ne: 1 } });
        const crieteria = { _id: ObjectId(body.id) };
        const doc = { $push: { region: ObjectId(id) } };
        return found ? 0 : DataAccess.UpdateOne('area', crieteria, doc)
            .then((result) => {
                return result.matchedCount > 0 ? 1 : 0;
            });
    },

    deleteById: async (id, loggedUser) => {
        const deleteResult = await DataAccess.DeleteOne('area', { _id: ObjectId(id) });
        Audit.addLog({
            module: 'area',
            action: 'delete',
            documentId: ObjectId(id),
            userId: ObjectId(loggedUser._id),
            message: 'deleted a area',
            data: [{ id: ObjectId(id) }],
            date: new Date()
        });
        DataAccess.UpdateMany('zone', {}, { $pull: { area: ObjectId(id) } });
        DataAccess.UpdateMany('users', {}, { $pull: { area: ObjectId(id) } });
        DataAccess.UpdateMany('customer', {}, { $pull: { customer_area: ObjectId(id) } });
        DataAccess.UpdateMany('contacts', {}, { $pull: { contact_area: ObjectId(id) } });
        DataAccess.UpdateMany('lead', {}, { $pull: { lead_area: ObjectId(id) } });
        return deleteResult.matchedCount > 0 ? 1 : 0;
    },
};

module.exports = model;