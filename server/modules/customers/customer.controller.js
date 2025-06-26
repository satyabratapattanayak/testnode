//@ts-check

const { isEmpty, head, first, isRegExp, isArray } = require('lodash');
const ObjectId = require('mongodb').ObjectID;
const jwt = require('jsonwebtoken');
const PubSub = require('pubsub-js');
const Moment = require('moment');


const DataAccess = require('../../helpers/DataAccess');
const ConvertDate = require('../../config/dateutil');
const HelperService = require('../../helpers/APIResponse');
const Config = require('../../config/config');
const { bd_stage_color } = require('../../config/dynamic_color_&_icon/customer');
const Customer = require('../customers/customer.model.js');
const Region = require('../region/region.model.js');
const LeadModel = require('../lead/lead.model.js');
const Contacts = require('../contacts/contacts.model.js');
const MarketInfo = require('../customers/marketinfo.model.js');
const Model_customer_qty_requirements = require('./customer_qty_requirements.model');

const Model_Customer_Input_Material_Details = require('./customer_input_materialdetails.model');
const Model_customer_sample_order = require('./customer_sample_order.model');

const Model_Customer_Procurement_Cycle = require('./customer_procurement_cycle.model');
const Model_cust_MachineryDetails = require('./customer_machinery_details.model');
const Model_cmr_Details = require('./cmr_details.model');

const Audit = require('../audit/audit.model.js');
const Notes = require('../notes/notes.model.js');
const scheduleModel = require('../schedule/schedule.model.js');
const Quotes = require('../quotes/quotes.model.js');
const { getCurrentUserInfo } = require('../shared/shared.controller');
const { auditActions, Modules } = require('../shared/shared.model');

const audit = (body) => { Audit.addLog(body); };

const sortByKey = (array, key) => {
    const descendingOrder = array.sort(function (a, b) {
        let x = a[key];
        let y = b[key];
        return ((x < y) ? -1 : ((x > y) ? 1 : 0));
    });
    return descendingOrder.reverse();
};

function ArchiveLead(req, result, currentLoggedUser) {
    LeadModel.Archive(req.body.reference_lead_id, currentLoggedUser);
    const crieteria = { documentId: ObjectId(req.body.reference_lead_id) };
    const doc = { $set: { documentId: ObjectId(result._id) } };
    Audit.updateMany(crieteria, doc); // move lead log to customer 
    Notes.updateMany(crieteria, doc); // move lead notes to customer 
    scheduleModel.UpdateMany({ associated_with: ObjectId(req.body.reference_lead_id) }, { associated_with: ObjectId(result._id) });
}

const matchCountryAndBusinessUnit = (doc, country, businessunit, number) => {
    if (doc.customer_country == 'IN' && doc.businessunit == businessunit) {
        doc.number_series = number;
    } else if (doc.customer_country != 'IN' && doc.businessunit == businessunit) {
        doc.number_series = 2;
    }
};

const setNumberSeries = (doc) => {
    switch (doc.businessunit) {
        case 'masterbatch':
            matchCountryAndBusinessUnit(doc, doc.customer_country, doc.businessunit, 1);
            break;
        case 'ssg':
            matchCountryAndBusinessUnit(doc, doc.customer_country, doc.businessunit, 3);
            break;
        case 'nfc_wpc_profiles':
            matchCountryAndBusinessUnit(doc, doc.customer_country, doc.businessunit, 4);
            break;
        // case 'n2n_bio_deg_&_comp':
        case 'n2n_bio_deg_':
            matchCountryAndBusinessUnit(doc, doc.customer_country, doc.businessunit, 5);
            break;
        case 'performance_material':
            matchCountryAndBusinessUnit(doc, doc.customer_country, doc.businessunit, 1);
            break;
        // case 'innovative_materials_group':
        case 'INNOVATIVE MATERIALS':
            matchCountryAndBusinessUnit(doc, doc.customer_country, doc.businessunit, 5);
            break;
        case 'common':
            matchCountryAndBusinessUnit(doc, doc.customer_country, doc.businessunit, 1);
            break;
        default:
            break;
    }
};

const checkResponsibilityMatrix = (staff, element) => {
    let responsibilityMatrix = [];
    if (staff.emp_code == element.responsibility_matrix.primary_account_manager) {
        responsibilityMatrix.push('Primary/Account Manager');
    }
    if (staff.emp_code == element.responsibility_matrix.primary_biss_development) {
        responsibilityMatrix.push('Primary/Biss Development');
    }
    if (staff.emp_code == element.responsibility_matrix.primary_field_coordinator) {
        responsibilityMatrix.push('Primary/Field Coordinator');
    }
    if (staff.emp_code == element.responsibility_matrix.primary_technical_services) {
        responsibilityMatrix.push('Primary/Technical Services');
    }
    if (staff.emp_code == element.responsibility_matrix.primary_product_development) {
        responsibilityMatrix.push('Primary/Product Development');
    }
    if (staff.emp_code == element.responsibility_matrix.primary_salesOps) {
        responsibilityMatrix.push('Primary/Sales Ops');
    }
    if (staff.emp_code == element.responsibility_matrix.primary_door_opener) {
        responsibilityMatrix.push('Primary/Door Opener');
    }
    if (staff.emp_code == element.responsibility_matrix.secondary_account_manager) {
        responsibilityMatrix.push('Secondary/Account Manager');
    }
    if (staff.emp_code == element.responsibility_matrix.secondary_biss_development) {
        responsibilityMatrix.push('Secondary/Biss Development');
    }
    if (staff.emp_code == element.responsibility_matrix.secondary_field_coordinator) {
        responsibilityMatrix.push('Secondary/Field Coordinator');
    }
    if (staff.emp_code == element.responsibility_matrix.secondary_technical_services) {
        responsibilityMatrix.push('Secondary/Technical Services');
    }
    if (staff.emp_code == element.responsibility_matrix.secondary_product_development) {
        responsibilityMatrix.push('Secondary/Product Development');
    }
    if (staff.emp_code == element.responsibility_matrix.secondary_salesOps) {
        responsibilityMatrix.push('Secondary/Sales Ops');
    }
    if (staff.emp_code == element.responsibility_matrix.secondary_door_opener) {
        responsibilityMatrix.push('Secondary/Door Opener');
    }
    if (staff.emp_code == element.responsibility_matrix.tertiary_account_manager) {
        responsibilityMatrix.push('Tertiary/Account Manager');
    }
    if (staff.emp_code == element.responsibility_matrix.tertiary_biss_development) {
        responsibilityMatrix.push('Tertiary/Biss Development');
    }
    if (staff.emp_code == element.responsibility_matrix.tertiary_field_coordinator) {
        responsibilityMatrix.push('Tertiary/Field Coordinator');
    }
    if (staff.emp_code == element.responsibility_matrix.tertiary_technical_services) {
        responsibilityMatrix.push('Tertiary/Technical Services');
    }
    if (staff.emp_code == element.responsibility_matrix.tertiary_product_development) {
        responsibilityMatrix.push('Tertiary/Product Development');
    }
    if (staff.emp_code == element.responsibility_matrix.tertiary_salesOps) {
        responsibilityMatrix.push('Tertiary/Sales Ops');
    }
    if (staff.emp_code == element.responsibility_matrix.tertiary__door_opener) {
        responsibilityMatrix.push('Tertiary/Door Opener');
    }
    return responsibilityMatrix;
};

const checkBDOverStayed = (customerDetails) => {
    let overStayColor = 'red';
    let s1CanStay = 13;
    let s2CanStay = 13;
    let s3CanStay = 13;
    let s4CanStay = 13;
    const stage = customerDetails.bd_activity.find((ele) => {
        if (customerDetails.bdStage == 's1' && ele.bdStage == 's1') {
            let now = Moment();
            let bdStageDate = Moment(ele.moved_date);
            let diff = now.diff(bdStageDate, 'days');
            if (diff > s1CanStay) { customerDetails.bd_overStayedColor = overStayColor; }
        } else if (customerDetails.bdStage == 's2' && ele.bdStage == 's2') {
            let now = Moment();
            let bdStageDate = Moment(ele.moved_date);
            let diff = now.diff(bdStageDate, 'days');
            if (diff > s2CanStay) { customerDetails.bd_overStayedColor = overStayColor; }
        }
    });
};

const filter = async (req, res, next) => {
    try {
        let isCustomer = false;
        if (req.baseUrl.endsWith('customer')) {
            isCustomer = true;
        }
        const currentLoggedUser = await getCurrentUserInfo(req.headers.authorization);
        const result = await Customer.filter(currentLoggedUser, req.body, isCustomer);
        if (isEmpty(result)) {
            res.status(404).json({ message: 'no results found', status: 404 });
        } else {
            res.json(result, 200, next);
        }
    } catch (error) {
        next(error);
    }
};

