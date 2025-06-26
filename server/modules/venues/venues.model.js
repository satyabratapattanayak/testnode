const mongodb = require('mongodb').MongoClient;
const ObjectId = require('mongodb').ObjectID;
const httpStatus = require('http-status');
const { isEmpty, first } = require('lodash');


const { formatDate } = require('../shared/shared.model')
const DataAccess = require('../../helpers/DataAccess');
const Audit = require('../audit/audit.model.js');


let mydb;
const collection_name = 'venues';
const database = require('../../service/database');
database.getDb().then(res => { mydb = res; });

const collection = (collectionName) => { return mydb.collection(collectionName); };


const model = {
    findById: (id) => {
        const crieteria = [
            {
                $addFields: {
                    region: {
                        $convert: {
                            input: '$region',
                            to: 'objectId',
                            onError: 0
                        }
                    },
                    area: {
                        $convert: {
                            input: '$area',
                            to: 'objectId',
                            onError: 0
                        }
                    },
                    zone: {
                        $convert: {
                            input: '$zone',
                            to: 'objectId',
                            onError: 0
                        }
                    },
                }
            },
            { $match: { _id: ObjectId(id) } },
            { $lookup: { from: 'users', localField: 'created_by', foreignField: '_id', as: 'created_by_details' } },
            { $lookup: { from: 'venue_areas', localField: 'linked_area', foreignField: '_id', as: 'linked_area_details' } },
            { $lookup: { from: 'state', localField: 'state', foreignField: 'stateCode', as: 'state_details' } },
            { $lookup: { from: 'country', localField: 'country', foreignField: 'countryCode', as: 'country_details' } },
            { $lookup: { from: 'region', localField: 'region', foreignField: '_id', as: 'region_details' } },
            { $lookup: { from: 'area', localField: 'area', foreignField: '_id', as: 'area_details' } },
            { $lookup: { from: 'zone', localField: 'zone', foreignField: '_id', as: 'zone_details' } },
            {
                $project: {
                    _id: 1,
                    venue_title: 1,
                    address1: 1,
                    address2: 1,
                    address3: 1,
                    postcode: 1,
                    city: 1,
                    isActive: 1,
                    region: {
                        _id: { $arrayElemAt: ['$region_details._id', 0] },
                        region: { $arrayElemAt: ['$region_details.region', 0] }
                    },
                    area: {
                        _id: { $arrayElemAt: ['$area_details._id', 0] },
                        area: { $arrayElemAt: ['$area_details.area', 0] }
                    },
                    zone: {
                        _id: { $arrayElemAt: ['$zone_details._id', 0] },
                        zone: { $arrayElemAt: ['$zone_details.zone', 0] },
                    },
                    state: {
                        state: { $arrayElemAt: ['$state_details.state', 0] },
                        stateCode: { $arrayElemAt: ['$state_details.stateCode', 0] },
                    },
                    country: {
                        country: { $arrayElemAt: ['$country_details.country', 0] },
                        countryCode: { $arrayElemAt: ['$country_details.countryCode', 0] },
                    },
                    category: 1,
                    linked_area: '$linked_area_details',
                    telephone: 1,
                    address: 1,
                    latitude: 1,
                    longitude: 1,
                    location: 1,
                    created_by: { $arrayElemAt: ['$created_by_details.first_name', 0] },
                    created_at: 1,
                }
            }
        ];
        return DataAccess.aggregate(collection_name, crieteria);
    },
    all: (reqQuery) => {
        let query;
        if (reqQuery.venuePage == 1) {
            query = { deleted: { $ne: 1 } }
        } else {
            query = { deleted: { $ne: 1 }, isActive: true }
        }
        const crieteria = [
            {
                $addFields: {
                    region: {
                        $convert: {
                            input: '$region',
                            to: 'objectId',
                            onError: 0
                        }
                    }
                }
            },
            { $match: query },
            { $lookup: { from: 'state', localField: 'state', foreignField: 'stateCode', as: 'state_details' } },
            { $lookup: { from: 'country', localField: 'country', foreignField: 'countryCode', as: 'country_details' } },
            { $lookup: { from: 'region', localField: 'region', foreignField: '_id', as: 'region_details' } },
            {
                $addFields: {
                    state: { $arrayElemAt: ['$state_details.state', 0] },
                    region: { $arrayElemAt: ['$region_details.region', 0] },
                }
            },
            { $sort: { created_at: -1 } },
            {
                $project: {
                    venue_title: 1,
                    city: 1,
                    state: 1,
                    country: { $arrayElemAt: ['$country_details.country', 0] },
                    region: 1,
                    isActive: 1,
                    created_at: formatDate('$created_at'),
                }
            }
        ]
        return DataAccess.aggregate(collection_name, crieteria)
    },
    create: (reqBody, loggedUser) => {
        return DataAccess.InsertOne(collection_name, reqBody).then((newVenue) => {
            Audit.addLog({
                module: 'venue', // todo: send moduleId
                action: 'create',
                documentId: ObjectId(first(newVenue)._id),
                userId: ObjectId(loggedUser._id),
                message: 'created a venue',
                data: reqBody,
                date: new Date()
            });
            return newVenue;
        });
    },

    update: (id, body, loggedUser) => {
        console.log('req: ', id, '::', body, '::', loggedUser);

        return DataAccess.UpdateOne(collection_name, { _id: ObjectId(id) }, { $set: body })
            .then((result) => {
                Audit.addLog({
                    module: 'venue', // todo: send moduleId
                    action: 'update',
                    documentId: ObjectId(id),
                    userId: ObjectId(loggedUser._id),
                    message: 'updated a venue',
                    data: body,
                    date: new Date()
                });
                return result.matchedCount > 0 ? 1 : 0;
            });
    },

    deleteById: (id) => {
        return DataAccess.DeleteOne(collection_name, { _id: ObjectId(id) }).then((result) => {
            return result.modifiedCount > 0 ? 1 : 0;
        });
    },
};

module.exports = model;