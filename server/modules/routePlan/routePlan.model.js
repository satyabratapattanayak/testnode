const fs = require('fs');
const { isEmpty } = require('lodash');
const ObjectId = require('mongodb').ObjectID;

const DataAccess = require('../../helpers/DataAccess');
const Audit = require('../audit/audit.model.js');
const Notes = require('../notes/notes.model.js');
const { auditActions } = require('../shared/shared.model');

let mydb;
const database = require('../../service/database');
database.getDb().then(res => { mydb = res; });
const collection_name = 'routePlan';


const routePlanModule = 'routePlan';

let saveRoutePlanActivity = (body) => {
    body.date = new Date();
    Audit.addLog(body);
};

const addNote = (module, documentId, notes, user) => {
    if (isEmpty(notes)) { notes = []; } else {
        notes = [{
            data: notes,
            userId: ObjectId(user),
            date: new Date()
        }];
    }
    const body = {
        module: module,
        documentId: ObjectId(documentId),
        notes: notes
    };
    Notes.create(body);
};


const model = {
    findById: (id) => {
        const crieteria = [
            { $match: { _id: ObjectId(id) } },
            { $addFields: { '_id': { '$toString': '$_id' } } },
            // { $lookup: { from: 'scheduler', localField: '_id', foreignField: 'route_plan', as: 'schedule_details' } },
            {
                $lookup: {
                    from: 'scheduler',
                    let: {
                        id: "$_id"
                    },
                    pipeline: [
                        {
                            $match:
                            {
                                $expr:
                                {
                                    $and:
                                        [
                                            { $eq: ["$route_plan", "$$id"] },
                                            { $ne: ['$deleted', 1] }

                                        ]
                                }
                            }
                        }

                    ],
                    as: 'schedule_details'
                }
            },
            { $lookup: { from: 'task_types', localField: 'schedule_details.type', foreignField: '_id', as: 'schedule_types' } },
            { $lookup: { from: 'users', localField: 'schedule_details.assigned_to', foreignField: '_id', as: 'schedule_assignee_details' } },
            { $lookup: { from: 'users', localField: 'assigned_to', foreignField: '_id', as: 'assignee_details' } },
            {
                $addFields: {
                    assigned_to: '$assignee_details',
                    linkedSchedules: '$schedule_details',
                }
            },
            {
                $project: {
                    schedule_details: 0,
                    assignee_details: 0,
                    'assigned_to.tokens': 0,
                    'assigned_to.email': 0,
                    'assigned_to.password': 0,
                    'assigned_to.created_at': 0,
                    'assigned_to.created_by': 0,
                    'assigned_to.region': 0,
                    'assigned_to.area': 0,
                    'assigned_to.zone': 0,
                    'assigned_to.isActive': 0,
                    'assigned_to.city': 0,
                    'assigned_to.address': 0,
                    'assigned_to.role_access_reports_mapping': 0,
                    'assigned_to.state': 0,
                    'assigned_to.status': 0,
                    'assigned_to.reports_to_all_tagged': 0,
                    'assigned_to.isFirstTimeLogin': 0,
                    'assigned_to.isAdmin': 0,
                    'assigned_to.acl_meta': 0,
                    'assigned_to.group': 0,
                    'assigned_to.businessunit': 0,
                    'assigned_to.phone': 0,
                    'assigned_to.department': 0,
                    'assigned_to.emp_code': 0,
                    'assigned_to.businesscategory': 0,
                    'assigned_to.job_title': 0,
                }
            }
        ];
        return DataAccess.aggregate(collection_name, crieteria);
    },
    all: (filter) => {
        let query = { deleted: { $ne: 1 } };
        if (filter && filter.assigned_to && filter.assigned_to.length > 0) {
            let assigness = []
            filter.assigned_to.forEach(element => {
                assigness.push(ObjectId(element))
            });
            // query['assigned_to'] = { $in: filter.assigned_to }
            query['assigned_to'] = { $in: assigness }
        }
        
          if (filter && filter.range && !isEmpty(filter.range.start_date) && !isEmpty(filter.range.end_date)) {
            query['created_at'] = { $gte: new Date(filter.range.start_date), $lte: new Date(filter.range.end_date) };
        }

        const crieteria = [
            { $match: query },
            { $lookup: { from: 'users', localField: 'assigned_to', foreignField: '_id', as: 'assignee_details' } },
            {
                $addFields: {
                    assigned_to: '$assignee_details',
                }
            },
            {
                $project: {
                    assignee_details: 0,
                    'assigned_to.tokens': 0,
                    'assigned_to.email': 0,
                    'assigned_to.password': 0,
                    'assigned_to.created_at': 0,
                    'assigned_to.created_by': 0,
                    'assigned_to.region': 0,
                    'assigned_to.area': 0,
                    'assigned_to.zone': 0,
                    'assigned_to.isActive': 0,
                    'assigned_to.city': 0,
                    'assigned_to.address': 0,
                    'assigned_to.role_access_reports_mapping': 0,
                    'assigned_to.state': 0,
                    'assigned_to.status': 0,
                    'assigned_to.reports_to_all_tagged': 0,
                    'assigned_to.isFirstTimeLogin': 0,
                    'assigned_to.isAdmin': 0,
                    'assigned_to.acl_meta': 0,
                    'assigned_to.group': 0,
                    'assigned_to.businessunit': 0,
                    'assigned_to.phone': 0,
                    'assigned_to.department': 0,
                    'assigned_to.emp_code': 0,
                    'assigned_to.businesscategory': 0,
                    'assigned_to.job_title': 0,
                }
            },
            { $sort: { 'created_at': -1 } }
        ];
        return DataAccess.aggregate(collection_name, crieteria);
    },
    create: async (loggedUser, body) => {
        const data = await DataAccess.InsertOne(collection_name, body);
        saveRoutePlanActivity({
            module: routePlanModule,
            action: auditActions().create,
            documentId: ObjectId(data[0]._id),
            userId: ObjectId(loggedUser._id),
            data: data,
            message: 'created a Route Plan'
        });
        addNote('routePlan', data[0]._id, data[0].notes, ObjectId(loggedUser._id));
        return data;
    },
    update: async (loggedUser, id, body) => {
        try {
            const crieteria = { _id: ObjectId(id) };
            const doc = { $set: body };
            const result = await DataAccess.UpdateOne(collection_name, crieteria, doc);
            saveRoutePlanActivity({
                module: routePlanModule,
                action: auditActions().update,
                documentId: ObjectId(id),
                userId: ObjectId(loggedUser._id),
                data: body,
                message: 'updated the Route Plan'
            });
            return result.matchedCount > 0 ? 1 : 0;
        } catch (error) {
            throw new Error(error);
        }
    },

    delete: async (id, loggedUser) => {
        try {
            const crieteria = { _id: ObjectId(id) };
            const result = await DataAccess.DeleteOne(collection_name, crieteria);
            saveRoutePlanActivity({
                module: routePlanModule,
                action: auditActions().Delete,
                documentId: ObjectId(id),
                userId: ObjectId(loggedUser._id),
                data: { _id: id },
                message: 'deleted the Route Plan'
            });
            DataAccess.findAll('scheduler', { route_plan: id }).then((found) => {
                if (found) {
                    found.forEach(ele => {
                        DataAccess.DeleteOne('scheduler', { _id: ObjectId(ele._id) });
                    });
                }
            });
            return result.matchedCount > 0 ? 1 : 0;
        } catch (error) {
            throw new Error(error);
        }
    },
    findBy: (query) => {
        const crieteria = [
            { $match: query },
        ];
        return DataAccess.aggregate(collection_name, crieteria);
    },
    updateByQuery: (id, query) => {
        return DataAccess.UpdateOne(collection_name, id, query)
    }
};

module.exports = model;