const listAll = async (req, res, next) => {
    try {
        let params = req.body;
        let isCustomer = false;
        if (req.baseUrl.endsWith('customer')) {
            isCustomer = true;
        }
        const currentLoggedUser = await getCurrentUserInfo(req.headers.authorization);

        const result = await Customer.all(currentLoggedUser, null, params, isCustomer);
        if (isEmpty(result[0].data)) {
            HelperService.sendDataNotFound(res);
        } else {
            let response = {
                data: result[0].data,
                total: result[0].totalCount.length > 0 ? result[0].totalCount[0].count : 0
            }
            res.json(response, 200, next);
        }
    } catch (error) {
        next(error);
    }
};


const listBDactivity = async (req, res, next) => {
    try {
        const currentLoggedUser = await getCurrentUserInfo(req.headers.authorization);
        const bdStage = req.query.bd_stage;
        let params = req.body;
        const result = await Customer.allBDactivity(currentLoggedUser, bdStage, params);
        if (isEmpty(result[0].data)) {
            res.status(404).json({ message: 'No data found', status: 404 });
        } else {



            result[0].data.forEach(element => {
                if (element.bd_activity && element.bdStage) {
                    checkBDOverStayed(element);
                }
                delete element.bd_activity;
            });

            let response = {
                data: result[0].data,
                // total: result[0].totalCount[0].count
                total: result[0].totalCount.length > 0 ? result[0].totalCount[0].count : 0
            }
            res.json(response, 200, next);
        }
    } catch (error) {
        next(error);
    }
};

const listCMR = async (req, res, next) => {
    try {
        let params = req.body;
        const currentLoggedUser = await getCurrentUserInfo(req.headers.authorization)
        const result = await Customer.listCMR(currentLoggedUser, params);
        if (isEmpty(result[0].data)) {
            res.status(404).json({ message: 'No data found', status: 404 });
        } else {
            let response = {
                data: result[0].data,
                // total: result[0].totalCount[0].count
                total: result[0].totalCount.length > 0 ? result[0].totalCount[0].count : 0
            };
            res.json(response, 200, next);
        }
    } catch (error) {
        next(error);
    }
};

const CMRlist = async (req, res, next) => {
    try {
        let params = req.body;
        const currentLoggedUser = await getCurrentUserInfo(req.headers.authorization)
        const result = await Customer.CMRlist(currentLoggedUser, params);
        if (isEmpty(result[0].data)) {
            res.status(404).json({ message: 'No data found', status: 404 });
        } else {
            let response = {
                data: result[0].data,
                // total: result[0].totalCount[0].count
                total: result[0].totalCount.length > 0 ? result[0].totalCount[0].count : 0
            };
            res.json(response, 200, next);
        }
    } catch (error) {
        next(error);
    }
};


const CMR_AwaitingApproval = async (req, res, next) => {
    try {
        const CurrentUserInfo = await getCurrentUserInfo(req.headers.authorization)
        let params = req.body;
        const result = await Customer.CMR_WaitingForApproval(CurrentUserInfo, params);
        if (isEmpty(result)) {
            res.status(404).json({ message: 'No data found', status: 404 });
        } else {

            let response = {
                data: result[0].data,
                // total: result[0].totalCount[0].count
                total: result[0].totalCount.length > 0 ? result[0].totalCount[0].count : 0
            };
            res.json(response, 200, next);
        }
    }
    catch (error) {
        next(error);
    }
};

const listCustomersToLink = async (req, res, next) => {
    try {
        const result = await Customer.listCustomersToLink(req.body);
        if (isEmpty(result)) {
            res.status(404).json({ message: 'No data found', status: 404 });
        } else {
            res.json(result, 200, next);
        }
    } catch (error) {
        next(error);
    }
};


const customerDetails = async (req, res, next) => {
    try {
        const CurrentUserInfo = await getCurrentUserInfo(req.headers.authorization)
        const result = await Customer.findById(CurrentUserInfo, req.params.id);
        if (isEmpty(result)) {
            res.status(404).json({ message: 'Customer not exist!', code: 404 });
        } else {

            result.forEach(element => {

                // console.log('result: ', element);
                if (element.targets) sortByKey(element.targets, 'created_at');
                if (element.quotes) sortByKey(element.quotes, 'created_at');

                if (!element.bd_activated) {
                    element.bd_activated = 0;
                }

                if (element.bd_stage) {
                    element.bd_stage.color_code = bd_stage_color(element.bd_stage);
                }

                if (!isEmpty(element.linked_contacts)) {
                    element.linked_contacts.forEach(contact => {
                        const SingleContacts = element.linked_contact_details.find(contactDetails => {
                            return JSON.stringify(contact.contactId) == JSON.stringify(contactDetails._id);
                        });
                        if (SingleContacts) {
                            contact.contact_name = SingleContacts.contact_name;
                            contact.contact_email = SingleContacts.contact_email;
                            contact.contact_phone = SingleContacts.contact_phone;
                            contact.contact_city = SingleContacts.contact_city;
                            contact.contact_state = SingleContacts.contact_state;
                            contact.contact_type = SingleContacts.contact_type;
                            contact.designation = SingleContacts.designation;
                        }
                    });
                }

                if (!isEmpty(element.linked_staff_details)) {
                    element.linked_staff = [];
                    element.linked_staff_details.forEach(staff => {

                        let data = {};
                        data.staffId = staff._id;
                        data.staff_name = staff.first_name + ' ' + staff.last_name;
                        data.staff_phone = staff.phone;
                        data.staff_job_title = staff.job_title;
                        data.staff_department = staff.department;
                        data.responsibilityMatrix = element.responsibility_matrix ? checkResponsibilityMatrix(staff, element) : [];
                        element.linked_staff.push(data);

                    });
                }


                if (!isEmpty(element.createdBy_details)) element.created_by = element.createdBy_details[0].first_name;

                if (!isEmpty(element.targets)) {
                    element.targets.forEach(target => {
                        target.start_date = target.start_date != '' ? ConvertDate.getStringFormat(target.start_date) : '';
                        target.end_date = target.end_date != '' ? ConvertDate.getStringFormat(target.end_date) : '';
                        target.created_at = ConvertDate.getStringFormat(target.created_at);
                    });
                } else if (!element.targets || isEmpty(element.targets)) {
                    element.targets = [];
                }

                if (!isEmpty(element.quotes)) {
                    element.quotes.forEach(quote => {
                        if (!isEmpty(element.quotes_file_details)) {
                            if (!isEmpty(quote.files)) {
                                let uploadedFiles = [];
                                quote.files.forEach(eachFile => {
                                    const file_details = element.quotes_file_details.find((fileDetails) => {
                                        return JSON.stringify(eachFile) == JSON.stringify(fileDetails._id);
                                    });
                                    if (file_details) {
                                        uploadedFiles.push({ id: eachFile, file_name: file_details.file_name, url: Config.imageURL + eachFile });
                                    }
                                });
                                quote.files = uploadedFiles;
                            }

                        }
                        quote.created_at = ConvertDate.getStringFormat(quote.created_at);
                    });
                } else if (!element.quotes || isEmpty(element.quotes)) {
                    element.quotes = [];
                }


                delete element.createdBy_details, delete element.quotes_file_details;
                delete element.linked_respMatrix_details, delete element.linked_staff_Temp_details;
                delete element.region_details, delete element.area_details, delete element.zone_details;
                delete element.linked_staff_details, delete element.linked_contact_details;
                delete element.linked_staff_role_details, delete element.linked_staff_acl_details;
                delete element.business_category_details, delete element.linked_staff_zone_details;
                delete element.business_division_details, delete element.business_group_details;
            });

            res.json(result, 200, next);
        }
    } catch (error) {
        next(error)
    }
};


const create = async (req, res, next) => {
    try {
        const currentLoggedUser = await getCurrentUserInfo(req.headers.authorization);
        let isCustomer = false;
        if (req.baseUrl.endsWith('customer')) {
            isCustomer = true;
        }
        const result = await Customer.create(req.body, currentLoggedUser);
        PubSub.publishSync('DBUpdates', { change: 'customer', data: result });
        if (req.body.offlineSyncId) {
            const deleteDupData = {
                delete: true,
                deleted: 1,
                _id: req.body.offlineSyncId
            };
            PubSub.publishSync('DBDelete', { change: 'customer', data: deleteDupData });
        }
        res.status(200).json({ message: 'customer successffully created!', status: 200, customerId: result._id });

        // set lead as archived when lead moved to s1 or lead is approved
        if (req.body.reference_lead_id) {
            ArchiveLead(req, result, currentLoggedUser);
        }
    } catch (error) {
        next(error);
    }
};

