const { isEmpty, } = require('lodash');

const group = require('../group/group.model.js');
const { getCurrentUserInfo } = require('../shared/shared.controller');

const listGroups = async (req, res, next) => {
    try {
        const result = await group.listGroups()
        if (isEmpty(result)) { res.status(404).json({ message: 'No data found', status: 404 }); } else {
            result.forEach(element => {
                if (!isEmpty(element.permission_details)) {
                    let permission = [];
                    element.permission_details.forEach(perm => {
                        permission.push(perm.module + '_' + perm.name);
                    });
                    element.permissions = permission;
                }
                delete element.permission_details;
            });
            res.json(result, 200, next);
        }
    } catch (error) {
        next(error)
    }
};

const listPermissions = async (req, res, next) => {
    try {
        const result = await group.listPermissions()
        if (isEmpty(result)) {
            res.status(404).json({ message: 'No data found', status: 404 });
        } else {
            result.forEach(element => {
                if (!isEmpty(element.permission_details)) {
                    let permission = [];
                    element.permission_details.forEach(perm => {
                        permission.push(perm.name + '_' + perm.module);
                    });
                    element.permissions = permission;
                }
                delete element.permission_details;
            });
            res.json(result, 200, next);
        }
    } catch (error) {
        next(error)
    }
};

const getPermissions = async (req, res, next) => {
    try {
        let userId = req.body.userId;
        let module = req.body.module;
        const CurrentUserInfo = await getCurrentUserInfo(req.headers.authorization)
        const result = await group.getPermissions(CurrentUserInfo, userId, module)
        if (isEmpty(result)) {
            res.status(404).json({ message: 'No data found', status: 404 });
        } else {
            res.json(result, 200, next);
        }
    } catch (error) {
        next(error)
    }
};

const groupDetails = async (req, res, next) => {
    try {
        const key = req.params.key;
        const result = await group.groupDetails(key)
        if (isEmpty(result)) {
            res.status(404).json({ message: 'No data found', status: 404 });
        } else {
            res.json(result[0], 200, next);
        }
    } catch (error) {
        next(error)
    }
};

const permissionDetails = async (req, res, next) => {
    try {
        const id = req.params.key;
        const result = await group.findById(id)
        if (isEmpty(result)) {
            res.status(404).json({ message: 'No data found', status: 404 });
        } else {
            res.json(result, 200, next);
        }
    } catch (error) {
        next(error)
    }
};


const createGroup = async (req, res, next) => {
    try {
        const CurrentUserInfo = await getCurrentUserInfo(req.headers.authorization)
        req.body.created_at = new Date();
        req.body.created_by = getCurrentUserInfo._id;
        const result = await group.createGroup(req.body, CurrentUserInfo);
        if (result === 0) {
            res.status(409).json({ message: 'already exist', status: 409 });
        } else {
            res.json({ message: 'group successfully created!', status: 200, data: result });
        }
    } catch (error) {
        next(error)
    }
};

const createPermission = async (req, res, next) => {
    getCurrentUserInfo(req.headers.authorization)
        .then((getCurrentUserInfo) => {
            return group.createPermission(req.body, getCurrentUserInfo);
        })
        .then((result) => {
            if (result === 0) {
                res.status(409).json({ message: 'already exist', status: 409 });
            } else {
                res.json({ message: 'permision successfully created!', status: 200, data: result });
            }
        })
        .catch((e) => next(e));
};

const updateGroup = async (req, res, next) => {
    try {
        const loggedUser = await getCurrentUserInfo(req.headers.authorization)
        const result = await group.updateGroup(req.params.id, req.body, loggedUser);
        if (result == 0) {
            res.status(409).json({ message: 'update failed', status: 409 });
        } else {
            res.json({ message: 'group successfully updated!', status: 200, data: result });
        }
    } catch (error) {
        next(error)
    }
};

const deleteGroup = async (req, res, next) => {
    await getCurrentUserInfo(req.headers.authorization)
        .then((getCurrentUserInfo) => {
            return group.updateGroup(req.params.id, req.body, getCurrentUserInfo);
        })
        .then((result) => {
            if (result === 0) {
                res.status(409).json({ message: 'update failed', status: 409 });
            } else {
                res.json({ message: 'group successfully updated!', status: 200, data: result });
            }
        })
        .catch((e) => next(e));
};

module.exports = {
    getPermissions,
    listGroups,
    groupDetails,
    permissionDetails,
    createGroup,
    createPermission,
    listPermissions,
    updateGroup
};