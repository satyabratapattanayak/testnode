// @ts-check
const ObjectId = require('mongodb').ObjectID;
const PubSub = require('pubsub-js');
const { isEmpty, first, isArray, isNull } = require('lodash');

const DataAccess = require('../../helpers/DataAccess');
const Audit = require('../../modules/audit/audit.model');
const acl = require('../../service/acl');


const auditLinkAction = 'link'; // log
const auditUnLinkAction = 'unlink'; // log


const database = require('../../service/database');
const collection_name = 'endProduct';
let mydb;
database.getDb().then(res => { mydb = res; });



let saveActivity = (body) => {
    body.date = new Date();
    Audit.addLog(body);
};

const setLinkingQuery_IndustryAndSub = (crieteria, doc, oldData, id, reqBody) => {
    if (oldData) {
        crieteria = {
            _id: ObjectId(id),
            linked_IndustryAndSubIndustry: { $elemMatch: { industryId: reqBody.industryId } }
        };
        doc = {
            $set: {
                'linked_IndustryAndSubIndustry.$.linked_subIndustry': reqBody.linked_subIndustry,
                modified_At: new Date()
            }
        };
    } else {
        crieteria = { _id: ObjectId(id) };
        doc = {
            $push: {
                linked_IndustryAndSubIndustry: {
                    industryId: reqBody.industryId,
                    linked_subIndustry: reqBody.linked_subIndustry
                }
            },
            $set: {
                modified_At: new Date()
            }
        };
    }
    return { crieteria: crieteria, doc: doc };
};

const setLinkingQuery_ProcessAndSub = (crieteria, doc, oldData, id, reqBody) => {
    if (oldData) {
        crieteria = {
            _id: ObjectId(id),
            linked_ProcessAndSubProcess: { $elemMatch: { processId: reqBody.processId } }
        };
        doc = {
            $set: {
                'linked_ProcessAndSubProcess.$.linked_subProcess': reqBody.linked_subProcess,
                modified_At: new Date()
            }
        };
    } else {
        crieteria = { _id: ObjectId(id) };
        doc = {
            $push: {
                linked_ProcessAndSubProcess: {
                    processId: reqBody.processId,
                    linked_subProcess: reqBody.linked_subProcess
                }
            },
            $set: {
                modified_At: new Date()
            }
        };
    }
    return { crieteria: crieteria, doc: doc };
};

const setLinkingQuery_CategoryAndSub = (crieteria, doc, oldData, id, reqBody) => {
    if (oldData) {
        crieteria = {
            _id: ObjectId(id),
            linked_CategoryAndSubCategory: { $elemMatch: { categoryId: reqBody.categoryId } }
        };
        doc = {
            $set: {
                'linked_CategoryAndSubCategory.$.linked_subCategory': reqBody.linked_subCategory,
                modified_At: new Date()
            }
        };
    } else {
        crieteria = { _id: ObjectId(id) };
        doc = {
            $push: {
                linked_CategoryAndSubCategory: {
                    categoryId: reqBody.categoryId,
                    linked_subCategory: reqBody.linked_subCategory
                }
            },
            $set: {
                modified_At: new Date()
            }
        };
    }
    return { crieteria: crieteria, doc: doc };
};