const update = async (req, res, next) => {
    try {
        const currentLoggedUser = await getCurrentUserInfo(req.headers.authorization);
        const id = req.params.id;
        let isCustomer = false;
        if (req.baseUrl.endsWith('customer')) {
            isCustomer = true;
        }
        if (req.body.customer_state && ObjectId.isValid(req.body.customer_state)) {
            req.body.customer_state = ObjectId(req.body.customer_state);
        }
        if (req.body.customer_region) { req.body.customer_region = ObjectId(req.body.customer_region); }
        if (req.body.customer_area) { req.body.customer_area = ObjectId(req.body.customer_area); }
        if (req.body.customer_zone) { req.body.customer_zone = ObjectId(req.body.customer_zone); }


        if (req.body.currentStage || req.body.bdStage) {
            req.body.bd_activated = 1;
        }
        req.body.modified_At = new Date();
        delete req.body.created_by, delete req.body.created_at;

        if (req.body.customer_country && req.body.businessunit) {
            setNumberSeries(req.body);
        }
        const result = await Customer.update(id, req.body, currentLoggedUser, isCustomer);
        console.log('customer update::controller: ', result);
        if (result == 1) {
            res.status(200).json({ message: 'customer successffully updated!', status: 200 });
        } else if (result == 0) {
            res.status(200).json({ message: 'nothing to update. you did not change anything. please check the data and customerId', status: 200 });
        } else if (result == 2) {
            res.status(400).json({ message: 'customer_code already exist!', status: 400 });
        }
    } catch (error) {
        next(error);
    }
};

const deleteCustomer = async (req, res, next) => {
    const currentLoggedUser = await getCurrentUserInfo(req.headers.authorization);
    const id = req.params.id;
    const result = await Customer.deleteById(id, currentLoggedUser);
    if (result == 1) {
        res.status(200).json({ message: 'Customer deleted successfully', status: 200 });
        const deleteDupData = {
            delete: true,
            _id: id
        };
        PubSub.publishSync('DBDelete', { change: 'customer', data: deleteDupData });
    } else {
        res.json({ message: 'Customer not deleted successfully' });
    }
};

const linkContacts = async (req, res, next) => {
    try {
        const currentLoggedUser = await getCurrentUserInfo(req.headers.authorization);
        const id = req.params.id;

        let reqBody = [];
        if (!isEmpty(req.body.contactId)) {
            req.body.contactId.forEach(element => {
                reqBody.push({ contactId: ObjectId(element), addedBy: ObjectId(currentLoggedUser._id), linked_on: new Date() });
            });
        } else {
            res.json('contactId requires');
        }
        req.body = reqBody;
        const result = await Customer.linkContacts(id, req.body, currentLoggedUser);
        if (result == 1) {
            res.json({ message: 'contact successfully linked!', status: 200 });
        } else {
            res.json({ message: 'not linked successfully', status: 500 });
        }
    } catch (error) {
        next(error);
    }
};

const unLinkContacts = async (req, res, next) => {
    try {
        const currentLoggedUser = await getCurrentUserInfo(req.headers.authorization);
        const id = req.params.id;
        const contactId = req.params.contactId;
        const result = await Customer.unLinkContacts(id, contactId, currentLoggedUser);
        if (result == 1) {
            res.json({ message: 'Contact successfully unlinked!', status: 200 });
        } else {
            res.json({ message: 'unlinked not successfull', status: 500 });
        }
    } catch (error) {
        next(error);
    }
};

const linkStaff = async (req, res, next) => {
    try {
        const currentLoggedUser = await getCurrentUserInfo(req.headers.authorization);
        const id = req.params.id;

        let reqBody = [];
        if (!isEmpty(req.body.staffId)) {
            req.body.staffId.forEach(element => {
                reqBody.push({ staffId: ObjectId(element), addedBy: ObjectId(currentLoggedUser._id), linked_on: new Date() });
            });
        } else {
            res.json('staffId requires');
        }
        req.body = reqBody;
        const result = await Customer.linkStaff(id, req.body, currentLoggedUser);
        if (result == 1) {
            res.json({ message: 'Staff successfully linked!', status: 200 });
        } else {
            res.json({ message: 'not linked successfully', status: 500 });
        }
    } catch (error) {
        next(error);
    }
};

const unLinkStaff = (req, res, next) => {
    getCurrentUserInfo(req.headers.authorization).then((currentLoggedUser) => {
        const id = req.params.id;
        const staffId = req.params.staffId;
        Customer.unLinkStaff(id, staffId, currentLoggedUser)
            .then((result) => {
                if (result == 1) {
                    res.json({ message: 'Staff successfully unlinked!', status: 200 });
                } else {
                    res.json({ message: 'unlink not successfull!. This is becasue, staff may be part of responsibility matrix. Please check the data', status: 500 });
                }
            })
            .catch((e) => next(e));
    }).catch(e => res.send(e));
};

const addNotes = async (req, res, next) => {
    try {
        const currentLoggedUser = await getCurrentUserInfo(req.headers.authorization)
        const id = req.params.customerId;
        if (req.baseUrl.endsWith('customer')) {
            req.body.dataType = 'customer';
        } else {
            req.body.dataType = 'lead';
        }
        if (req.body.files) {
            let uploadedFile = [];
            req.body.files.forEach(element => {
                uploadedFile.push(ObjectId(element.id));
            });
            req.body.files = uploadedFile;
        }

        if (!isEmpty(req.body.tagged_users)) {
            let t_users = [];
            req.body.tagged_users.forEach(element => {
                t_users.push(ObjectId(element));
            });
            req.body.tagged_users = t_users;
        } else {
            req.body.tagged_users = [];
        }

        req.body.userId = ObjectId(currentLoggedUser._id);
        req.body.date = new Date();

        const result = await Notes.addNotes(id, req.body, currentLoggedUser, Modules().customer)
        console.log('CUSTOMER NOTES');
        result[0].notes.forEach(element1 => {
            result[0].notes_user_details.forEach(element2 => {
                if (JSON.stringify(element1.userId) == JSON.stringify(element2._id)) {
                    element1.username = element2.first_name + ' ' + element2.last_name;
                }
            });
            let filesDetails = [];
            if (!isEmpty(element1.files)) {
                element1.files.forEach(element => {
                    result[0].file_details.forEach(fileElement => {
                        if (JSON.stringify(element) == JSON.stringify(fileElement._id)) {
                            filesDetails.push({ id: element, file_name: fileElement.file_name, url: Config.imageURL + element });
                        }
                    });
                });
                element1.files = filesDetails;
            }
        });
        res.json(head(result).notes);
        DataAccess.UpdateOne(Modules().customer, { _id: ObjectId(id) }, { $set: { crm_sync: 1 } })

    } catch (error) {
        next(error)
    }
};

const addNotesOnCMR = async (req, res, next) => {
    try {
        const currentLoggedUser = await getCurrentUserInfo(req.headers.authorization)
        const id = req.params.cmrId;

        if (req.body.files) {
            let uploadedFile = [];
            req.body.files.forEach(element => {
                uploadedFile.push(ObjectId(element.id));
            });
            req.body.files = uploadedFile;
        }

        if (!isEmpty(req.body.tagged_users)) {
            let t_users = [];
            req.body.tagged_users.forEach(element => {
                t_users.push(ObjectId(element));
            });
            req.body.tagged_users = t_users;
        } else {
            req.body.tagged_users = [];
        }

        req.body.userId = ObjectId(currentLoggedUser._id);
        req.body.date = new Date();
        const result = await Notes.addNotes(id, req.body, currentLoggedUser, Modules().cmr)
        console.log('CMR NOTES');
        result[0].notes.forEach(element1 => {
            result[0].notes_user_details.forEach(element2 => {
                if (JSON.stringify(element1.userId) == JSON.stringify(element2._id)) {
                    element1.username = element2.first_name + ' ' + element2.last_name;
                }
            });
            let filesDetails = [];
            if (!isEmpty(element1.files)) {
                element1.files.forEach(element => {
                    result[0].file_details.forEach(fileElement => {
                        if (JSON.stringify(element) == JSON.stringify(fileElement._id)) {
                            filesDetails.push({ id: element, file_name: fileElement.file_name, url: Config.imageURL + element });
                        }
                    });
                });
                element1.files = filesDetails;
            }
        });
        res.json(head(result).notes);
        const cmrData = await DataAccess.findOne(Modules().cmr, { _id: ObjectId(id) })
        if (cmrData && cmrData.approvalStage === 4) {
            DataAccess.UpdateOne(Modules().cmr, { _id: ObjectId(id) }, { $set: { crm_sync: 1 } })
        }
    } catch (error) {
        next(error);
    }
};

