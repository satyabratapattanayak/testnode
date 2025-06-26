// @ts-check
const ObjectId = require('mongodb').ObjectID;
const { isEmpty } = require('lodash');


const DataAccess = require('../../helpers/DataAccess');
const Audit = require('../audit/audit.model');
const DealModel = require('../deals/deals.model');
const acl = require('../../service/acl');
const { auditActions, Modules, getNextSequenceNumber, cmrStatus } = require('../shared/shared.model');

let mydb;
const database = require('../../service/database');
database.getDb().then(res => { mydb = res; ensureIndex(); });
const collection_name = 'customer_cmr_details';

const ensureIndex = () => {
    let cmrCollection = collection(collection_name);
    cmrCollection.ensureIndex("CMR_CRM_No", (err, name) => {
        console.log("ensureIndex CMR_CRM_No ", err, name);
    });
    cmrCollection.ensureIndex("customer_name", (err, name) => {
        console.log("ensureIndex customer_name ", err, name);
    });
    cmrCollection.ensureIndex("modified_At", (err, name) => {
        console.log("ensureIndex modified_At ", err, name);
    });
}

let saveCMRActivity = (body) => {
    body.module = Modules().customer;
    body.subModule = Modules().cmr;
    body.date = new Date();
    Audit.addLog(body);
};

const addLog = (action, id, userId, doc, msg) => {
    saveCMRActivity({
        action: action,
        documentId: ObjectId(id),
        userId: ObjectId(userId),
        data: doc,
        message: msg
    });
};

const collection = (collectionName) => { return mydb.collection(collectionName); };


const convertStringToDate = (body) => {
    if (body.Requested_Date) { body.Requested_Date = new Date(body.Requested_Date); }
    if (body.Approved_Date) { body.Approved_Date = new Date(body.Approved_Date); }
    if (body.Customer_Sample_sent_Date) { body.Customer_Sample_sent_Date = new Date(body.Customer_Sample_sent_Date); }
    if (body.CMR_receipt_Date) { body.CMR_receipt_Date = new Date(body.CMR_receipt_Date); }
    if (body.Estimated_completion_Date_of_Development) { body.Estimated_completion_Date_of_Development = new Date(body.Estimated_completion_Date_of_Development); }
    if (body.Customer_Sample_Receipt_Date) { body.Customer_Sample_Receipt_Date = new Date(body.Customer_Sample_Receipt_Date); }
};

const createNewDeal = async (user, doc) => {
    const request = {
        deal_no: doc.CRM_CMR_No,
        deal_name: doc.CRM_CMR_No,
        customer_id: doc.customer_id
    }
    const data = await DealModel.create(user, request);
    return data[0];
};