const model = {
    details: (id) => {
        try {
            const crieteria = [
                { $match: { _id: ObjectId(id) } },

                { $lookup: { from: 'users', localField: 'created_by', foreignField: '_id', as: 'createdBy_Details' } },

                {
                    $lookup: {
                        from: 'files_storage',
                        let: {
                            image: '$image'
                        },
                        pipeline: [
                            { $addFields: { 'id': { '$toString': '$_id' } } },
                            {
                                $match:
                                {
                                    $expr:
                                    {
                                        $and:
                                            [
                                                { $in: ['$id', '$$image'] }
                                            ]
                                    }
                                }
                            },
                        ],
                        as: 'image_Details'
                    }
                },

                {
                    $lookup: {
                        from: 'video',
                        let: {
                            // image: '$linked_Video'
                            image: { $ifNull: ['$linked_Video', []] }
                        },
                        pipeline: [
                            { $addFields: { 'id': { '$toString': '$_id' } } },
                            {
                                $match:
                                {
                                    $expr:
                                    {
                                        $and:
                                            [
                                                { $in: ['$id', '$$image'] }
                                            ]
                                    }
                                }
                            },
                        ],
                        as: 'linked_Video_Details'
                    }
                },

                {
                    $lookup: {
                        from: 'recommendationChart',
                        let: {
                            // image: '$linked_RecommendationChart',
                            image: { $ifNull: ['$linked_RecommendationChart', []] }
                        },
                        pipeline: [
                            { $addFields: { 'id': { '$toString': '$_id' } } },
                            {
                                $match:
                                {
                                    $expr:
                                    {
                                        $and:
                                            [
                                                { $in: ['$id', '$$image'] },
                                                { $ne: ['$deleted', 1] }
                                            ]
                                    }
                                }
                            },
                        ],
                        as: 'RecommendationChart_Details'
                    }
                },


                { '$unwind': { 'path': '$RecommendationChart_Details', preserveNullAndEmptyArrays: true } },
                {
                    $lookup: {
                        from: 'files_storage',
                        let: {
                            // image: '$RecommendationChart_Details.file'
                            image: { $ifNull: ['$RecommendationChart_Details.file', []] }
                        },
                        pipeline: [
                            { $addFields: { 'id': { '$toString': '$_id' } } },
                            {
                                $match:
                                {
                                    $expr:
                                    {
                                        $and:
                                            [
                                                { $in: ['$id', '$$image'] }
                                            ]
                                    }
                                }
                            },
                        ],
                        as: 'RecommendationChart_Details.file'
                        // as: 'new'
                    }
                },

                {
                    $lookup: {
                        from: 'konspecCode',
                        let: {
                            // image: '$linked_RecommendationChart',
                            image: { $ifNull: ['$linked_KonspecCode', []] }
                        },
                        pipeline: [
                            { $addFields: { 'id': { '$toString': '$_id' } } },
                            {
                                $match:
                                {
                                    $expr:
                                    {
                                        $and:
                                            [
                                                { $in: ['$id', '$$image'] },
                                                { $ne: ['$deleted', 1] }
                                            ]
                                    }
                                }
                            },
                        ],
                        as: 'KonspecCode_Details'
                    }
                },

                {
                    $lookup: {
                        from: 'customer',
                        let: {
                            // image: '$linked_RecommendationChart',
                            image: { $ifNull: ['$linked_Customer', []] }
                        },
                        pipeline: [
                            { $addFields: { 'id': { '$toString': '$_id' } } },
                            {
                                $match:
                                {
                                    $expr:
                                    {
                                        $and:
                                            [
                                                { $in: ['$id', '$$image'] },
                                                { $ne: ['$deleted', 1] }
                                            ]
                                    }
                                }
                            },
                            { $lookup: { from: 'zone', localField: 'customer_zone', foreignField: '_id', as: 'customer_zone' } },
                            { $addFields: { 'customer_zone': { $arrayElemAt: ['$customer_zone.zone', 0] } } },
                        ],
                        as: 'customer_Details'
                    }
                },

                { '$unwind': { 'path': '$linked_IndustryAndSubIndustry', preserveNullAndEmptyArrays: true } },
                {
                    $lookup: {
                        from: 'industry',
                        let: {
                            linked_Industry: '$linked_IndustryAndSubIndustry.industryId'
                            // linked_Industry: { $ifNull: ['$linked_IndustryAndSubIndustry.industryId', null] }
                        },
                        pipeline: [
                            { $addFields: { '_id': { '$toString': '$_id' } } },
                            {
                                $match:
                                {
                                    $expr:
                                    {
                                        $and:
                                            [
                                                { $eq: ['$_id', '$$linked_Industry'] }
                                            ]
                                    }
                                }
                            }
                        ],
                        as: 'linked_Industry_Details'
                    }
                },
                { '$unwind': { 'path': '$linked_Industry_Details', preserveNullAndEmptyArrays: true } },
                {
                    $lookup: {
                        from: 'subIndustry',
                        let: {
                            // linked_SubIndustry: '$linked_IndustryAndSubIndustry.linked_subIndustry'
                            linked_SubIndustry: { $ifNull: ['$linked_IndustryAndSubIndustry.linked_subIndustry', []] }
                        },
                        pipeline: [
                            { $addFields: { '_id': { '$toString': '$_id' } } },
                            {
                                $match:
                                {
                                    $expr:
                                    {
                                        $and:
                                            [
                                                { $in: ['$_id', '$$linked_SubIndustry'] }
                                            ]
                                    }
                                }
                            }
                        ],
                        as: 'linked_Industry_Details.subIndustry'
                    }
                },


                { '$unwind': { 'path': '$linked_ProcessAndSubProcess', preserveNullAndEmptyArrays: true } },
                {
                    $lookup: {
                        from: 'process',
                        let: {
                            linked_Process: '$linked_ProcessAndSubProcess.processId'
                        },
                        pipeline: [
                            { $addFields: { '_id': { '$toString': '$_id' } } },
                            {
                                $match:
                                {
                                    $expr:
                                    {
                                        $and:
                                            [
                                                { $eq: ['$_id', '$$linked_Process'] }
                                            ]
                                    }
                                }
                            }
                        ],
                        as: 'linked_Process_Details'
                    }
                },
                { '$unwind': { 'path': '$linked_Process_Details', preserveNullAndEmptyArrays: true } },
                {
                    $lookup: {
                        from: 'subProcess',
                        let: {
                            // linked_SubProcess: '$linked_ProcessAndSubProcess.linked_subProcess'
                            linked_SubProcess: { $ifNull: ['$linked_ProcessAndSubProcess.linked_subProcess', []] }
                        },
                        pipeline: [
                            { $addFields: { '_id': { '$toString': '$_id' } } },
                            {
                                $match:
                                {

                                    $expr:
                                    {
                                        $and:
                                            [
                                                { $in: ['$_id', '$$linked_SubProcess'] },
                                            ]
                                    }
                                }
                            }
                        ],
                        as: 'linked_Process_Details.subProcess'
                    }
                },

                { '$unwind': { 'path': '$linked_CategoryAndSubCategory', preserveNullAndEmptyArrays: true } },
                {
                    $lookup: {
                        from: 'category',
                        let: {
                            linked_Industry: '$linked_CategoryAndSubCategory.categoryId'
                        },
                        pipeline: [
                            { $addFields: { '_id': { '$toString': '$_id' } } },
                            {
                                $match:
                                {
                                    $expr:
                                    {
                                        $and:
                                            [
                                                { $eq: ['$_id', '$$linked_Industry'] }
                                            ]
                                    }
                                }
                            }
                        ],
                        as: 'linked_Category_Details'
                    }
                },
                { '$unwind': { 'path': '$linked_Category_Details', preserveNullAndEmptyArrays: true } },
                {
                    $lookup: {
                        from: 'subCategory',
                        let: {
                            linked_SubProcess: { $ifNull: ['$linked_CategoryAndSubCategory.linked_subCategory', []] }
                        },
                        pipeline: [
                            { $addFields: { '_id': { '$toString': '$_id' } } },
                            {
                                $match:
                                {
                                    $expr:
                                    {
                                        $and:
                                            [
                                                { $in: ['$_id', '$$linked_SubProcess'] }
                                            ]
                                    }
                                }
                            }
                        ],
                        as: 'linked_Category_Details.subCategory'
                    }
                },

                {
                    $group: {
                        _id: '$_id',
                        name: { $first: '$name' },
                        description: { $first: '$description' },
                        image: { $addToSet: '$image_Details' },
                        testimonials: { $addToSet: '$testimonials' },
                        linked_IndustryAndSubIndustry: { $addToSet: '$linked_Industry_Details' },
                        linked_ProcessAndSubProcess: { $addToSet: '$linked_Process_Details' },
                        linked_CategoryAndSubCategory: { $addToSet: '$linked_Category_Details' },
                        linked_RecommendationChart: { $addToSet: '$RecommendationChart_Details' },
                        linked_KonspecCode: { $addToSet: '$KonspecCode_Details' },
                        linked_Customer: { $addToSet: '$customer_Details' },
                        linked_Video: { $addToSet: '$linked_Video_Details' },
                        created_by: { $first: { $arrayElemAt: ['$createdBy_Details.first_name', 0] } },
                        created_at: { $first: '$created_at' },
                    }
                },

                {
                    $project: {
                        new: 1,
                        'name': 1,
                        'description': 1,
                        'testimonials': 1,
                        'created_by': 1,
                        'created_at': 1,
                        'image._id': 1,
                        'image.file_name': 1,
                        'image.file_upload_date': 1,
                        'image.uploaded_by': 1,

                        'linked_IndustryAndSubIndustry._id': 1,
                        'linked_IndustryAndSubIndustry.name': 1,
                        'linked_IndustryAndSubIndustry.subIndustry._id': 1,
                        'linked_IndustryAndSubIndustry.subIndustry.name': 1,

                        'linked_ProcessAndSubProcess._id': 1,
                        'linked_ProcessAndSubProcess.name': 1,
                        'linked_ProcessAndSubProcess.subProcess._id': 1,
                        'linked_ProcessAndSubProcess.subProcess.name': 1,

                        'linked_CategoryAndSubCategory._id': 1,
                        'linked_CategoryAndSubCategory.name': 1,
                        'linked_CategoryAndSubCategory.subCategory._id': 1,
                        'linked_CategoryAndSubCategory.subCategory.name': 1,

                        'linked_RecommendationChart._id': 1,
                        'linked_RecommendationChart.name': 1,
                        'linked_RecommendationChart.description': 1,
                        // 'linked_RecommendationChart.file': 1,
                        'linked_RecommendationChart.file': {
                            _id: 1,
                            file_name: 1,
                            file_upload_date: 1,
                            uploaded_by: 1,
                        },

                        'linked_KonspecCode._id': 1,
                        'linked_KonspecCode.konspecCode': 1,

                        'linked_Customer._id': 1,
                        'linked_Customer.customer_name': 1,
                        'linked_Customer.customer_phone': 1,
                        'linked_Customer.customer_city': 1,
                        'linked_Customer.crm_division': 1,
                        'linked_Customer.customer_zone': 1,

                        'linked_Video._id': 1,
                        'linked_Video.name': 1,
                        'linked_Video.video': 1,

                    }
                }
            ];
            return DataAccess.aggregate(collection_name, crieteria).then((data) => {
                return data[0];
            });
        } catch (error) {
            throw new Error(error);
        }
    },


    listAll: (query) => {
        try {
            if (!query) {
                query = { deleted: { $ne: 1 } };
            } else {
                query['deleted'] = { $ne: 1 };
            }

            const crieteria = [
                { $match: query },
                { $sort: { _id: -1 } },

                { $lookup: { from: 'users', localField: 'created_by', foreignField: '_id', as: 'createdBy_Details' } },

                {
                    $lookup: {
                        from: 'files_storage',
                        let: {
                            image: '$image'
                        },
                        pipeline: [
                            { $addFields: { 'id': { '$toString': '$_id' } } },
                            {
                                $match:
                                {
                                    $expr:
                                    {
                                        $and:
                                            [
                                                { $in: ['$id', '$$image'] },
                                            ]
                                    }
                                }
                            },
                        ],
                        as: 'image_Details'
                    }
                },

                {
                    $lookup: {
                        from: 'video',
                        let: {
                            // image: '$linked_Video'
                            image: { $ifNull: ['$linked_Video', []] }
                        },
                        pipeline: [
                            { $addFields: { 'id': { '$toString': '$_id' } } },
                            {
                                $match:
                                {
                                    $expr:
                                    {
                                        $and:
                                            [
                                                { $in: ['$id', '$$image'] }
                                            ]
                                    }
                                }
                            },
                        ],
                        as: 'linked_Video_Details'
                    }
                },


                {
                    $lookup: {
                        from: 'recommendationChart',
                        let: {
                            // image: '$linked_RecommendationChart',
                            image: { $ifNull: ['$linked_RecommendationChart', []] }
                        },
                        pipeline: [
                            { $addFields: { 'id': { '$toString': '$_id' } } },
                            {
                                $match:
                                {
                                    $expr:
                                    {
                                        $and:
                                            [
                                                { $in: ['$id', '$$image'] },
                                                { $ne: ['$deleted', 1] }
                                            ]
                                    }
                                }
                            },
                        ],
                        as: 'RecommendationChart_Details'
                    }
                },


                { '$unwind': { 'path': '$RecommendationChart_Details', preserveNullAndEmptyArrays: true } },
                {
                    $lookup: {
                        from: 'files_storage',
                        let: {
                            // image: '$RecommendationChart_Details.file'
                            image: { $ifNull: ['$RecommendationChart_Details.file', []] }
                        },
                        pipeline: [
                            { $addFields: { 'id': { '$toString': '$_id' } } },
                            {
                                $match:
                                {
                                    $expr:
                                    {
                                        $and:
                                            [
                                                { $in: ['$id', '$$image'] }
                                            ]
                                    }
                                }
                            },
                        ],
                        as: 'RecommendationChart_Details.file'
                    }
                },

                {
                    $lookup: {
                        from: 'konspecCode',
                        let: {
                            // image: '$linked_RecommendationChart',
                            image: { $ifNull: ['$linked_KonspecCode', []] }
                        },
                        pipeline: [
                            { $addFields: { 'id': { '$toString': '$_id' } } },
                            {
                                $match:
                                {
                                    $expr:
                                    {
                                        $and:
                                            [
                                                { $in: ['$id', '$$image'] },
                                                { $ne: ['$deleted', 1] }
                                            ]
                                    }
                                }
                            },
                        ],
                        as: 'KonspecCode_Details'
                    }
                },

                {
                    $lookup: {
                        from: 'customer',
                        let: {
                            // image: '$linked_RecommendationChart',
                            image: { $ifNull: ['$linked_Customer', []] }
                        },
                        pipeline: [
                            { $addFields: { 'id': { '$toString': '$_id' } } },
                            {
                                $match:
                                {
                                    $expr:
                                    {
                                        $and:
                                            [
                                                { $in: ['$id', '$$image'] },
                                                { $ne: ['$deleted', 1] }
                                            ]
                                    }
                                }
                            },
                        ],
                        as: 'customer_Details'
                    }
                },

                { '$unwind': { 'path': '$linked_IndustryAndSubIndustry', preserveNullAndEmptyArrays: true } },
                {
                    $lookup: {
                        from: 'industry',
                        let: {
                            linked_Industry: '$linked_IndustryAndSubIndustry.industryId'
                            // linked_Industry: { $ifNull: ['$linked_IndustryAndSubIndustry.industryId', null] }
                        },
                        pipeline: [
                            { $addFields: { '_id': { '$toString': '$_id' } } },
                            {
                                $match:
                                {
                                    $expr:
                                    {
                                        $and:
                                            [
                                                { $eq: ['$_id', '$$linked_Industry'] }
                                            ]
                                    }
                                }
                            }
                        ],
                        as: 'linked_Industry_Details'
                    }
                },
                { '$unwind': { 'path': '$linked_Industry_Details', preserveNullAndEmptyArrays: true } },
                {
                    $lookup: {
                        from: 'subIndustry',
                        let: {
                            // linked_SubIndustry: '$linked_IndustryAndSubIndustry.linked_subIndustry'
                            linked_SubIndustry: { $ifNull: ['$linked_IndustryAndSubIndustry.linked_subIndustry', []] }
                        },
                        pipeline: [
                            { $addFields: { '_id': { '$toString': '$_id' } } },
                            {
                                $match:
                                {
                                    $expr:
                                    {
                                        $and:
                                            [
                                                { $in: ['$_id', '$$linked_SubIndustry'] }
                                            ]
                                    }
                                }
                            }
                        ],
                        as: 'linked_Industry_Details.subIndustry'
                    }
                },


                { '$unwind': { 'path': '$linked_ProcessAndSubProcess', preserveNullAndEmptyArrays: true } },
                {
                    $lookup: {
                        from: 'process',
                        let: {
                            linked_Process: '$linked_ProcessAndSubProcess.processId'
                        },
                        pipeline: [
                            { $addFields: { '_id': { '$toString': '$_id' } } },
                            {
                                $match:
                                {
                                    $expr:
                                    {
                                        $and:
                                            [
                                                { $eq: ['$_id', '$$linked_Process'] }
                                            ]
                                    }
                                }
                            }
                        ],
                        as: 'linked_Process_Details'
                    }
                },
                { '$unwind': { 'path': '$linked_Process_Details', preserveNullAndEmptyArrays: true } },
                {
                    $lookup: {
                        from: 'subProcess',
                        let: {
                            // linked_SubProcess: '$linked_ProcessAndSubProcess.linked_subProcess'
                            linked_SubProcess: { $ifNull: ['$linked_ProcessAndSubProcess.linked_subProcess', []] }
                        },
                        pipeline: [
                            { $addFields: { '_id': { '$toString': '$_id' } } },
                            {
                                $match:
                                {

                                    $expr:
                                    {
                                        $and:
                                            [
                                                { $in: ['$_id', '$$linked_SubProcess'] },
                                            ]
                                    }
                                }
                            }
                        ],
                        as: 'linked_Process_Details.subProcess'
                    }
                },

                { '$unwind': { 'path': '$linked_CategoryAndSubCategory', preserveNullAndEmptyArrays: true } },
                {
                    $lookup: {
                        from: 'category',
                        let: {
                            linked_Industry: '$linked_CategoryAndSubCategory.categoryId'
                        },
                        pipeline: [
                            { $addFields: { '_id': { '$toString': '$_id' } } },
                            {
                                $match:
                                {
                                    $expr:
                                    {
                                        $and:
                                            [
                                                { $eq: ['$_id', '$$linked_Industry'] }
                                            ]
                                    }
                                }
                            }
                        ],
                        as: 'linked_Category_Details'
                    }
                },
                { '$unwind': { 'path': '$linked_Category_Details', preserveNullAndEmptyArrays: true } },
                {
                    $lookup: {
                        from: 'subCategory',
                        let: {
                            linked_SubProcess: { $ifNull: ['$linked_CategoryAndSubCategory.linked_subCategory', []] }
                        },
                        pipeline: [
                            { $addFields: { '_id': { '$toString': '$_id' } } },
                            {
                                $match:
                                {
                                    $expr:
                                    {
                                        $and:
                                            [
                                                { $in: ['$_id', '$$linked_SubProcess'] }
                                            ]
                                    }
                                }
                            }
                        ],
                        as: 'linked_Category_Details.subCategory'
                    }
                },

                {
                    $group: {
                        _id: '$_id',
                        name: { $first: '$name' },
                        description: { $first: '$description' },
                        image: { $addToSet: '$image_Details' },
                        testimonials: { $addToSet: '$testimonials' },
                        linked_IndustryAndSubIndustry: { $addToSet: '$linked_Industry_Details' },
                        linked_ProcessAndSubProcess: { $addToSet: '$linked_Process_Details' },
                        linked_CategoryAndSubCategory: { $addToSet: '$linked_Category_Details' },
                        linked_RecommendationChart: { $addToSet: '$RecommendationChart_Details' },
                        linked_KonspecCode: { $addToSet: '$KonspecCode_Details' },
                        linked_Customer: { $addToSet: '$customer_Details' },
                        // linked_Video: { $addToSet: '$linked_Video_Details' },
                        linked_Video: { $addToSet: '$linked_Video_Details' },
                        created_by: { $first: { $arrayElemAt: ['$createdBy_Details.first_name', 0] } },
                        created_at: { $first: '$created_at' },
                        deleted: { $first: '$deleted' },
                    }
                },

                {
                    $project: {
                        'name': 1,
                        'description': 1,
                        'testimonials': 1,
                        'created_by': 1,
                        'created_at': 1,
                        'deleted': 1,
                        'image._id': 1,
                        'image.file_name': 1,
                        'image.file_upload_date': 1,
                        'image.uploaded_by': 1,

                        'linked_IndustryAndSubIndustry._id': 1,
                        'linked_IndustryAndSubIndustry.name': 1,
                        'linked_IndustryAndSubIndustry.subIndustry._id': 1,
                        'linked_IndustryAndSubIndustry.subIndustry.name': 1,

                        'linked_ProcessAndSubProcess._id': 1,
                        'linked_ProcessAndSubProcess.name': 1,
                        'linked_ProcessAndSubProcess.subProcess._id': 1,
                        'linked_ProcessAndSubProcess.subProcess.name': 1,

                        'linked_CategoryAndSubCategory._id': 1,
                        'linked_CategoryAndSubCategory.name': 1,
                        'linked_CategoryAndSubCategory.subCategory._id': 1,
                        'linked_CategoryAndSubCategory.subCategory.name': 1,

                        'linked_RecommendationChart._id': 1,
                        'linked_RecommendationChart.name': 1,
                        'linked_RecommendationChart.description': 1,
                        'linked_RecommendationChart.file': {
                            _id: 1,
                            file_name: 1,
                            file_upload_date: 1,
                            uploaded_by: 1,
                        },

                        'linked_KonspecCode._id': 1,
                        'linked_KonspecCode.konspecCode': 1,

                        'linked_Customer._id': 1,
                        'linked_Customer.customer_name': 1,

                        'linked_Video._id': 1,
                        'linked_Video.name': 1,
                        'linked_Video.video': 1,

                    }
                }
            ];

            return DataAccess.aggregate(collection_name, crieteria);
        } catch (error) {
            throw new Error(error);
        }
    },

    create: async (reqBody, loggedUser) => {
        try {
            if (reqBody.image && reqBody.image.length > 0) {
                let arr = [];
                reqBody.image.forEach((ele) => {
                    if (!isEmpty(ele)) {
                        arr.push(ele._id);
                    }

                });
                reqBody.image = arr;
            }
            reqBody.created_at = new Date();
            reqBody.created_by = loggedUser._id;
            reqBody.modified_At = new Date();
            acl.allowUser(collection_name, loggedUser, reqBody);
            const newData = await DataAccess.InsertOne(collection_name, reqBody);
            saveActivity({
                module: 'endProduct',
                action: 'create',
                documentId: ObjectId(first(newData)._id),
                userId: ObjectId(loggedUser._id),
                data: newData,
                message: 'created a End Product'
            });
            PubSub.publishSync('DBUpdates', { change: 'endProduct', data: newData[0] });
            if (reqBody.offlineSyncId) {
                const deleteDupData = {
                    delete: true,
                    deleted: 1,
                    _id: reqBody.offlineSyncId
                };
                PubSub.publishSync('DBDelete', { change: 'endProduct', data: deleteDupData });
            }
            return newData;
        } catch (error) {
            throw new Error(error)
        }
    },

    update: async (id, reqBody, loggedUser) => {
        try {
            delete reqBody._id;
            delete reqBody.id;
            delete reqBody.created_at;
            delete reqBody.created_by;
            reqBody.modified_At = new Date();

            if (reqBody.image && reqBody.image.length > 0) {
                let arr = [];
                reqBody.image.forEach((ele) => {
                    arr.push(ele._id);
                });
                reqBody.image = arr;
            }
            const crieteria = { _id: ObjectId(id) };
            const doc = { $set: reqBody };
            const result = await DataAccess.UpdateOne(collection_name, crieteria, doc);
            DataAccess.findOne(collection_name, { _id: ObjectId(id) }).then((data) => {
                console.log('sync endproducvt');

                PubSub.publishSync('DBUpdates', { change: 'endProduct', data: data });
            })
            saveActivity({
                module: 'endProduct',
                action: 'update',
                documentId: ObjectId(id),
                userId: ObjectId(loggedUser._id),
                data: reqBody,
                message: 'updated a End Product'
            });
            return result.matchedCount > 0 ? 1 : 0;
        } catch (error) {
            throw new Error(error);
        }
    },

    linkIndustryAndSubIndustry: async (id, reqBody, loggedUser) => {
        try {
            let query = { _id: ObjectId(id), 'linked_IndustryAndSubIndustry': { $elemMatch: { industryId: reqBody.industryId } } };
            const oldData = await DataAccess.findOne(collection_name, query);
            let crieteria, doc;
            let queryObj = setLinkingQuery_IndustryAndSub(crieteria, doc, oldData, id, reqBody);
            const result = await DataAccess.UpdateOne(collection_name, queryObj.crieteria, queryObj.doc);
            if (result.modifiedCount > 0) {
                saveActivity({
                    module: 'endProduct',
                    action: auditLinkAction,
                    documentId: ObjectId(id),
                    userId: ObjectId(loggedUser._id),
                    data: reqBody,
                    message: 'Linked a Industry and Sub Industry'
                });
            }
            return result.matchedCount > 0 ? 1 : 0;
        } catch (error) {
            throw new Error(error);
        }
    },

    linkProcessAndSubProcess: async (id, reqBody, loggedUser) => {
        try {
            let query = { _id: ObjectId(id), 'linked_ProcessAndSubProcess': { $elemMatch: { processId: reqBody.processId } } };
            const oldData = await DataAccess.findOne(collection_name, query);
            let crieteria, doc;
            let queryObj = setLinkingQuery_ProcessAndSub(crieteria, doc, oldData, id, reqBody);
            const result = await DataAccess.UpdateOne(collection_name, queryObj.crieteria, queryObj.doc);
            saveActivity({
                module: 'endProduct',
                action: auditLinkAction,
                documentId: ObjectId(id),
                userId: ObjectId(loggedUser._id),
                data: reqBody,
                message: 'Linked a Process and Sub Process'
            });
            return result.matchedCount > 0 ? 1 : 0;
        } catch (error) {
            throw new Error(error);
        }
    },

    linkCategoryAndSubCategory: async (id, reqBody, loggedUser) => {
        try {
            let query = { _id: ObjectId(id), 'linked_CategoryAndSubCategory': { $elemMatch: { categoryId: reqBody.categoryId } } };
            const oldData = await DataAccess.findOne(collection_name, query);
            let crieteria, doc;
            let queryObj = setLinkingQuery_CategoryAndSub(crieteria, doc, oldData, id, reqBody);
            const result = await DataAccess.UpdateOne(collection_name, queryObj.crieteria, queryObj.doc);
            saveActivity({
                module: 'endProduct',
                action: auditLinkAction,
                documentId: ObjectId(id),
                userId: ObjectId(loggedUser._id),
                data: reqBody,
                message: 'Linked a Process and Sub Process'
            });
            return result.matchedCount > 0 ? 1 : 0;
        } catch (error) {
            throw new Error(error);
        }
    },

    linkRecommendationChart: async (id, reqBody, loggedUser) => {
        try {
            const crieteria = { _id: ObjectId(id) };
            const doc = {
                $addToSet: {
                    linked_RecommendationChart: { $each: reqBody.linked_RecommendationChart },
                },
                $set: {
                    modified_At: new Date()
                }
            };
            const result = await DataAccess.UpdateOne(collection_name, crieteria, doc);
            saveActivity({
                module: 'endProduct',
                action: auditLinkAction,
                documentId: ObjectId(id),
                userId: ObjectId(loggedUser._id),
                data: reqBody,
                message: 'Linked a Recommendation Chart'
            });
            return result.matchedCount > 0 ? 1 : 0;
        } catch (error) {
            throw new Error(error);
        }
    },

    linkKonspecCode: async (id, reqBody, loggedUser) => {
        try {
            const crieteria = { _id: ObjectId(id) };
            const doc = {
                $addToSet: {
                    linked_KonspecCode: { $each: reqBody.linked_KonspecCode },
                },
                $set: {
                    modified_At: new Date()
                }
            };
            const result = await DataAccess.UpdateOne(collection_name, crieteria, doc);
            saveActivity({
                module: 'endProduct',
                action: auditLinkAction,
                documentId: ObjectId(id),
                userId: ObjectId(loggedUser._id),
                data: reqBody,
                message: 'Linked a Konspec Code'
            });
            return result.matchedCount > 0 ? 1 : 0;
        } catch (error) {
            throw new Error(error);
        }
    },

    linkVideo: async (id, reqBody, loggedUser) => {
        try {
            const crieteria = { _id: ObjectId(id) };
            const doc = {
                $addToSet: {
                    linked_Video: { $each: reqBody.linked_Video },
                },
                $set: {
                    modified_At: new Date()
                }
            };
            const result = await DataAccess.UpdateOne(collection_name, crieteria, doc);
            saveActivity({
                module: 'endProduct',
                action: auditLinkAction,
                documentId: ObjectId(id),
                userId: ObjectId(loggedUser._id),
                data: reqBody,
                message: 'Linked a Video'
            });
            return result.matchedCount > 0 ? 1 : 0;
        } catch (error) {
            throw new Error(error);
        }
    },

    linkCustomer: async (id, reqBody, loggedUser) => {
        try {
            const crieteria = { _id: ObjectId(id) };
            const doc = {
                $addToSet: {
                    linked_Customer: { $each: reqBody.linked_Customer },
                },
                $set: {
                    modified_At: new Date()
                }
            };
            const result = await DataAccess.UpdateOne(collection_name, crieteria, doc);
            saveActivity({
                module: 'endProduct',
                action: auditLinkAction,
                documentId: ObjectId(id),
                userId: ObjectId(loggedUser._id),
                data: reqBody,
                message: 'Linked a Customer'
            });
            return result.matchedCount > 0 ? 1 : 0;
        } catch (error) {
            throw new Error(error);
        }
    },

    unLinkIndustryAndSubIndustry: async (id, industryId, loggedUser) => {
        try {
            const crieteria = { _id: ObjectId(id) };
            const doc = {
                $pull: {
                    linked_IndustryAndSubIndustry: { industryId: industryId },
                },
                $set: {
                    modified_At: new Date()
                }
            };
            const result = await DataAccess.UpdateOne(collection_name, crieteria, doc);
            saveActivity({
                module: 'endProduct',
                action: auditUnLinkAction,
                documentId: ObjectId(id),
                userId: ObjectId(loggedUser._id),
                data: [{ endproductId: id, industryId: industryId }],
                message: 'UnLinked a Industry and SubIndustry'
            });
            return result.matchedCount > 0 ? 1 : 0;
        } catch (error) {
            throw new Error(error);
        }
    },

    unLinkProcessAndSubProcess: async (id, processId, loggedUser) => {
        try {
            const crieteria = { _id: ObjectId(id) };
            const doc = {
                $pull: {
                    linked_ProcessAndSubProcess: { processId: processId },
                },
                $set: {
                    modified_At: new Date()
                }
            };
            const result = await DataAccess.UpdateOne(collection_name, crieteria, doc);
            saveActivity({
                module: 'endProduct',
                action: auditUnLinkAction,
                documentId: ObjectId(id),
                userId: ObjectId(loggedUser._id),
                data: [{ endproductId: id, processId: processId }],
                message: 'UnLinked a Process and SubProcess'
            });
            return result.matchedCount > 0 ? 1 : 0;
        } catch (error) {
            throw new Error(error);
        }
    },

    unLinkCategoryAndSubCategory: async (id, categoryId, loggedUser) => {
        try {
            const crieteria = { _id: ObjectId(id) };
            const doc = {
                $pull: {
                    linked_CategoryAndSubCategory: { categoryId: categoryId },
                },
                $set: {
                    modified_At: new Date()
                }
            };
            const result = await DataAccess.UpdateOne(collection_name, crieteria, doc);
            saveActivity({
                module: 'endProduct',
                action: auditUnLinkAction,
                documentId: ObjectId(id),
                userId: ObjectId(loggedUser._id),
                data: [{ endproductId: id, categoryId: categoryId }],
                message: 'UnLinked a Category and SubCategory'
            });
            return result.matchedCount > 0 ? 1 : 0;
        } catch (error) {
            throw new Error(error);
        }
    },

    unLinkRecommendationChart: async (id, RecommendationChartId, loggedUser) => {
        try {
            const crieteria = { _id: ObjectId(id) };
            const doc = {
                $pull: {
                    linked_RecommendationChart: RecommendationChartId,
                },
                $set: {
                    modified_At: new Date()
                }
            };
            const result = await DataAccess.UpdateOne(collection_name, crieteria, doc);
            saveActivity({
                module: 'endProduct',
                action: auditUnLinkAction,
                documentId: ObjectId(id),
                userId: ObjectId(loggedUser._id),
                data: [{ endproductId: id, RecommendationChartId: RecommendationChartId }],
                message: 'UnLinked a Recommendation Chart'
            });
            return result.matchedCount > 0 ? 1 : 0;
        } catch (error) {
            throw new Error(error);
        }
    },

    unLinkKonspecCode: async (id, konspecCodeId, loggedUser) => {
        try {
            const crieteria = { _id: ObjectId(id) };
            const doc = {
                $pull: {
                    linked_KonspecCode: konspecCodeId,
                },
                $set: {
                    modified_At: new Date()
                }
            };
            const result = await DataAccess.UpdateOne(collection_name, crieteria, doc);
            saveActivity({
                module: 'endProduct',
                action: auditUnLinkAction,
                documentId: ObjectId(id),
                userId: ObjectId(loggedUser._id),
                data: [{ endproductId: id, konspecCodeId: konspecCodeId }],
                message: 'UnLinked a Konspec Code'
            });
            return result.matchedCount > 0 ? 1 : 0;
        } catch (error) {
            throw new Error(error);
        }
    },

    unLinkVideo: async (id, videoId, loggedUser) => {
        try {
            const crieteria = { _id: ObjectId(id) };
            const doc = {
                $pull: {
                    linked_Video: videoId,
                },
                $set: {
                    modified_At: new Date()
                }
            };
            const result = await DataAccess.UpdateOne(collection_name, crieteria, doc);
            saveActivity({
                module: 'endProduct',
                action: auditUnLinkAction,
                documentId: ObjectId(id),
                userId: ObjectId(loggedUser._id),
                data: [{ endproductId: id, videoId: videoId }],
                message: 'UnLinked a Video'
            });
            return result.matchedCount > 0 ? 1 : 0;
        } catch (error) {
            throw new Error(error);
        }
    },

    unLinkCustomer: async (id, customerId, loggedUser) => {
        try {
            const crieteria = { _id: ObjectId(id) };
            const doc = {
                $pull: {
                    linked_Customer: customerId,
                },
                $set: {
                    modified_At: new Date()
                }
            };
            const result = await DataAccess.UpdateOne(collection_name, crieteria, doc);
            saveActivity({
                module: 'endProduct',
                action: auditUnLinkAction,
                documentId: ObjectId(id),
                userId: ObjectId(loggedUser._id),
                data: [{ endproductId: id, customerId: customerId }],
                message: 'UnLinked a Customer'
            });
            return result.matchedCount > 0 ? 1 : 0;
        } catch (error) {
            throw new Error(error);
        }
    },

    viewTestimonials: async (endProductId, testimonialId, loggedUser) => {
        try {
            const crieteria = ([
                { $match: { testimonials: { $elemMatch: { _id: ObjectId(testimonialId) } } } },
                {
                    $project: {
                        'testimonials': {
                            $filter: {
                                input: '$testimonials',
                                as: 'item',
                                cond: { $eq: ['$$item._id', ObjectId(testimonialId)] }
                            }
                        },
                        _id: 0
                    }
                },
                { $addFields: { 'testimonials': { $arrayElemAt: ['$testimonials', 0] } } }
            ]);
            const Data = await DataAccess.aggregate(collection_name, crieteria);
            return Data[0].testimonials;
        } catch (error) {
            throw new Error(error);
        }
    },

    addTestimonials: async (id, reqBody, loggedUser) => {
        try {
            reqBody._id = new ObjectId();
            reqBody.created_at = new Date();
            reqBody.created_by = loggedUser._id;

            const crieteria = { _id: ObjectId(id) };
            const doc = {
                $addToSet: {
                    testimonials: reqBody,
                },
                $set: {
                    modified_At: new Date()
                }
            };
            const newData = await DataAccess.UpdateOne(collection_name, crieteria, doc);
            saveActivity({
                module: 'endProduct',
                action: 'create',
                documentId: ObjectId(id),
                userId: ObjectId(loggedUser._id),
                data: { id: id },
                message: 'added Testimonials'
            });
            return newData;
        } catch (error) {
            throw new Error(error);
        }
    },

    updateTestimonials: async (endProductId, testimonialId, reqBody, loggedUser) => {
        try {
            const crieteria = {
                _id: ObjectId(endProductId),
                testimonials: { $elemMatch: { _id: ObjectId(testimonialId) } }
            };
            const doc = {
                $set: {
                    'testimonials.$.description': reqBody.description,
                    'testimonials.$.name': reqBody.name,
                }
            };
            const Data = await DataAccess.UpdateOne(collection_name, crieteria, doc);
            if (Data.result.nModified > 0) {
                saveActivity({
                    module: 'endProduct',
                    action: 'update',
                    documentId: ObjectId(endProductId),
                    userId: ObjectId(loggedUser._id),
                    data: reqBody,
                    message: 'updated Testimonials'
                });
            }
            return Data.result;
        } catch (error) {
            throw new Error(error);
        }
    },

    deleteTestimonials: async (endProductId, testimonialId, loggedUser) => {
        try {
            const crieteria = {
                _id: ObjectId(endProductId),
            };
            const doc = {
                $pull: {
                    testimonials: { _id: ObjectId(testimonialId) }
                }
            };
            const Data = await DataAccess.UpdateOne(collection_name, crieteria, doc);
            if (Data.result.nModified > 0) {
                saveActivity({
                    module: 'endProduct',
                    action: 'update',
                    documentId: ObjectId(endProductId),
                    userId: ObjectId(loggedUser._id),
                    data: testimonialId,
                    message: 'deleted Testimonial'
                });
            }
            return Data.result;
        } catch (error) {
            throw new Error(error);
        }
    },

    delete: async (id, loggedUser) => {
        try {
            const crieteria = { _id: ObjectId(id) };
            const result = await DataAccess.DeleteOne(collection_name, crieteria);
            saveActivity({
                module: 'endProduct',
                action: 'update',
                documentId: ObjectId(id),
                userId: ObjectId(loggedUser._id),
                data: { id: id },
                message: 'deleted a End Product'
            });
            return result.matchedCount > 0 ? 1 : 0;
        } catch (error) {
            throw new Error(error);
        }
    },
};

module.exports = model;