const addTargets = async (req, res, next) => {
    try {
        const currentLoggedUser = await getCurrentUserInfo(req.headers.authorization);
        const id = req.params.customerId;

        if (req.body.start_date) req.body.start_date = new Date(req.body.start_date);
        if (req.body.end_date) req.body.end_date = new Date(req.body.end_date);

        req.body.userId = ObjectId(currentLoggedUser._id);
        req.body.created_at = new Date();
        req.body.targetId = new ObjectId();
        const result = await Customer.addTargets(id, req.body, currentLoggedUser);
        // res.json(result);
        if (result == 1) {
            res.status(200).json({ message: 'Taggets successfully added', status: 200 });
        } else if (result == 0) {
            res.status(200).json({ message: 'nothing to add. please check the data', status: 200 });
        }
    } catch (error) {
        next(error);
    }
};

const updateTargets = async (req, res, next) => {
    try {
        const currentLoggedUser = await getCurrentUserInfo(req.headers.authorization);
        const id = req.params.customerId;
        const targetId = req.params.targetId;

        if (req.body.start_date) req.body.start_date = new Date(req.body.start_date);
        if (req.body.end_date) req.body.end_date = new Date(req.body.end_date);

        const result = await Customer.updateTargets(id, targetId, req.body, currentLoggedUser);
        if (result == 1) {
            res.status(200).json({ message: 'Taggets successfully updated', status: 200 });
        } else if (result == 0) {
            res.status(200).json({ message: 'nothing to update. you did not change anything. please check the data and targetId', status: 200 });
        }
    } catch (error) {
        next(error);
    }
};

const deleteTargets = async (req, res, next) => {
    try {
        const currentLoggedUser = await getCurrentUserInfo(req.headers.authorization);
        const customerId = req.params.customerId;
        const targetId = req.params.targetId;
        const result = await Customer.deleteTargets(customerId, targetId, currentLoggedUser);
        if (result == 1) {
            res.status(200).json({ message: 'Taggets successfully deleted', status: 200 });
        } else {
            res.status(500).json({ message: 'Delete failed!, targets does not exist! or already deleted', status: 500 });
        }
    } catch (error) {
        next(error);
    }
};

const createQuotes = async (req, res, next) => {
    try {
        const currentLoggedUser = await getCurrentUserInfo(req.headers.authorization);
        req.body.module = 'customer';
        const id = req.params.customerId;
        req.body.documentId = ObjectId(id);
        req.body.created_by = ObjectId(currentLoggedUser._id);
        req.body.created_at = new Date();
        const result = await Quotes.create(req.body, currentLoggedUser);
        res.json({ status: 200, message: 'quotes succesffully created', data: result });
    } catch (error) {
        next(error);
    }
};

// BD activity starts here
const addLinkedCustomer = async (req, res, next) => {
    try {
        const currentLoggedUser = await getCurrentUserInfo(req.headers.authorization);
        const customerId = req.params.customerId;
        console.log("addLinkedCustomer", req.body);

        let contact = req.body;
        delete contact._id;
        delete contact.contactId;
        const customerDetails = await Customer.findById(currentLoggedUser, customerId);
        if (customerDetails[0].customer_region[0]) {
            req.body.contact_region = [customerDetails[0].customer_region[0]._id];
            if(customerDetails[0].customer_area[0]){
                req.body.contact_area = [customerDetails[0].customer_area[0]._id];
            }
            if(customerDetails[0].customer_zone[0]){
                req.body.contact_zone = [customerDetails[0].customer_zone[0]._id];
            }
        }
        req.body.created_by = ObjectId(currentLoggedUser._id);
        req.body.created_at = new Date();
        req.body.modified_At = new Date();
        const result = await Contacts.create(req.body, currentLoggedUser);
        let reqBody = [];
        if (result) {
            result.forEach(element => {
                reqBody.push({ contactId: ObjectId(element._id), addedBy: ObjectId(currentLoggedUser._id), linked_on: new Date() });
            });
        }

        Customer.linkContacts(customerId, reqBody, currentLoggedUser)
            .then((result) => {
                if (result == 1) {
                    res.json({ message: 'contact successfully linked!', status: 200 });
                } else {
                    res.json({ message: 'not linked successfully', status: 500 });
                }
            })
            .catch((e) => next(e));
    } catch (error) {
        console.log("error",error);
        next(error);
    }

};

const addLinkedMarketInfo = (req, res, next) => {
    const currentLoggedUser = getCurrentUserInfo(req.headers.authorization);
    let marketInfoId;
    const customerId = req.params.customerId;
    console.log("addLinkedMarketInfo", req.body);
    req.body.created_at = new Date();
    req.body.created_by = ObjectId(currentLoggedUser._id);
    delete req.body._id;
    MarketInfo.create(req.body)
        .then((result) => {
            let reqBody = [];
            console.log("MarketInfo ", result);
            if (result) {
                result.forEach(element => {
                    marketInfoId = element._id;
                    reqBody.push({ marketId: ObjectId(element._id), addedBy: ObjectId(currentLoggedUser._id), linked_on: new Date() });
                });
            }

            Customer.linkMarketInfo(customerId, reqBody, currentLoggedUser)
                .then((result) => {
                    if (result == 1) {
                        res.json({ message: 'MarketInfo successfully linked!', id: marketInfoId, status: 200 });
                    } else {
                        res.json({ message: 'not linked successfully', status: 500 });
                    }
                })
                .catch((e) => next(e));

        })
        .catch((e) => next(e));
};

const updateLinkedMarketInfo = (req, res, next) => {
    const customerId = req.params.customerId;
    console.log("updateLinkedMarketInfo", req.body);

    let reqBody = [];

    let item = req.body;
    let id = item._id;
    delete item._id;
    req.body.created_at = new Date();
    MarketInfo.update(id, req.body)
        .then((result) => {
            res.json({ message: '  successfully updated!', status: 200, result });
        })
        .catch((e) => next(e));
};

const addLinked_Customer_Quantity_Requirement = (req, res, next) => {
    const currentLoggedUser = getCurrentUserInfo(req.headers.authorization);
    const customerId = req.params.customerId;
    console.log("addLinked_Customer_Quantity_Requirement", req.body);
    let contact = req.body;
    req.body.created_at = new Date();
    req.body.created_by = ObjectId(currentLoggedUser._id);
    delete req.body._id;
    Model_customer_qty_requirements.create(req.body)
        .then((result) => {
            console.log('RESULT: ', result);

            let reqBody = [];
            if (result) {
                result.forEach(element => {
                    reqBody.push({ qty_requirementId: ObjectId(element._id), addedBy: ObjectId(currentLoggedUser._id), linked_on: new Date() });
                });
            }
            Customer.linkCustomer_Quantity_Requirement(customerId, reqBody, currentLoggedUser)
                .then((result) => {
                    if (result == 1) {
                        res.json({ message: 'Customer_Quantity_Requirement successfully linked!', status: 200 });
                    } else {
                        res.json({ message: 'not linked successfully', status: 500, Error: result });
                    }
                })
                .catch((e) => next(e));

        })
        .catch((e) => next(e));
};

const updateLinked_Customer_Quantity_Requirement = (req, res, next) => {
    console.log("updateLinked_Customer_Quantity_Requirement", req.body);

    let item = req.body;
    let id = item._id;
    delete item._id;
    req.body.created_at = new Date();
    Model_customer_qty_requirements.update(id, req.body)
        .then((result) => {
            if (result == 1) {
                res.json({ message: '  successfully updated!', status: 200 });
            } else {
                res.json({ message: 'nothing to update. You have not changed any data!', status: 200 });
            }
        })
        .catch((e) => next(e));
};


const addLinked_Customer_Input_Material_Details = (req, res, next) => {
    const currentLoggedUser = getCurrentUserInfo(req.headers.authorization);
    const customerId = req.params.customerId;
    console.log("addLinked_Customer_Input_Material_Details", req.body);

    req.body.created_at = new Date();
    req.body.created_by = ObjectId(currentLoggedUser._id);
    delete req.body._id;
    Model_Customer_Input_Material_Details.create(req.body)
        .then((result) => {
            let reqBody = [];
            if (result) {
                result.forEach(element => {
                    reqBody.push({ input_materialId: ObjectId(element._id), addedBy: ObjectId(currentLoggedUser._id), linked_on: new Date() });
                });
            }
            Customer.linkCustomer_Input_Material_Details(customerId, reqBody, currentLoggedUser)
                .then((result) => {
                    if (result == 1) {
                        res.json({ message: 'Customer_Input_Material_Details successfully linked!', status: 200 });
                    } else {
                        res.json({ message: 'not linked successfully', status: 500, Error: result });
                    }
                })
                .catch((e) => next(e));

        })
        .catch((e) => next(e));
};

