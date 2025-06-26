const { isEmpty } = require('lodash');
const ObjectId = require('mongodb').ObjectID;
const DataAccess = require('../../helpers/DataAccess');

let mydb;
const database = require('../../service/database');
const { formatDate, Modules, auditActions } = require('../shared/shared.model');
database.getDb().then(res => { mydb = res; });
const collection_name = 'audit';


const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;

/* const pageOrDefault = (page) => {
    console.log(`page is now: ${page}`);
    if (page < 0) {
        page = DEFAULT_PAGE;
    }
    console.log(`page is now 1: ${page}`);
    const result = !page ? DEFAULT_PAGE : page;
    return result;
}; */

const pageOrDefault = (page) => {
    const result = !page ? DEFAULT_PAGE : parseInt(page);
    return result;
};

const limitOrDefault = (limit) => {
    return !limit ? DEFAULT_LIMIT : parseInt(limit);
};

let commonFields = [

    {
        $addFields: {
            newStatus: {
                $convert: {
                    input: '$data.newStatus',
                    to: 'objectId',
                    onError: 0
                }
            },
            oldStatus: {
                $convert: {
                    input: '$data.oldStatus',
                    to: 'objectId',
                    onError: 0
                }
            },
            userId22: {
                $cond: {
                    if: { $isArray: '$data' },
                    then: {
                        $reduce: {
                            input: "$data",
                            initialValue: "",
                            in: { $concat: ['$$value', { $toString: '$$this.staffId' }, ','] }
                        }
                    },
                    else: ','
                }
            },
            userId33: { '$split': ['$userId22', ','] }
        },
    },
    {
        '$lookup': {
            from: 'status',
            let: { status: { $ifNull: ['$newStatus', undefined] } },
            pipeline: [
                {
                    $match: {
                        $expr: {
                            $and: [
                                {
                                    $eq: ['$_id', '$$status']
                                },
                            ],
                        }
                    }
                }
            ],
            as: 'status_details'
        }
    },
    {
        '$lookup': {
            from: 'status',
            let: { status: { $ifNull: ['$oldStatus', null] } },
            pipeline: [
                {
                    $match: {
                        $expr: {
                            $and: [
                                {
                                    $eq: ['$_id', '$$status']
                                },
                            ],
                        }
                    }
                }
            ],
            as: 'old_status_details'
        }
    },
    { $lookup: { from: 'users', localField: 'userId', foreignField: '_id', as: 'user_details' } },
    { $lookup: { from: 'customer_cmr_details', localField: 'data.CRM_CMR_No', foreignField: 'CRM_CMR_No', as: 'cmr_details' } },
    { $lookup: { from: 'customer', localField: 'documentId', foreignField: '_id', as: 'customer_details' } },
    { $lookup: { from: 'lead', localField: 'documentId', foreignField: '_id', as: 'lead_details' } },
    { $lookup: { from: 'contacts', localField: 'documentId', foreignField: '_id', as: 'contacts_details' } },
    { $lookup: { from: 'scheduler', localField: 'documentId', foreignField: '_id', as: 'scheduler_details' } },
    { $lookup: { from: 'task_types', localField: 'data.type', foreignField: '_id', as: 'schedule_type_details' } },
    { $lookup: { from: 'contacts', localField: 'data.contactId', foreignField: '_id', as: 'linked_contacts_details' } },
    { $lookup: { from: 'scheduler', localField: 'data._id', foreignField: '_id', as: 'linked_scheduler_details' } },
    {
        $lookup: {
            from: "customer",
            let: {
                customerId2: "$data.customerId",
                customerId1: {
                    $cond: {
                        if: { $isArray: '$data' },
                        then: '$data',
                        else: []
                    }
                },
            },
            pipeline: [
                {
                    $addFields: {
                        customerId3: {
                            $convert: {
                                input: '$$customerId2',
                                to: 'objectId',
                                onError: 0
                            }
                        },
                    }
                },
                {
                    $match: {
                        $expr: {
                            $or: [
                                { $in: ["$_id", "$$customerId1"] },
                                { $eq: ["$_id", "$customerId3"] },
                            ]
                        }
                    }
                },
            ],
            as: "linked_customer_details"
        }
    },
    {
        $lookup: {
            from: "users",
            let: {
                splittedVar: {
                    $cond: {
                        if: { $isArray: '$data' },
                        then: {
                            $reduce: {
                                input: "$data",
                                initialValue: "",
                                in: { $concat: ['$$value', { $toString: '$$this.staffId' }, ','] }
                            }
                        },
                        else: ','
                    }
                },
                userId1: {
                    $cond: {
                        if: { $isArray: '$users' },
                        then: '$users',
                        else: []
                    }
                },
            },
            pipeline: [
                {
                    $addFields: {
                        _id: {
                            $convert: {
                                input: '$_id',
                                to: 'string',
                                onError: 0
                            }
                        },
                        userId3: { '$split': ['$$splittedVar', ','] },
                    }
                },
                {
                    $addFields: {
                        userId2: {
                            $cond: {
                                if: { $isArray: '$userId3' },
                                then: '$userId3',
                                else: []
                            }
                        },
                    }
                },
                {
                    $match: {
                        $expr: {
                            $or: [
                                { $in: ["$_id", "$$userId1"] },
                                { $in: ["$_id", "$userId2"] },
                            ]
                        }
                    }
                },
            ],
            as: "linked_user_details"
        }
    },
]


