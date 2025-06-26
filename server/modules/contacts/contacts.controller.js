//@ts-check
const { isEmpty, head, first, isArray } = require('lodash');
const ObjectId = require('mongodb').ObjectID;
const jwt = require('jsonwebtoken');
const moment = require('moment');
const PubSub = require('pubsub-js');

const Config = require('../../config/config');
const Contacts = require('../contacts/contacts.model.js');
const Audit = require('../audit/audit.model.js');
const Notes = require('../notes/notes.model.js');
const Tasks = require('../schedule/schedule.model.js');
const { getCurrentUserInfo } = require('../shared/shared.controller');
const { Modules } = require('../shared/shared.model');



const audit = (body) => { Audit.addLog(body); };

const addNote = (module, documentId, notes, user) => {

    if (isEmpty(notes) || !notes) { notes = []; } else {
        notes = [{
            data: notes,
            userId: ObjectId(user),
            date: new Date()
        }];
    }
    const body = {
        module: module,
        documentId: documentId,
        notes: notes
    };
    Notes.create(body);
};

const listAll = async (req, res, next) => {
    try {
        let body = req.body;
        const currentLoggedUser = await getCurrentUserInfo(req.headers.authorization);
        const result = await Contacts.all(currentLoggedUser, null, body);
        if (isEmpty(result)) { res.status(404).json({ message: 'No data found', status: 404 }); } else {
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

const listContactsToLink = async (req, res, next) => {
    try {
        const result = await Contacts.listContactsToLink(req.body.customerId);
        if (isEmpty(result)) {
            res.status(404).json({ message: 'No data found', status: 404 });
        } else {
            res.json(result, 200, next);
        }
    } catch (error) {
        next(error);
    }
};

const filter = async (req, res, next) => {
    try {
        const response = await Contacts.filter(req.query)
        if (isEmpty(response)) { res.status(404).json({ message: 'no records found!', status: 404 }); } else {
            res.json(response, 200, next);
        }
    } catch (error) {
        next(error)
    }
};

const contactDetails = async (req, res, next) => {
    try {
        const result = await Contacts.findById(req.params.id)
        result.forEach(element => {

            if (!isEmpty(element.region_details)) {
                let regions = [];
                element.region_details.forEach(region => {
                    element.contact_region.forEach(elementRegion => {
                        if (JSON.stringify(elementRegion) === JSON.stringify(region._id)) {
                            regions.push({ id: elementRegion, region_name: region.region });
                        }
                    });
                });
                element.contact_region = regions;
            }

            if (!isEmpty(element.area_details)) {
                let areas = [];
                element.area_details.forEach(area => {
                    element.contact_area.forEach(elementArea => {
                        if (JSON.stringify(elementArea) === JSON.stringify(area._id)) {
                            areas.push({ id: elementArea, area_name: area.area });
                        }
                    });

                });
                element.contact_area = areas;
            }

            if (!isEmpty(element.zone_details)) {
                let zones = [];
                element.zone_details.forEach(zone => {
                    element.contact_zone.forEach(elementZone => {
                        if (JSON.stringify(elementZone) === JSON.stringify(zone._id)) {
                            zones.push({ id: elementZone, zone_name: zone.zone });
                        }
                    });

                });
                element.contact_zone = zones;
            }


            if (!isEmpty(element.state_details)) element.contact_state_name = element.state_details[0].state;

            if (!isEmpty(element.createdBy_details)) element.created_by = element.createdBy_details[0].first_name;

            delete element.createdBy_details;
            delete element.state_details, delete element.assignee_details;
            delete element.region_details, delete element.area_details, delete element.zone_details;
            delete element.linked_customers_bc_details, delete element.linked_customers_zone_details;
        });
        res.json(result, 200, next);
    } catch (error) {
        next(error);
    }
};

const create = async (req, res, next) => {
    try {
        const currentLoggedUser = await getCurrentUserInfo(req.headers.authorization)

        if (req.body.contact_state && ObjectId.isValid(req.body.contact_state)) {
            req.body.contact_state = ObjectId(req.body.contact_state);
        }

        if (req.body.contact_region) {
            let selectedRegion = [];
            req.body.contact_region.forEach(element => { selectedRegion.push(ObjectId(element)); });
            req.body.contact_region = selectedRegion;
        } else {
            req.body.contact_region = [];
        }

        if (req.body.contact_area) {
            let selectedArea = [];
            req.body.contact_area.forEach(element => { selectedArea.push(ObjectId(element)); });
            req.body.contact_area = selectedArea;
        } else {
            req.body.contact_area = [];
        }

        if (req.body.contact_zone) {
            let selectedZone = [];
            req.body.contact_zone.forEach(element => { selectedZone.push(ObjectId(element)); });
            req.body.contact_zone = selectedZone;
        } else {
            req.body.contact_zone = [];
        }

        req.body.created_by = ObjectId(currentLoggedUser._id);
        req.body.created_at = new Date();
        req.body.modified_At = new Date();

        if (req.body._id) {
            req.body.offlineSyncId = req.body._id
            delete req.body._id
        }
        const result = await Contacts.create(req.body, currentLoggedUser)
        PubSub.publishSync('DBUpdates', { change: 'contacts', data: result[0] });
        if (req.body.offlineSyncId) {
            const deleteDupData = {
                delete: true,
                deleted: 1,
                _id: req.body.offlineSyncId
            }
            PubSub.publishSync('DBDelete', { change: 'contacts', data: deleteDupData });
        }
        res.status(200).json({ message: 'Contact successffully created!', status: 200, contactId: first(result)._id });
        return addNote(Modules().contact, head(result)._id, head(result).notes, currentLoggedUser._id), audit({
            module: Modules().contact, // todo: send moduleId
            action: 'create', // todo: send featureId
            documentId: head(result)._id, // createdLead[0]._id,
            userId: ObjectId(currentLoggedUser._id),
            data: result,
            message: 'created the contact',
            date: new Date()
        });
    } catch (error) {
        next(error)
    }
};

const update = async (req, res, next) => {
    try {
        const currentLoggedUser = await getCurrentUserInfo(req.headers.authorization)
        const id = req.params.id;

        // if (req.body.contact_state) { req.body.contact_state = ObjectId(req.body.contact_state); }
        if (req.body.contact_state && ObjectId.isValid(req.body.contact_state)) {
            req.body.contact_state = ObjectId(req.body.contact_state);
        }

        if (req.body.contact_region) {
            let selectedRegion = [];
            req.body.contact_region.forEach(element => { selectedRegion.push(ObjectId(element)); });
            req.body.contact_region = selectedRegion;
        }

        if (req.body.contact_area) {
            let selectedArea = [];
            req.body.contact_area.forEach(element => { selectedArea.push(ObjectId(element)); });
            req.body.contact_area = selectedArea;
        }

        if (req.body.contact_zone) {
            let selectedZone = [];
            req.body.contact_zone.forEach(element => { selectedZone.push(ObjectId(element)); });
            req.body.contact_zone = selectedZone;
        }
        req.body.modified_At = new Date();
        delete req.body.created_by, delete req.body.created_at;
        const result = await Contacts.update(id, req.body, currentLoggedUser)
        if (result == 1) {
            res.status(200).json({ message: 'Contact successffully updated!', status: 200 });
            audit({
                module: Modules().contact,
                action: 'update',
                documentId: ObjectId(id),
                userId: ObjectId(currentLoggedUser._id),
                data: req.body,
                message: 'updated the contact',
                date: new Date()
            });
        } else if (result == 0) {
            res.status(200).json({ message: 'nothing to update. nothing has been chenged. please check the data and contactId', status: 200 });
        }
    } catch (error) {
        next(error)
    }
};

const addNotes = (req, res, next) => {
    getCurrentUserInfo(req.headers.authorization).then((currentLoggedUser) => {
        const id = req.params.contactId;


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
        Notes.addNotes(id, req.body, currentLoggedUser, Modules().contact)
            .then((result) => {
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
            }).catch((e) => next(e));
    }).catch((e) => next(e));
};

const deleteContact = async (req, res, next) => {
    try {
        const currentLoggedUser = await getCurrentUserInfo(req.headers.authorization)
        const id = req.params.id;
        const result = await Contacts.deleteById(id, currentLoggedUser)
        if (result == 1) {
            res.status(200).json({ message: 'Contact deleted successfully!', status: 200 });
            const deleteDupData = {
                delete: true,
                _id: req.body.id
            }
            PubSub.publishSync('DBDelete', { change: 'contacts', data: deleteDupData });
        } else {
            res.json({ message: 'Contact not deleted!' });
        }
    } catch (error) {
        next(error)
    }
};

const linkCustomers = async (req, res, next) => {
    try {
        const currentLoggedUser = await getCurrentUserInfo(req.headers.authorization)
        const contactId = req.params.contactId;

        let reqBody = [];
        if (!isEmpty(req.body.customerId)) {
            req.body.customerId.forEach(element => {
                reqBody.push(ObjectId(element));
            });
        } else {
            res.status(400).json({ message: 'customerId requires', status: 400 });
        }
        req.body = reqBody;
        const result = await Contacts.linkCustomers(contactId, req.body, currentLoggedUser)
        if (result == 1) {
            res.json({ message: 'customer successfully linked!', status: 200 });
        } else {
            res.json({ message: 'not linked successfully', status: 500 });
        }
    } catch (error) {
        next(error)
    }
};

module.exports = {
    listAll,
    listContactsToLink,
    filter,
    contactDetails,
    create,
    update,
    addNotes,
    deleteContact,
    linkCustomers
};