const updateLinked_Customer_Input_Material_Details = (req, res, next) => {
    console.log("updateLinked_Customer_Input_Material_Details", req.body);

    let item = req.body;
    let id = item._id;
    delete item._id;
    req.body.created_at = new Date();
    Model_Customer_Input_Material_Details.update(id, req.body)
        .then((result) => {
            res.json({ message: ' successfully updated!', status: 200, result });
        })
        .catch((e) => next(e));
};


const addLinked_customer_sample_order = (req, res, next) => {
    const currentLoggedUser = getCurrentUserInfo(req.headers.authorization);
    const customerId = req.params.customerId;
    console.log("addLinked_customer_sample_order", req.body);

    req.body.created_at = new Date();
    req.body.created_by = ObjectId(currentLoggedUser._id);
    delete req.body._id;
    Model_customer_sample_order.create(req.body)
        .then((result) => {
            let reqBody = [];
            if (result) {
                result.forEach(element => {
                    reqBody.push({ sample_order_Id: ObjectId(element._id), addedBy: ObjectId(currentLoggedUser._id), linked_on: new Date() });
                });
            }
            Customer.link_customer_sample_order(customerId, reqBody, currentLoggedUser)
                .then((result) => {
                    if (result == 1) {
                        res.json({ message: 'Customer_customer_sample_order successfully linked!', status: 200 });
                    } else {
                        res.json({ message: 'not linked successfully', status: 500, Error: result });
                    }
                })
                .catch((e) => next(e));

        })
        .catch((e) => next(e));
};

const updateLinked_customer_sample_order = (req, res, next) => {
    const currentLoggedUser = getCurrentUserInfo(req.headers.authorization);
    console.log("updateLinked_customer_sample_order", req.body);

    let item = req.body;
    let id = item._id;
    delete item._id;
    req.body.created_at = new Date();
    Model_customer_sample_order.update(id, req.body)
        .then((result) => {
            res.json({ message: ' successfully updated!', status: 200, result });
        })
        .catch((e) => next(e));
};

const addLinked_Customer_Material_Details = (req, res, next) => {
    const currentLoggedUser = getCurrentUserInfo(req.headers.authorization);
    const customerId = req.params.customerId;
    console.log("addLinked_Customer_Material_Details", req.body);

    req.body.created_at = new Date();
    req.body.created_by = ObjectId(currentLoggedUser._id);
    delete req.body._id;
    Model_Customer_Material_Details.create(req.body)
        .then((result) => {
            let reqBody = [];
            if (result) {
                result.forEach(element => {
                    reqBody.push({ materialId: ObjectId(element._id), addedBy: ObjectId(currentLoggedUser._id), linked_on: new Date() });
                });
            }
            Customer.linkCustomer_Material_Details(customerId, reqBody, currentLoggedUser)
                .then((result) => {
                    if (result == 1) {
                        res.json({ message: 'Customer_Material_Details successfully linked!', status: 200 });
                    } else {
                        res.json({ message: 'not linked successfully', status: 500, Error: result });
                    }
                })
                .catch((e) => next(e));

        })
        .catch((e) => next(e));
};

const updateLinked_Customer_Material_Details = (req, res, next) => {
    console.log("updateLinked_Customer_Material_Details", req.body);

    let item = req.body;
    let id = item._id;
    delete item._id;
    req.body.created_at = new Date();
    Model_Customer_Material_Details.update(id, req.body)
        .then((result) => {
            res.json({ message: ' successfully updated!', status: 200, result });
        })
        .catch((e) => next(e));
};
// Customer Produrement Cycle
const addLinked_Customer_Procurement_Cycle = (req, res, next) => {
    const currentLoggedUser = getCurrentUserInfo(req.headers.authorization);
    const customerId = req.params.customerId;
    console.log("Customer_Procurement_Cycle create", req.body);
    req.body.created_at = new Date();
    req.body.created_by = ObjectId(currentLoggedUser._id);
    delete req.body._id;
    Model_Customer_Procurement_Cycle.create(req.body)
        .then((result) => {
            console.log('RESULT: ', result);

            let reqBody = [];
            if (result) {
                result.forEach(element => {
                    reqBody.push({ procurement_cycleId: ObjectId(element._id), addedBy: ObjectId(currentLoggedUser._id), linked_on: new Date() });
                });
            }
            Customer.linkCustomer_Procurement_Cycle(customerId, reqBody, currentLoggedUser)
                .then((result) => {
                    if (result == 1) {
                        res.json({ message: 'Customer_Procurement_Cycle successfully linked!', status: 200 });
                    } else {
                        res.json({ message: 'not linked successfully', status: 500, Error: result });
                    }
                })
                .catch((e) => next(e));

        })
        .catch((e) => next(e));
};

const updateLinked_Customer_Procurement_Cycle = (req, res, next) => {
    console.log("update Linked_Customer_Procurement_Cycle", req.body);

    let item = req.body;
    let id = item._id;
    delete item._id;
    req.body.created_at = new Date();
    Model_Customer_Procurement_Cycle.update(id, req.body)
        .then((result) => {
            if (result == 1) {
                res.json({ message: '  successfully updated!', status: 200 });
            } else {
                res.json({ message: 'nothing to update. You have not changed any data!', status: 200 });
            }
        })
        .catch((e) => next(e));
};

// customer machinery details
const addLinked_Customer_Machinery_Details = (req, res, next) => {
    const currentLoggedUser = getCurrentUserInfo(req.headers.authorization);
    const customerId = req.params.customerId;
    console.log("addLinked_Customer_Machinery_Details create", req.body);
    req.body.created_at = new Date();
    req.body.created_by = ObjectId(currentLoggedUser._id);
    delete req.body._id;
    Model_cust_MachineryDetails.create(req.body)
        .then((result) => {
            console.log('RESULT: ', result);

            let reqBody = [];
            if (result) {
                result.forEach(element => {
                    reqBody.push({ machinery_detailsId: ObjectId(element._id), addedBy: ObjectId(currentLoggedUser._id), linked_on: new Date() });
                });
            }
            Customer.linkCustomer_Machinery_details(customerId, reqBody, currentLoggedUser)
                .then((result) => {
                    if (result == 1) {
                        res.json({ message: 'Customer_Procurement_Cycle successfully linked!', status: 200 });
                    } else {
                        res.json({ message: 'not linked successfully', status: 500, Error: result });
                    }
                })
                .catch((e) => next(e));

        })
        .catch((e) => next(e));
};

const updateLinked_Customer_Machinery_Details = (req, res, next) => {
    console.log("update updateLinked_Customer_Machinery_Details", req.body);

    let item = req.body;
    let id = item._id;
    delete item._id;
    req.body.created_at = new Date();
    Model_cust_MachineryDetails.update(id, req.body)
        .then((result) => {
            if (result == 1) {
                res.json({ message: '  successfully updated!', status: 200 });
            } else {
                res.json({ message: 'nothing to update. You have not changed any data!', status: 200 });
            }
        })
        .catch((e) => next(e));
};

// cmr details
const addLinked_cmr_Details = async (req, res, next) => {
    try {
        const currentLoggedUser = await getCurrentUserInfo(req.headers.authorization);
        const customerId = req.params.customerId;
        req.body.customer_id = customerId;
        console.log("create new CMR", req.body);

        const resp = await Model_cmr_Details.create(req.body, currentLoggedUser);
        if (resp == 0) {
            // res.status(400).json({ message: 'CMR Number already exist!', status: 400 });
            res.status(400).json({ message: "Couldn't save CMR. Please try again!", status: 400 });
        } else {
            res.json({ message: `CMR created: ${resp[0].CRM_CMR_No}`, status: 200, data: resp[0], 'opportunity_id': customerId });
            // let reqBody = [];
            // resp.forEach(element => {
            //     reqBody.push({ cmr_detailsId: ObjectId(element._id), addedBy: ObjectId(currentLoggedUser._id), linked_on: new Date() });
            // });
            // const result = await Customer.linkCMR_details(customerId, reqBody, currentLoggedUser);
        }
    } catch (error) {
        next(error)
    } finally {
        // check_CMR_Number_Sequence()
    }

};