const setMessage = {
    $switch: {
        branches: [
            {
                case: { $and: [{ $eq: ['$action', auditActions().approve] }, { $eq: ['$subModule', Modules().cmr] }, { $eq: ['$data.sendForApproval', true] }] },
                then: { $concat: ['sent a <a style="cursor: pointer;"> ', '$data.CRM_CMR_No', ' </a> for approval'] }
            },
            {
                case: { $and: [{ $eq: ['$action', auditActions().approve] }, { $eq: ['$subModule', Modules().cmr] }, { $eq: ['$data.status', 'Approved'] }] },
                then: { $concat: ['Approved the <a style="cursor: pointer;"> ', '$data.CRM_CMR_No', ' </a>'] }
            },
            {
                case: { $and: [{ $eq: ['$action', auditActions().reject] }, { $eq: ['$subModule', Modules().cmr] }, { $eq: ['$data.status', 'rejected'] }] },
                then: { $concat: ['rejected the <a style="cursor: pointer;"> ', '$data.CRM_CMR_No', ' </a>'] }
            },
            {
                case: { $and: [{ $eq: ['$module', Modules().customer] }, { $eq: ['$action', auditActions().create] }, { $ne: ['$subModule', Modules().cmr] }] },
                then: { $concat: ['created the ', '$module', ' ', { $arrayElemAt: ['$customer_details.customer_code', 0] }] }
            },
            {
                case: { $and: [{ $eq: ['$module', Modules().customer] }, { $eq: ['$action', auditActions().update] }] },
                then: 'updated this customer'
            },
            {
                case: { $and: [{ $eq: ['$subModule', Modules().cmr] }, { $eq: ['$action', auditActions().create] }] },
                then: { $concat: ['create a new <a  style="cursor: pointer;"> ', '$data.CRM_CMR_No', ' </a>'] }
            },
            {
                case: { $and: [{ $eq: ['$module', Modules().customer] }, { $eq: ['$action', auditActions().AddNotes] }] },
                then: 'added a <a style="cursor: pointer;"> note </a>'
            },
            {
                case: { $and: [{ $eq: ['$module', Modules().customer] }, { $eq: ['$action', auditActions().link] }] },
                then: {
                    $cond: {
                        if: { $eq: ['$linked_customer_details', []] },
                        then: 'linked a customer',
                        // else: { $concat: ['linked a customer <a  style="cursor: pointer;"> ', { $arrayElemAt: ['$linked_customer_details.customer_name', 0] }, ' </a>'], }
                        // else: { $concat: ['linked a customer ', '$linkedCustomerNames'], }
                        else: 'linked a customer'
                    }
                }
            },
            {
                case: { $and: [{ $eq: ['$module', Modules().shceduler] }, { $eq: ['$action', auditActions().AddNotes] }] },
                 then: {
                    $cond: {
                        if: { $eq: ['$data.type', [11]] },
                        then: 'added a <a style="cursor: pointer;">visit report </a>',
                        else: 'added a <a style="cursor: pointer;"> note </a>'
                    }
                }
            },
            {
                case: { $and: [{ $eq: ['$module', Modules().shceduler] }, { $eq: ['$action', auditActions().link] }] },
                then: { $concat: ['linked a ', { $arrayElemAt: ['$schedule_type_details.type', 0] }, ' <a  style="cursor: pointer;"> ', { $arrayElemAt: ['$linked_scheduler_details.subject', 0] }, ' </a>'] }
            },
            {
                case: { $and: [{ $eq: ['$module', Modules().shceduler] }, { $eq: ['$action', auditActions().create] }] },
                then: { $concat: ['created this ', { $arrayElemAt: ['$schedule_type_details.type', 0] }] }
            },
            {
                case: { $and: [{ $eq: ['$module', Modules().shceduler] }, { $eq: ['$action', auditActions().update] }] },
                then: {
                    $cond: {
                        if: { $eq: ['$schedule_type_details', []] },
                        then: 'This schedule has become overdue',
                        else: { $concat: ['updated this ', { $arrayElemAt: ['$schedule_type_details.type', 0] }] }
                    }
                }
            },
            {
                case: { $and: [{ $eq: ['$module', Modules().shceduler] }, { $eq: ['$action', auditActions().elapse] }] },
                then: 'This schedule has become overdue'
            },
            {
                case: { $and: [{ $eq: ['$module', Modules().lead] }, { $eq: ['$action', auditActions().AddNotes] }] },
                then: 'added a <a style="cursor: pointer;"> note </a>'
            },
            {
                case: { $and: [{ $eq: ['$module', Modules().lead] }, { $eq: ['$action', auditActions().approve] }] },
                then: 'approved the lead'
            },
            {
                case: { $and: [{ $eq: ['$module', Modules().lead] }, { $eq: ['$action', auditActions().update] }] },
                then: 'updated this lead'
            },
            {
                case: { $and: [{ $eq: ['$module', Modules().lead] }, { $eq: ['$action', auditActions().change_status] }] },
                then: {
                    $cond: {
                        if: { $eq: ['$old_status_details', []] },
                        then: {
                            $concat: ['changed the status to ', { $arrayElemAt: ['$status_details.type', 0] }, '']
                        }, else: {
                            $cond: {
                                if: { $eq: ['$status_details', []] }, then: 'chnaged the status',
                                else: {
                                    $concat: ['changed the status from ', { $arrayElemAt: ['$old_status_details.type', 0] }, ' to ', { $arrayElemAt: ['$status_details.type', 0] }, '']
                                }
                            }
                        }
                    }
                }
            },
            {
                case: { $and: [{ $eq: ['$module', Modules().contact] }, { $eq: ['$action', auditActions().link] }] },
                then: {
                    $cond: {
                        if: { $eq: ['$linked_contacts_details', []] },
                        then: 'linked a contact',
                        else: {
                            // $concat: ['linked a contact <a  style="cursor: pointer;"> ', '$linkedContactNames', ' </a>'],
                            // $concat: ['linked a contact ', '$linkedContactNames',],
                            $concat: 'linked a contact ',
                        }
                    }
                }
            },
            {
                case: { $and: [{ $eq: ['$module', Modules().contact] }, { $eq: ['$action', auditActions().AddNotes] }] },
                then: 'added a <a style="cursor: pointer;"> note </a>'
            },
            {
                case: { $and: [{ $eq: ['$action', auditActions().userLink] }] },
                // then: { $concat: ['linked a staff <a  style="cursor: pointer;"> ', { $arrayElemAt: ['$linked_user_details.first_name', 0] }, ' ', { $arrayElemAt: ['$linked_user_details.last_name', 0] }, ' </a>'] }
                then: 'linked a staff'
            },
            {
                case: { $and: [{ $eq: ['$module', Modules().user] }, { $eq: ['$action', auditActions().AddNotes] }] },
                then: 'added a <a style="cursor: pointer;"> note </a>'
            },
            {
                case: { $and: [{ $eq: ['$module', Modules().user] }, { $eq: ['$action', auditActions().link] }] },
                // then: { $concat: ['linked a staff <a  style="cursor: pointer;"> ', { $arrayElemAt: ['$linked_user_details.first_name', 0] }, ' ', { $arrayElemAt: ['$linked_user_details.last_name', 0] }, ' </a>'] }
                // then: { $concat: ['linked a staff ', '$linkedUserNames',] }
                then: 'linked a staff'
            },
        ],
        default: '$ActualMessage'
    }
};
const model = {
    listBy: (page, limit, query) => {
        try {
            console.log('model::audit findBy: ', query);
            let matchQuery = { isArchived: { $ne: 1 } };
            let temp_documentId = [];

            if (query && query.documentId && query.documentId.length > 0) {
                query.documentId.forEach(element => {
                    temp_documentId.push(ObjectId(element));
                });
                matchQuery['documentId'] = { $in: temp_documentId };
            }
            if (query && query.action && query.acton != "") {
                matchQuery['action'] = query.action;
            }
            
            const cardIcon = {
                $switch: {
                    branches: [
                        { case: { $eq: ['$action', 'create'] }, then: 'add-circle' },
                        { case: { $eq: ['$action', 'update'] }, then: 'create' },
                        { case: { $eq: ['$action', 'update_status'] }, then: 'create' },
                        { case: { $eq: ['$action', 'notes_add'] }, then: 'paper' },
                        { case: { $eq: ['$action', 'link'] }, then: 'link' },
                    ],
                    default: ''
                }
            };
            const crieteria = ([
                { $match: matchQuery },
                ...commonFields,
                { $sort: { date: -1 } },
                {
                    $addFields: {
                        ActualMessage: '$message',
                        linkedContactNames: {
                            $reduce: {
                                input: "$linked_contacts_details",
                                initialValue: "",
                                in: { $concat: ["$$value", '<a style="cursor: pointer;">', '$$this.contact_name', '</a>', ', '] }
                                // in: { $concat: ["$$value", '$$this.contact_name', ', '] }
                            }
                        },
                        linkedUserNames: {
                            $reduce: {
                                input: "$linked_user_details",
                                initialValue: "",
                                in: { $concat: ["$$value", '<a style="cursor: pointer;">', '$$this.first_name', ' ', '$$this.last_name', '</a>', ', '] }
                            }
                        },
                        linkedCustomerNames: {
                            $reduce: {
                                input: "$linked_customer_details",
                                initialValue: "",
                                in: { $concat: ["$$value", '<a style="cursor: pointer;">', '$$this.customer_name', '</a>', ', '] }
                            }
                        },
                    }
                },
                {
                    $project: {
                        schedule_type_details: 1,
                        customer_details: { _id: 1, customer_name: 1 },
                        lead_details: { _id: 1, lead_name: 1 },
                        contacts_details: { _id: 1, contact_name: 1 },
                        scheduler_details: { _id: 1, subject: 1 },
                        linked_user_details: {
                            _id: 1,
                            first_name: 1,
                            last_name: 1,
                            userName: { $concat: [{ $arrayElemAt: ['$linked_user_details.first_name', 0] }, ' ', { $arrayElemAt: ['$linked_user_details.last_name', 0] }] },
                        },
                        linked_contacts_details: { _id: 1, contact_name: 1 },
                        linked_scheduler_details: { _id: 1, subject: 1 },
                        linked_customer_details: { _id: 1, customer_name: 1 },
                        cmr_details: { _id: 1, CRM_CMR_No: 1 },
                        user_details: { _id: 1, first_name: 1, last_name: 1 },
                        module: 1,
                        userId: 1,
                        documentId: 1,
                        message: 1,
                        status_details: 1,
                        userName: { $concat: [{ $arrayElemAt: ['$user_details.first_name', 0] }, ' ', { $arrayElemAt: ['$user_details.last_name', 0] }] },
                        old_status_details: 1,
                        date: { $arrayElemAt: [formatDate('$date'), 0] },
                        action: 1,
                        card_color: setCardColor(),
                        card_icon: cardIcon,
                        message: setMessage,
                        data: {
                            // cmrId: { $arrayElemAt: ['$cmr_details._id', 0] },
                            // _id: 1,
                            // CRM_CMR_No: 1,
                            // contactId: { $arrayElemAt: ['$linked_contacts_details._id', 0] },
                            note: '$data.data',
                            type: '$data.type',
                            // customerId: '$data.customerId'
                        },
                    }
                },

                { $skip: limitOrDefault(limit) * (pageOrDefault(page) - 1) },
                { $limit: limitOrDefault(limit) },
            ]);
            return DataAccess.aggregate(collection_name, crieteria);
        } catch (error) {
            throw new Error(error);
        }
    },
    addLog: body => DataAccess.InsertOne(collection_name, body),

    filter: (id, query) => {

        let temp = [];

        if (query.user_activity == 1) {
            temp.push('create');
            temp.push('update');
            temp.push('update_status');
            temp.push('delete');
        }

        if (query.event == 1) {
            temp.push('notes_add');
            temp.push('target_add');
            temp.push('target_update');
            temp.push('target_delete');
            temp.push('link');
            temp.push('unlink');
        }

        console.log('model::filter: ', temp);

        const crieteria = [
            { $match: { documentId: ObjectId(id), action: { $in: temp } } },
            { $lookup: { from: 'users', localField: 'userId', foreignField: '_id', as: 'user_details' } },
            { $lookup: { from: 'customer', localField: 'documentId', foreignField: '_id', as: 'customer_details' } },
            { $lookup: { from: 'lead', localField: 'documentId', foreignField: '_id', as: 'lead_details' } },
            { $lookup: { from: 'contacts', localField: 'documentId', foreignField: '_id', as: 'contact_details' } },
            { $project: { 'user_details.phone': 0, 'user_details.address': 0, 'user_details.role': 0, 'user_details.staffList': 0, 'user_details.password': 0, 'user_details.isActive': 0, 'user_details.created_at': 0, 'user_details.city': 0, 'user_details.state': 0, 'user_details.region': 0 } },
            { $sort: { date: -1 } }
        ];
        return DataAccess.aggregate('audit', crieteria);
    },
    updateMany: (crieteria, doc) => {
        return DataAccess.UpdateMany(collection_name, crieteria, doc);
    },
    custom: async () => {
        const allUsers = await DataAccess.findAll('users', { deleted: { $ne: 1 } })
        for (let i = 0; i < allUsers.length; i++) {
            const hashedPassword = await encryptPassword(allUsers[i].password)
            console.log('hash: ', hashedPassword);
            await DataAccess.UpdateOne('users', { _id: ObjectId(allUsers[i]._id) }, { $set: { password: hashedPassword } })
        }
        return true
    }
};