const model = {
    create: async (body, loggedUser) => {
        convertStringToDate(body)
        let nextSeqNo = await getNextSequenceNumber('cmr')
        let ActualCMRNo = String(nextSeqNo).padStart(4, '0')
        body.CRM_CMR_No = `CMR-${ActualCMRNo}`
        body.created_at = new Date();
        body.created_by = ObjectId(loggedUser._id);
        delete body._id;
        body.modified_At = new Date();
        if (body.operation && body.operation == "copy" && body.opportunityStage && body.opportunityStage == "s3") {
            body.bd_activity = [
                {
                    opportunityStage: body.opportunityStage,
                    moved_from: body.opportunityStage,
                    moved_to: body.opportunityStage,
                    moved_date: new Date(),
                }
            ];
            delete body.operation;
        }
        const found = await DataAccess.findOne(collection_name, { CRM_CMR_No: body.CRM_CMR_No })
        if (found) {
            return 0
        } else {
            // const newDeal = await createNewDeal(loggedUser, body)
            // body.deal_id = newDeal._id;
            const data = await DataAccess.InsertOne(collection_name, body)
            addLog(auditActions().create, body.customer_id, loggedUser._id, data[0], `Created a new ${body.CRM_CMR_No}`);
            return data;
        }
    },
    update: async (id, body, loggedUser) => {
        try {
            const oldData = await DataAccess.findOne(collection_name, { _id: ObjectId(id) });
            if (!oldData.bd_activity) {
                oldData.bd_activity = [];
            }
            var body = body;
            {
                if (body.opportunityStage && !oldData.opportunityStage) {
                    oldData.bd_activity.push(
                        {
                            opportunityStage: 's3',
                            moved_from: body.opportunityStage,
                            moved_to: body.opportunityStage,
                            moved_date: new Date(),
                        }
                    );
                } else if (body.opportunityStage > oldData.opportunityStage) {
                    oldData.bd_activity.push(
                        {
                            opportunityStage: body.opportunityStage,
                            moved_from: oldData.opportunityStage,
                            moved_to: body.opportunityStage,
                            moved_date: new Date(),
                        }
                    );
                } else if (body.opportunityStage && (!oldData.bd_activity || oldData.bd_activity.length == 0)) {
                    oldData.bd_activity = [];
                    oldData.bd_activity.push(
                        {
                            opportunityStage: 's3',
                            moved_from: "s3",
                            moved_to: body.opportunityStage,
                            moved_date: new Date(),
                        }
                    );
                }
                body.bd_activity = oldData.bd_activity;

                if (body.opportunityStage && !oldData.opportunityStage) {
                    saveCMRActivity({
                        module: Modules().cmr,
                        action: auditActions().bd_update,
                        documentId: ObjectId(id),
                        userId: ObjectId(loggedUser._id),
                        data: {
                            moved_from: 's3',
                            moved_to: body.opportunityStage,
                            moved_date: new Date(),
                            bd_flow_id: body.bd_flow_id || oldData.bd_flow_id
                        },
                        message: 'moved the opportunity to ' + body.opportunityStage
                    });
                } else if (body.opportunityStage > oldData.opportunityStage) {
                    saveCMRActivity({
                        module: Modules().cmr,
                        action: auditActions().bd_update,
                        documentId: ObjectId(id),
                        userId: ObjectId(loggedUser._id),
                        data: {
                            moved_from: oldData.opportunityStage,
                            moved_to: body.opportunityStage,
                            moved_date: new Date(),
                            bd_flow_id: body.bd_flow_id || oldData.bd_flow_id
                        },
                        message: 'moved the opportunity to ' + body.opportunityStage
                    });
                }
                if (body.bd_flow_id > oldData.bd_flow_id) {
                    let customer = await DataAccess.findOne(Modules().customer, { _id: new ObjectId(oldData.customer_id) });
                    let data = {
                        from_flow_id: oldData.bd_flow_id,
                        to_flow_id: body.bd_flow_id,
                        moved_date: new Date(),
                        bd_flow_message: body.bd_flow_message,
                        customer_region: customer.customer_region,
                        customer_area: customer.customer_area,
                        customer_zone: customer.customer_zone,
                        responsibility_matrix:customer.responsibility_matrix,
                        customer_assigned_to:customer.customer_assigned_to,
                    }
                    saveCMRActivity({
                        module: Modules().cmr,
                        action: auditActions().bd_flow_id_update,
                        documentId: ObjectId(id),
                        userId: ObjectId(loggedUser._id),
                        data: data,
                        message: 'Opportunity ' + body.bd_flow_message
                    });
                }
            }
            console.log("\n\n\nbody.bd_activity", body.bd_activity)
            if (!oldData.bd_activity) {
                body.created_at = new Date();
            }
            body.modified_At = new Date();
            const prevData = await DataAccess.findOne(collection_name, { _id: ObjectId(id) });
            const resp = await DataAccess.UpdateOne(collection_name, { _id: ObjectId(id) }, { $set: body });
            checkCMRStatusChanged(prevData, body, id, loggedUser);
            return resp.modifiedCount > 0 ? 1 : 0;
        } catch (error) {
            throw new Error(error);
        }
    },
    delesteById: (id) => {
        if (mydb) {
            const collections = collection(collection_name);
            return collections
                .updateOne({ _id: ObjectId(id) }, { $set: { deleted: 1 } })
                .then((result) => {
                    console.log('MODEL::deleteOne() called: ', result.deletedCount);
                    if (result.deletedCount > 0) {
                        return 1;
                    } else {
                        return 0;
                    }
                });
        }
    },

    getDetailsForRejectionFromLab: async () => {
        // Get the date four months ago
        const fourMonthsAgo = new Date();
        fourMonthsAgo.setMonth(fourMonthsAgo.getMonth() - 4);
        fourMonthsAgo.setUTCHours(0, 0, 0, 0);

        // console.log("Filtering records modified after:", fourMonthsAgo);
        // Step 1: Fetch records from 'customer_cmr_details' modified today but NOT present in 'audit'
        const filterPipeline = [
            {
                $match: {
                    CMR_Status: 31,
                    modified_At: { $gte: fourMonthsAgo }
                }
            },
            {
                $lookup: {
                    from: "audit",
                    let: { cmrId: "$_id", cmrNo: "$CRM_CMR_No" },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $and: [
                                        { $eq: ["$data._id", "$$cmrId"] },
                                        { $eq: ["$data.CRM_CMR_No", "$$cmrNo"] },
                                        { $eq: ["$data.newStatus", 31] }
                                    ]
                                }
                            }
                        }
                    ],
                    as: "audit_entry"
                }
            },
            {
                $match: { "audit_entry": { $size: 0 } }
            }
            
        ];
        let results = await DataAccess.aggregate("customer_cmr_details", filterPipeline);

        // Step 2: Process and log new records
        for (const result of results) {
            let doc = {
                oldStatus: 0,
                newStatus: result.CMR_Status,
                CRM_CMR_No: result.CRM_CMR_No,
                _id: result._id
            };

            const newStatus = cmrStatus().filter((key) => key.value == result.CMR_Status);

            if (newStatus.length > 0) { 
                addLog(
                    auditActions().change_status, 
                    result.customer_id, 
                    '67e1586e8031d59878ee05f8', 
                    doc, 
                    `Changed Status of ${doc.CRM_CMR_No} from Lab to ${newStatus[0].label}`
                );
            } else {
                console.warn(`No matching status found for CMR_Status: ${result.CMR_Status}`);
            }
        }
    }
}

module.exports = model;

function checkCMRStatusChanged(prevData, body, id, loggedUser) {
    if (prevData.CMR_Status && body.CMR_Status && prevData.CMR_Status != body.CMR_Status) {
        let doc = {
            oldStatus: prevData.CMR_Status,
            newStatus: body.CMR_Status,
            CRM_CMR_No: prevData.CRM_CMR_No,
            _id: id
        };
        const oldStatus = cmrStatus().filter((key) => key.value == doc.oldStatus)
        const newStatus = cmrStatus().filter((key) => key.value == doc.newStatus)
        addLog(auditActions().change_status, prevData.customer_id, loggedUser._id, doc, `Changed Status of ${doc.CRM_CMR_No} from ${oldStatus[0].label} to ${newStatus[0].label}`);
    }
}