const updateLinked_cmr_Details = async (req, res, next) => {

    const currentLoggedUser = await getCurrentUserInfo(req.headers.authorization);
    console.log('update updateLinked_opportunity', req.body);

    if (req.body.Requested_Date) { req.body.Requested_Date = new Date(req.body.Requested_Date); }
    if (req.body.Approved_Date) { req.body.Approved_Date = new Date(req.body.Approved_Date); }
    if (req.body.Customer_Sample_sent_Date) { req.body.Customer_Sample_sent_Date = new Date(req.body.Customer_Sample_sent_Date); }
    if (req.body.CMR_receipt_Date) { req.body.CMR_receipt_Date = new Date(req.body.CMR_receipt_Date); }
    if (req.body.Estimated_completion_Date_of_Development) { req.body.Estimated_completion_Date_of_Development = new Date(req.body.Estimated_completion_Date_of_Development); }
    if (req.body.Customer_Sample_Receipt_Date) { req.body.Customer_Sample_Receipt_Date = new Date(req.body.Customer_Sample_Receipt_Date); }

    if (req.body.quantity_requirement.potential_month === null || req.body.quantity_requirement.potential_month === "" || req.body.quantity_requirement.potential_month === 0 || req.body.quantity_requirement.potential_month === "null") {
        req.body.quantity_requirement['40_potential'] = 0;
      }

    const customerDetails = await Customer.findById(currentLoggedUser, req.params.customerId);
    if (customerDetails[0].isDealer == "Yes") {
        const regionList = await Region.all(currentLoggedUser);
        regionList.forEach(region => {
            if (region._id == req.body.RBU) {
                    req.body.RBU = [ 
                        {
                            "_id" : region._id,
                            "region" : region.region,
                            "modified_At" : region.modified_At
                        }
                    ];
                }
          });
    }

    let item = req.body;
    let id = item._id;
    delete item._id;
    Model_cmr_Details.update(id, req.body, currentLoggedUser)
        .then((result) => {
            if (result == 1) {
                res.json({ message: '  successfully updated!', status: 200, 'opportunity_id': id });
            } else {
                ''
                res.json({ message: 'nothing to update. You have not changed any data!', status: 200 });
            }
        })
        .catch((e) => next(e));
};

const opportunityDetails = async (req, res, next) => {
 return BDandCustomer_details(req, res, next);
}
const BDandCustomer_details = async (req, res, next) => {
    const currentLoggedUser = await getCurrentUserInfo(req.headers.authorization);
    Customer.getBDandCustomerDetails(currentLoggedUser, req.params.customerId,req.params.opportunityId)
        .then((result) => {
            if (isEmpty(result)) {
                res.status(404).json({ message: 'Customer not exist!', code: 404 });
            } else {

                result.forEach(element => {
                    if (element.targets) sortByKey(element.targets, 'created_at');
                    if (element.quotes) sortByKey(element.quotes, 'created_at');

                    if (!element.bd_activated) {
                        element.bd_activated = 0;
                    }

                    if (element.bd_stage) {
                        element.bd_stage.color_code = bd_stage_color(element.bd_stage);
                    }


                    if (!isEmpty(element.linked_contacts)) {
                        let indexstoRemove = [];
                        element.linked_contacts = element.linked_contact_details;

                    }

                    if (!isEmpty(element.linked_staff)) {
                        element.linked_staff.forEach(staff => {
                            const SingleStaff = element.linked_staff_details.find(staffDetails => {
                                return JSON.stringify(staff.staffId) == JSON.stringify(staffDetails._id);
                            });
                            if (SingleStaff) {
                                staff.staff_name = SingleStaff.first_name + ' ' + SingleStaff.last_name;
                                staff.staff_email = SingleStaff.email;
                                staff.staff_phone = SingleStaff.phone;
                                staff.staff_address = SingleStaff.address;
                                staff.staff_role_access_reports_mapping = SingleStaff.role_access_reports_mapping;
                                staff.staff_zone = SingleStaff.zone;
                                staff.staff_city = SingleStaff.city;
                            }

                            if (!isEmpty(staff.staff_role_access_reports_mapping)) {
                                let tempRole = []; // sending all role value together as per fronEnd developer request
                                let tempACL = [];// sending all access level value together as per fronEnd developer request
                                staff.staff_role_access_reports_mapping.forEach(eachRoleACL => {
                                    if (!isEmpty(element.linked_staff_role_details)) {
                                        const roleACL = element.linked_staff_role_details.find((roleDetails) => {
                                            return eachRoleACL.role == roleDetails._id;
                                        });
                                        if (roleACL) {
                                            eachRoleACL.role_name = roleACL.role;
                                            tempRole.push(roleACL.role); // sending all role value together as per fronEnd developer request
                                        }
                                    }

                                    if (!isEmpty(element.linked_staff_acl_details)) {
                                        const acl = element.linked_staff_acl_details.find((aclDetails) => {
                                            return eachRoleACL.access_level == aclDetails._id;
                                        });
                                        if (acl) {
                                            eachRoleACL.access_level_name = acl.access_level;
                                            tempACL.push(acl.access_level); // sending all acces level value together as per fronEnd developer request
                                        }
                                    }

                                    delete eachRoleACL.reports_to, delete eachRoleACL.role, delete eachRoleACL.access_level;
                                });
                                staff.staff_roles = tempRole; // sending all role value together as per fronEnd developer request
                                staff.staff_access_level = tempACL; // sending all acces level value together as per fronEnd developer request

                            }


                            if (!isEmpty(staff.staff_zone)) {
                                let zoneNames = [];
                                staff.staff_zone.forEach(eachZone => {
                                    const zones = element.linked_staff_zone_details.find((zoneDetails) => {
                                        return JSON.stringify(eachZone) == JSON.stringify(zoneDetails._id);
                                    });
                                    if (zones) { zoneNames.push(zones.zone); }
                                });
                                staff.staff_zone = zoneNames;
                            }
                        });
                    }



                    // if (!isEmpty(element.createdBy_details)) element.created_by = element.createdBy_details[0].first_name;

                    if (!isEmpty(element.targets)) {
                        element.targets.forEach(target => {
                            target.start_date = target.start_date != '' ? ConvertDate.getStringFormat(target.start_date) : '';
                            target.end_date = target.end_date != '' ? ConvertDate.getStringFormat(target.end_date) : '';
                            target.created_at = ConvertDate.getStringFormat(target.created_at);
                        });
                    }

                    if (!isEmpty(element.quotes)) {
                        element.quotes.forEach(quote => {
                            if (!isEmpty(element.quotes_file_details)) {
                                if (!isEmpty(quote.files)) {
                                    let uploadedFiles = [];
                                    quote.files.forEach(eachFile => {
                                        const file_details = element.quotes_file_details.find((fileDetails) => {
                                            return JSON.stringify(eachFile) == JSON.stringify(fileDetails._id);
                                        });
                                        if (file_details) {
                                            uploadedFiles.push({ id: eachFile, file_name: file_details.file_name, url: Config.imageURL + eachFile });
                                        }
                                    });
                                    quote.files = uploadedFiles;
                                }
                            }
                            quote.created_at = ConvertDate.getStringFormat(quote.created_at);
                        });
                    }

                    if (!isEmpty(element.linked_market_info_details)) {
                        element.linked_market_info_details.forEach(ele => {
                            ele.marketId = ele._id;
                        });
                        element.linked_marketInfo = element.linked_market_info_details;
                    }

                    if (!isEmpty(element.linked_customer_quantity_requirements_details)) {
                        element.linked_customer_quantity_requirements = element.linked_customer_quantity_requirements_details;
                    }

                    if (!isEmpty(element.linked_customer_input_materials_details)) {
                        element.linked_customer_input_materials_details.forEach(ele => {
                            ele.input_materialId = ele._id;
                        });
                        element.linked_customer_input_materials = element.linked_customer_input_materials_details;
                    }

                    if (!isEmpty(element.linked_customer_procurement_cycle_details)) {
                        element.linked_customer_procurement_cycle_details.forEach(ele => {
                            ele.procurement_cycleId = ele._id;
                        });
                        element.linked_customer_procurement_cycle = element.linked_customer_procurement_cycle_details;
                    }

                    if (!isEmpty(element.linked_customer_sample_order_details)) {
                        element.linked_customer_sample_order_details.forEach(ele => {
                            ele.sample_order_Id = ele._id;
                        });
                        element.linked_customer_sample_order = element.linked_customer_sample_order_details;
                    }

                    if (!isEmpty(element.linked_customer_machinery_details_data)) {
                        element.linked_customer_machinery_details_data.forEach(ele => {
                            ele.machinery_detailsId = ele._id;
                        });
                        element.linked_customer_machinery_details = element.linked_customer_machinery_details_data;
                    }

                    if (!isEmpty(element.linked_cmr_details) && !isEmpty(element.linked_cmr_details[0].sales_quote_request)) {
                        if (!isValidDate(element.linked_cmr_details[0].sales_quote_request.quote_date) && !isValidDate(element.linked_cmr_details[0].sales_quote_request.quote_expiry_date)) {
                            element.linked_cmr_details[0].sales_quote_request.quote_no = "";
                            element.linked_cmr_details[0].sales_quote_request.cal_selling_price = "";
                            element.linked_cmr_details[0].sales_quote_request.quote_date = "";
                            element.linked_cmr_details[0].sales_quote_request.quote_expiry_date = "";
                        }
                    }

                    delete element.createdBy_details, delete element.quotes_file_details;
                    delete element.state_details;
                    delete element.region_details, delete element.area_details, delete element.zone_details;
                    delete element.linked_staff_details, delete element.linked_contact_details;
                    delete element.linked_staff_role_details, delete element.linked_staff_acl_details;
                    delete element.business_category_details, delete element.linked_staff_zone_details;
                    delete element.business_division_details, delete element.business_group_details;

                    delete element.linked_market_info_details;
                    delete element.linked_customer_quantity_requirements_details;
                    delete element.linked_customer_input_materials_details;
                    delete element.linked_customer_procurement_cycle_details;
                    delete element.linked_customer_machinery_details_data;
                    delete element.linked_cmr_details_data;
                    delete element.linked_customer_sample_order_details;
                    delete element.linked_customer_materials_details;

                });

                res.json(result, 200, next);
            }
        })
        .catch((e) => next(e));
};