module.exports = model;

const encryptPassword = async (password, currentLoggedUser) => {

    return new Promise((resolve, reject) => {
        let hash = '';
        // Store hash in your password DB.
        // Store hash in your password DB.
        resolve(hash);
        // });
        // });
    })
}


function setCardColor() {
    return {
        $switch: {
            branches: [
                { case: { $eq: ['$action', 'create'] }, then: '#0E6655' },
                { case: { $eq: ['$action', 'update'] }, then: '#004d66' },
                { case: { $eq: ['$action', 'delete'] }, then: '#B40404' },
                { case: { $eq: ['$action', 'notes_add'] }, then: '#585858' },
                { case: { $eq: ['$action', 'link'] }, then: '#2E4053' },
                { case: { $eq: ['$action', 'user_link'] }, then: '#2E4053' },
                { case: { $eq: ['$action', 'unlink'] }, then: '#8A0829' },
                { case: { $eq: ['$action', 'update_status'] }, then: '#946611' },
                { case: { $eq: ['$action', 'import'] }, then: '#B7950B' },
                { case: { $eq: ['$action', 'bd_update'] }, then: '#5B2C6F' },
                { case: { $eq: ['$action', 'approve'] }, then: '#084430' },
                { case: { $eq: ['$action', 'reject'] }, then: '#A70E25' },
                { case: { $eq: ['$action', 'elapse'] }, then: '#A70E25' },
            ],
            default: '#000000'
        }
    };
}

