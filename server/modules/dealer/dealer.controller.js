//@ts-check
const { isEmpty, head } = require('lodash');
const ObjectId = require('mongodb').ObjectID;
const Model = require('./dealer.model');
const { getCurrentUserInfo } = require('../shared/shared.controller');
const { Modules } = require('../shared/shared.model');
const Notes = require('../notes/notes.model.js');
const Config = require('../../config/config');

const listAll = async (req, res, next) => {
     const currentLoggedUser = await getCurrentUserInfo(req.headers.authorization)
    try {
        const loggedUser = await getCurrentUserInfo(req.headers.authorization)
        const result = await Model.listAll(loggedUser, req.body);
        if (isEmpty(result[0].data)) {
            res.status(404).json({ message: 'No data found', status: 404 });
        } else {
            let response = {
                data: result[0].data,
                total: result[0].totalCount.length > 0 ? result[0].totalCount[0].count : 0
            }
            res.json(response, 200, next);
        }
    } catch (error) {
        next(error)
    }
};

const Details = async (req, res, next) => {
    try {
        const loggedUser = await getCurrentUserInfo(req.headers.authorization)
        const id = req.params.id;
        const result = await Model.details(loggedUser, id);
        if (isEmpty(result)) {
            res.status(404).json({ message: 'No data found', status: 404 });
        } else {
            res.json(result[0], 200, next);
        }
    } catch (error) {
        next(error)
    }
};



const create = async (req, res, next) => {
    try {
        const loggedUser = await getCurrentUserInfo(req.headers.authorization)
        const result = await Model.create(req.body, loggedUser);
        res.json({ message: 'successfully created!', status: 200, data: result });
    } catch (error) {
        next(error)
    }
};

/**
 * @param {{ headers: { authorization: any; }; params: { id: any; }; body: any; }} req
 * @param {{ status: (arg0: number) => { (): any; new (): any; json: { (arg0: { message: string; status: number; }): void; new (): any; }; }; json: (arg0: { message: string; status: number; data: number; }) => void; }} res
 * @param {(arg0: any) => void} next
 */
const update = async (req, res, next) => {
    try {
        const loggedUser = await getCurrentUserInfo(req.headers.authorization)
        const result = await Model.update(req.params.id, req.body, loggedUser);
        if (result === 0) {
            res.status(409).json({ message: 'update failed', status: 409 });
        } else {
            res.json({ message: 'update successful', status: 200, data: result });
        }
    } catch (error) {
        next(error)
    }
};

/**
 * 
 * @param {{headers:any;params:any;body:any}} req 
 * @param {*} res 
 * @param {*} next 
 */
const Delete = async (req, res, next) => {
    try {
        const loggedUser = await getCurrentUserInfo(req.headers.authorization)
        const result = await Model.delete(req.params.id, loggedUser);
        if (result === 0) {
            res.status(409).json({ message: 'delete failed', status: 409 });
        } else {
            res.json({ message: 'delete successfull', status: 200, data: result });
        }
    } catch (error) {
        next(error)
    }
};

/**
 * @param {{ headers: { authorization: any; }; params: { id: any; }; body: { files: any[]; tagged_users: any[]; userId: any; date: Date; }; }} req
 * @param {{ json: (arg0: any) => void; }} res
 * @param {(arg0: any) => void} next
 */
const addNotes = async (req, res, next) => {
    try {
        const currentLoggedUser = await getCurrentUserInfo(req.headers.authorization)
        const id = req.params.id;

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

        const result = await Notes.addNotes(id, req.body, currentLoggedUser, Modules().dealer)
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

    } catch (error) {
        next(error)
    }
};

module.exports = {
    listAll,
    Details,
    create,
    update,
    Delete,
    addNotes,
};