const viewSingleCMR = async (req, res, next) => {
    try {
        const result = await Customer.viewSingleCMR(req.params.cmrId)
        if (isEmpty(result)) {
            res.status(404).json({ message: 'CMR not exist!', code: 404 });
        } else {
            res.json(result);
        }
    } catch (error) {
        next(error)
    }
};

const updateSingleCMR = (req, res, next) => {
    Customer.updateSingleCMR(req.params.cmrId, req.body)
        .then((result) => {
            if (isEmpty(result)) {
                res.status(404).json({ message: 'CMR not exist!', code: 404 });
            } else {
                res.json({ message: 'cmr updated!', result: result });
            }
        })
        .catch((e) => next(e));
};

const listBDstages = async (req, res, next) => {
    try {
        const resp = await Customer.listBDstages();
        resp.forEach(element => {
            element.color_code = bd_stage_color(element._id);
        });
        res.json(resp);
    } catch (error) {
        next(error);
    }
};


const canApproveCMR = (id, currentLoggedUser) => {
    return new Promise((resolve, reject) => {
        Customer.viewSingleCMR(id).then(CMRDetails => {
            if (CMRDetails && CMRDetails.length > 0) {
                let CMRData = CMRDetails[0];
                if (!CMRData.approvals) {
                    CMRData.approvals = [];
                }
                let approvalStage = CMRData.approvalStage;
                if (!approvalStage) {
                    approvalStage = 0;
                }
                /* if (CMRData.approvals.length > 0) {
                    if (currentLoggedUser.group && approvalStage == 1 && (JSON.stringify(currentLoggedUser._id) != JSON.stringify(CMRData.created_by)) &&
                        (currentLoggedUser.group.indexOf("rbm") != -1 || currentLoggedUser.group.indexOf("area_manager") != -1 || currentLoggedUser.group.indexOf("technical_service") != -1)) {
                        resolve({ canApprove: true, status: 2, message: "stage" + (approvalStage + 1) + " pending", results: CMRData.approvals, CMRData });
                    } else if (currentLoggedUser.group && approvalStage == 2 && (JSON.stringify(currentLoggedUser._id) != JSON.stringify(CMRData.created_by)) &&
                        (currentLoggedUser.group.indexOf("rbm") != -1 || currentLoggedUser.group.indexOf("technical_service") != -1)) {
                        resolve({ canApprove: true, status: 2, message: "stage" + (approvalStage + 1) + " pending", results: CMRData.approvals, CMRData });
                    } else if (currentLoggedUser.group && approvalStage == 3 && (currentLoggedUser.group.indexOf("technical_service") != -1)) {
                        resolve({ canApprove: true, status: 2, message: "stage" + (approvalStage + 1) + " pending", results: CMRData.approvals, CMRData });
                    } else {
                        resolve({ canApprove: false, status: 2, message: "Aready Approved", results: CMRData.approvals, CMRData });
                    }
                } else {
                    if (currentLoggedUser.group && (JSON.stringify(currentLoggedUser._id) != JSON.stringify(CMRData.created_by)) &&
                        (currentLoggedUser.group.indexOf("rbm") != -1 || currentLoggedUser.group.indexOf("area_manager") != -1
                            || currentLoggedUser.group.indexOf("technical_service") != -1)) {
                        resolve({ canApprove: true, status: 2, message: "stage" + (approvalStage + 1) + " pending", results: CMRData.approvals, CMRData });
                    } else {
                        resolve({ canApprove: false, status: 1, message: "Approval Pending", results: CMRData.approvals, CMRData });
                    }
                } */

                if (CMRData.approvals.length > 0) {
                    if (currentLoggedUser.group && approvalStage == 1 && (JSON.stringify(currentLoggedUser._id) != JSON.stringify(CMRData.created_by)) &&
                        (currentLoggedUser.group.indexOf("rbm") != -1 || currentLoggedUser.group.indexOf("area_manager") != -1)) {
                        resolve({ canApprove: true, status: 2, message: "stage" + (approvalStage + 1) + " pending", results: CMRData.approvals, CMRData });
                    } else if (currentLoggedUser.group && approvalStage == 2 && (JSON.stringify(currentLoggedUser._id) != JSON.stringify(CMRData.created_by)) &&
                        (currentLoggedUser.group.indexOf("rbm") != -1)) {
                        resolve({ canApprove: true, status: 2, message: "stage" + (approvalStage + 1) + " pending", results: CMRData.approvals, CMRData });
                    } else if (currentLoggedUser.group && (currentLoggedUser.group.indexOf("cmr_approver") != -1)) {
                        resolve({ canApprove: true, status: 2, message: "stage" + (approvalStage + 1) + " pending", results: CMRData.approvals, CMRData });
                    } else if (currentLoggedUser.group && approvalStage > 3 && (currentLoggedUser.group.indexOf("cmr_approver") != -1)) {
                        resolve({ canApprove: false, status: 2, message: "stage" + (approvalStage + 1) + " pending", results: CMRData.approvals, CMRData });
                    } else {
                        resolve({ canApprove: false, status: 2, message: "Aready Approved", results: CMRData.approvals, CMRData });
                    }
                } else {
                    if (currentLoggedUser.group && (JSON.stringify(currentLoggedUser._id) != JSON.stringify(CMRData.created_by)) &&
                        (currentLoggedUser.group.indexOf("rbm") != -1 || currentLoggedUser.group.indexOf("area_manager") != -1)) {
                        resolve({ canApprove: true, status: 2, message: "stage" + (approvalStage + 1) + " pending", results: CMRData.approvals, CMRData });
                    } else {
                        resolve({ canApprove: false, status: 1, message: "Approval Pending", results: CMRData.approvals, CMRData });
                    }
                }

            } else {
                resolve({ canApprove: false, status: 500, message: "not found" });
            }
        });
    });
};

const canApprove = (req, res, next) => {
    const id = req.params.id;
    getCurrentUserInfo(req.headers.authorization).then((currentLoggedUser) => {
        canApproveCMR(id, currentLoggedUser).then(data => {
            res.json(data);
        }, err => {
            next(err);
        });
    }).catch((e) => {
        res.send(e);
    });
};

const getRole = (currentLoggedUser) => {
    let role;
    if (currentLoggedUser.group && (currentLoggedUser.group.indexOf("cmr_approver") != -1)) {
        role = "cmr_approver";
    } else if (currentLoggedUser.group && (currentLoggedUser.group.indexOf("rbm") != -1)) {
        role = "rbm";
    } else if (currentLoggedUser.group && (currentLoggedUser.group.indexOf("area_manager") != -1)) {
        role = 'area_manager';
    } else {
    }
    return role;
}

// 0 - not sent for approval
// 1 - sent for approval
// 2 - AM approved
// 3 - rbm approved
// 4 - tech service approved 

