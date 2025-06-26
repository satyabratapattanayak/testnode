const mongodb = require('mongodb').MongoClient;
const ObjectId = require('mongodb').ObjectID;
const httpStatus = require('http-status');
const { isEmpty, first, isArray, isUndefined } = require('lodash');

const APIError = require('../../helpers/APIError');
const DataAccess = require('../../helpers/DataAccess');
const config = require('../../config/config');
const Audit = require('../../modules/audit/audit.model');


let mydb;
const database = require('../../service/database');
database.getDb().then(res => { mydb = res; });

const collection_name = 'group';
const collection = (collectionName) => {
    return mydb.collection(collectionName);
};

const auditUpdateAction = 'update'; // log
const auditCreateAction = 'create'; // log
const groupModule = 'group';
const permissionModule = 'permissions';

let saveGroupsActivity = (body) => {
    body.date = new Date();
    Audit.addLog(body);
};

let savePermissionsActivity = (body) => {
    body.date = new Date();
    Audit.addLog(body);
};

const model = {
    groupDetails: (key) => {
        const crieteria = [
            { $match: { key: key } },
            { $lookup: { from: 'permissions', localField: 'permissions', foreignField: '_id', as: 'permission_details' } },
            { $addFields: { permissions: '$permission_details' } },
            { $project: { permission_details: 0 } }
        ];
        return DataAccess.aggregate('group', crieteria);
    },

    permissionDetails: (id) => {
        const crieteria = [
            { $match: { _id: ObjectId(id) } },
        ];
        return DataAccess.aggregate('permissions', crieteria);
    },

    listGroups: () => {
        const crieteria = [
            // { $addFields: { 'permissions': { '$toObjectId': '$permissions' } } },
            { $lookup: { from: 'permissions', localField: 'permissions', foreignField: '_id', as: 'permission_details' } },
        ];
        return DataAccess.aggregate('group', crieteria);
    },

    createGroup: async (reqBody, loggedUser) => {
        reqBody.key = reqBody.key.toLowerCase();

        if (reqBody.permissions && isArray(reqBody.permissions) && !isEmpty(reqBody.permissions)) {
            let array = [];
            reqBody.permissions.forEach(perm => { array.push(ObjectId(perm)); });
            reqBody.permissions = array;
        }


        let query = {
            $and: [{ $or: [{ name: reqBody.name }, { key: reqBody.key }] }, { deleted: { $ne: 1 } }]
        };
        const found = await DataAccess.findOne('group', query);
        return found ? 0 : DataAccess.InsertOne('group', reqBody).then((newGroup) => {
            saveGroupsActivity({
                module: groupModule,
                action: auditCreateAction,
                documentId: ObjectId(first(newGroup)._id),
                userId: ObjectId(loggedUser._id),
                data: newGroup,
                message: 'created a group'
            });
            return newGroup;
        });
    },

    updateGroup: async (id, reqBody, loggedUser) => {
        try {
            if (reqBody.key) delete reqBody.key;

            if (reqBody.permissions && isArray(reqBody.permissions) && !isEmpty(reqBody.permissions)) {
                let array = [];
                reqBody.permissions.forEach(perm => { array.push(ObjectId(perm)); });
                reqBody.permissions = array;
            }

            const crieteria = { _id: ObjectId(id) };
            const doc = { $set: reqBody };

            const result = await DataAccess.UpdateOne('group', crieteria, doc);
            saveGroupsActivity({
                module: groupModule,
                action: auditUpdateAction,
                documentId: ObjectId(id),
                userId: ObjectId(loggedUser._id),
                data: reqBody,
                message: 'updated a group'
            });
            return result.matchedCount > 0 ? 1 : 0;
        } catch (error) {
            throw new Error(error)
        }
    },

    listPermissions: () => {
        const crieteria = [
            { $match: {} },
            { $sort: { 'module': 1 } }
        ];
        return DataAccess.aggregate('permissions', crieteria);
    },

    createPermission: async (reqBody, loggedUser) => {
        reqBody.created_at = new Date();
        reqBody.modified_At = new Date();
        reqBody.created_by = loggedUser._id;
        reqBody.name = reqBody.name.toLowerCase();
        reqBody.module = reqBody.module.toLowerCase();

        let query = {
            $and: [{ name: reqBody.name }, { module: reqBody.module }, { deleted: { $ne: 1 } }]
        };

        const found = await DataAccess.findOne('permissions', query);
        return found ? 0 : DataAccess.InsertOne('permissions', reqBody).then((newPermission) => {
            savePermissionsActivity({
                module: permissionModule,
                action: auditCreateAction,
                documentId: ObjectId(first(newPermission)._id),
                userId: ObjectId(loggedUser._id),
                data: newPermission,
                message: 'created a permission'
            });

            return newPermission;
        });
    },



    /* getPermissions: (id, module) => {

        const crieteria = [
            { $match: { _id: ObjectId(id) } },
            { $lookup: { from: 'group', localField: 'group', foreignField: 'key', as: 'group_details' } },
            // { $lookup: { from: 'permissions', localField: 'group_details.permissions', foreignField: '_id', as: 'permission_details' } },
            {
                $project: {
                    'group_details.permissions': 1,
                    // permission_details: 1,
                }
            }
        ];
        return DataAccess.aggregate('users', crieteria).then((data) => {
            let matchQuery = {
                _id: { $in: data[0].group_details[0].permissions }
            };

            if (module) {
                matchQuery['module'] = { $eq: module };
            }

            console.log('matchQuery: ', matchQuery);


            let crieteria = [
                // { $match: { _id: { $in: data[0].group_details[0].permissions }, module: module } },
                { $match: matchQuery },
                {
                    $group:
                    {
                        _id: null,
                        // permissions: { $push: '$items' }
                        permissions: { $push: { $concat: ['$name', '_', '$module'] } }
                    }
                },
                {
                    $project: {
                        _id: 0
                    }
                }
            ];
            return DataAccess.aggregate('permissions', crieteria).then((resp) => {
                console.log('resp: ', resp);

                if (resp.length > 0 && module) {
                    let test = {
                        canView: false,
                        canAdd: false,
                        canEdit: false,
                        canDelete: false,
                    };
                    let view = 'view_' + module;
                    let add = 'add_' + module;
                    let edit = 'edit_' + module;
                    let Delete = 'delete_' + module;


                    if (resp.length > 0 && resp[0]['permissions'].length > 0 && resp[0]['permissions'].indexOf(view) !== -1) {
                        test.canView = true;
                    }
                    if (resp.length > 0 && resp[0]['permissions'].length > 0 && resp[0]['permissions'].indexOf(add) !== -1) {
                        test.canAdd = true;
                    }
                    if (resp.length > 0 && resp[0]['permissions'].length > 0 && resp[0]['permissions'].indexOf(edit) !== -1) {
                        test.canEdit = true;
                    }
                    if (resp.length > 0 && resp[0]['permissions'].length > 0 && resp[0]['permissions'].indexOf(Delete) !== -1) {
                        test.canDelete = true;
                    }
                    resp[0].modulePermissions = test;
                }
                return resp.length > 0 ? resp[0] : {};
                // return resp[0];
            });
        }).catch((e) => {
            console.log('ee: ', e)
        })
    }, */

    getPermissions: async (loggedUser, id, module) => {

        console.log('id: ', id);

        if (!id) {
            console.log('111111111111111111111');
            id = loggedUser._id
        }

        console.log('id: ', id);

        try {
            const crieteria = [
                { $match: { _id: ObjectId(id) } },
                { $lookup: { from: 'group', localField: 'group', foreignField: 'key', as: 'group_details' } },
                {
                    $unwind: {
                        path: '$group_details',
                        preserveNullAndEmptyArrays: true
                    }
                },
                {
                    '$lookup': {
                        from: 'permissions',
                        let: { scheduleId: '$group_details.permissions' },
                        pipeline: [
                            {
                                $match: {
                                    $expr: {
                                        $and: [
                                            {
                                                $in: ['$_id', '$$scheduleId']
                                            },
                                        ],
                                    }
                                }
                            }
                        ],
                        as: 'permission_details'
                    }
                },
                {
                    $unwind: {
                        path: '$permission_details',
                        preserveNullAndEmptyArrays: true
                    }
                },
                {
                    $group: {
                        _id: null,
                        permissions: { $push: { $concat: ['$permission_details.module', '_', '$permission_details.name'] } }
                    }
                },
                {
                    $project: {
                        _id: 0,
                    }
                },
            ];
            return DataAccess.aggregate('users', crieteria).then((Data) => {
                return Data[0];
            })
        } catch (error) {
            console.log('catch: ', error);
            throw new Error(error);
        }


    },
};

module.exports = model;