const approveOrReject = async (req, res, next) => {
    let body = req.body;
    let sendForApproval = body.sendForApproval;
    getCurrentUserInfo(req.headers.authorization).then((currentLoggedUser) => {

        const id = req.params.id;
        console.log('approveOrReject', id, ' : ', body);
        canApproveCMR(id, currentLoggedUser).then(data => {
            console.log('crm data: ', data.CMRData.approvals);

            let approverIds = [];
            for (const iterator of data.CMRData.approvals) {
                approverIds.push(ObjectId(iterator.approver_id));
            }
            const prevApprovers = approverIds;
            let CMRData = data.CMRData;
            if (data && (data.canApprove || sendForApproval)) {
                if (!CMRData.approvals) {
                    CMRData.approvals = [];
                }
                if (!CMRData.approvalStage) {
                    CMRData.approvalStage = 0;
                }
                let role = getRole(currentLoggedUser);
                body.role = role;

                CMRData.approvals.push(body);
                let updateData = { approvals: CMRData.approvals };

                if (sendForApproval) {
                    // if (currentLoggedUser.group && (currentLoggedUser.group.indexOf("technical_service") != -1)) {
                    if (currentLoggedUser.group && (currentLoggedUser.group.indexOf("cmr_approver") != -1)) {
                        CMRData.approvalStage = 4;
                    } else if (currentLoggedUser.group && (currentLoggedUser.group.indexOf("rbm") != -1)) {
                        CMRData.approvalStage = 3;
                    } else if (currentLoggedUser.group && (currentLoggedUser.group.indexOf("area_manager") != -1)) {
                        CMRData.approvalStage = 2;
                    } else {
                        CMRData.approvalStage = 1;
                    }
                    updateData.approvalStage = CMRData.approvalStage;
                } else if (body.status == 'Approved') {
                    // if (currentLoggedUser.group && (currentLoggedUser.group.indexOf("technical_service") != -1)) {
                    if (currentLoggedUser.group && (currentLoggedUser.group.indexOf("cmr_approver") != -1)) {
                        CMRData.approvalStage = 4;
                    } else if (currentLoggedUser.group && (currentLoggedUser.group.indexOf("rbm") != -1)) {
                        CMRData.approvalStage = 3;
                    } else if (currentLoggedUser.group && (currentLoggedUser.group.indexOf("area_manager") != -1)) {
                        CMRData.approvalStage = 2;
                    }
                    updateData.approvalStage = CMRData.approvalStage;
                } else {
                    // updateData.CMR_Status = 1;
                    updateData.CMR_Status = 2; // set status as rejected by approver
                    updateData.approvalStage = 0;
                }
                if (updateData.approvalStage == 0) {
                    updateData.Approved_By = '';
                    updateData.Tech_approved_by = '';
                    updateData.Approved_Date = null;
                }
                if (CMRData.approvalStage == 2 && (body.status !== 'rejected')) {
                    updateData.Approved_By = currentLoggedUser.emp_code; // body.approver_name;
                    updateData.Approved_Date = new Date(); // new Date(body.approver_date);
                    updateData.CMR_Status = 1;
                }
                else if (CMRData.approvalStage == 3 && (body.status !== 'rejected')) {
                    updateData.Reviewed_By = currentLoggedUser.emp_code; // body.approver_name;
                    updateData.Reviewed_Date = new Date(); // new Date(body.approver_date);
                    updateData.CMR_Status = 1;
                }
                else if (CMRData.approvalStage == 4 && (body.status !== 'rejected')) {
                    updateData.Tech_approved_by = body.approver_name;
                    updateData.Approved_Date = new Date(); // new Date(body.approver_date);
                    updateData.CMR_Status = 3;
                    updateData.crm_sync = 1;
                    updateData.bd_flow_id = 6;
                    updateData.opportunityStage = "s4";
                    updateData.bd_activity = [
                        {
                            opportunityStage: 's3',
                            moved_from: "s3",
                            moved_to: body.opportunityStage,
                            moved_date: new Date(),
                        }
                    ];
                }
                console.log("CMRData ", updateData);
                Model_cmr_Details.update(id, updateData, currentLoggedUser).then((result) => {
                    if (result == 1) {
                        res.status(200).json({ message: 'CMR successffully updated!', status: 200, approvalStage: CMRData.approvalStage });

                        req.body.approvalStage = updateData.approvalStage;
                        req.body.customer_category = CMRData.Customer_Category;
                        req.body.CMRcreated_by = CMRData.created_by;
                        req.body.prevApprovers = prevApprovers;
                        req.body.CRM_CMR_No = CMRData.CRM_CMR_No;
                        req.body._id = id;

                        audit({
                            module: Modules().customer,
                            subModule: Modules().cmr,
                            action: req.body.status == 'rejected' ? auditActions().reject : auditActions().approve,
                            documentId: ObjectId(CMRData.customer_id),
                            userId: ObjectId(currentLoggedUser._id),
                            data: req.body,
                            // message: body.status  + ' the cmr',
                            message: sendForApproval ? `Sent a ${CMRData.CRM_CMR_No} for approval` : body.status == 'rejected' ? `Rejected the ${CMRData.CRM_CMR_No}` : `Approved the ${CMRData.CRM_CMR_No}`,
                            date: new Date()
                        });
                    } else if (result == 0) {
                        res.status(200).json({ message: 'nothing to update. please check the data.', status: 200 });
                    }
                }).catch(err => {
                    console.log("err1", err);
                    next(err);
                });
            } else {
                res.status(200).json(data);
            }
        }).catch(err => {
            console.log('err2', err);
            next(err);
        });
    });
};

const listCustomerCategory = (req, res, next) => {
    Customer.listCustomerCategory()
        .then((result) => {
            if (isEmpty(result)) {
                res.status(404).json({ message: 'No data found', status: 404 });
            } else {
                res.json(result, 200, next);
            }
        })
        .catch((e) => next(e));
};
const listAllOpportunities = async (req, res, next) => {
    try {
        let params = req.body;
        console.log("params", params);
        const currentLoggedUser = await getCurrentUserInfo(req.headers.authorization);

        const result = await Customer.allOpportunities(currentLoggedUser, null, params);
        if (isEmpty(result[0].data)) {
            HelperService.sendDataNotFound(res);
        } else {
            let response = {
                data: result[0].data,
                total: result[0].totalCount.length > 0 ? result[0].totalCount[0].count : 0,
            }
            res.json(response, 200, next);
        }
    } catch (error) {
        next(error);
    }
};
const distinctCMRList = async (req, res, next) => {
    let params = req.params;
    console.log("params", params);
    const result = await Customer.distinctCMRList(params.type)

    res.json(result, 200, next);
}
const cmrPorential = async (req, res, next) => {
    let params = req.params;
    let filters = req.body;
    console.log("params", params,filters);
    const result = await Customer.cmrPorential(filters)

    res.json(result, 200, next);
}
const customerPotential = async (req, res, next) => {
    let params = req.params;
    let filters = req.body;
    console.log("params", params,filters);
    const result = await Customer.customerPotential(filters)

    res.json(result, 200, next);
}

const updateStaffResponsibilityMatrix = async (req, res, next) => {
    try {
        const result = await Customer.updateResponsibilityMatrix(req.body);
        let message = "No records are avilable for update."
        console.log("result: ", result);
        if (result.modifiedCount > 0) {
            message = result.modifiedCount + " records have been updated successfully."
        }
        res.json({message}, 200, next);
    } catch (error) {
        next(error);
    }
};

function isValidDate(dateString) {
    const date = new Date(dateString);
    return date.getFullYear() > 1900;
}

module.exports = {
    listAll,
    listBDactivity,
    listCMR,
    CMRlist,
    CMR_AwaitingApproval,
    listCustomersToLink,
    filter,
    customerDetails,
    BDandCustomer_details,
    viewSingleCMR,
    updateSingleCMR,
    create,
    update,
    linkContacts,
    unLinkContacts,
    linkStaff,
    unLinkStaff,
    addNotes,
    addNotesOnCMR,
    addTargets,
    updateTargets,
    deleteTargets,
    createQuotes,
    deleteCustomer,
    addLinkedCustomer,
    addLinkedMarketInfo,
    updateLinkedMarketInfo,
    addLinked_Customer_Quantity_Requirement,
    updateLinked_Customer_Quantity_Requirement,
    addLinked_Customer_Input_Material_Details,
    updateLinked_Customer_Input_Material_Details,
    addLinked_Customer_Material_Details,
    updateLinked_Customer_Material_Details,
    addLinked_Customer_Procurement_Cycle,
    updateLinked_Customer_Procurement_Cycle,
    addLinked_Customer_Machinery_Details,
    updateLinked_Customer_Machinery_Details,
    addLinked_cmr_Details,
    updateLinked_cmr_Details,
    listBDstages,
    addLinked_customer_sample_order,
    updateLinked_customer_sample_order,
    canApprove,
    approveOrReject,
    listCustomerCategory,
    listAllOpportunities,
    distinctCMRList,
    cmrPorential,
    customerPotential,
    opportunityDetails,
    updateStaffResponsibilityMatrix
};

