
// @ts-check
const database = require('./database');
const ObjectId = require('mongodb').ObjectID;
const { isArray, isEmpty, isUndefined } = require('lodash');

let db;
let roles;
let rolesTree;
let DefaultDataPermission;
let UsersDataPermission;
let regions;

database.getDb().then(res => { db = res; });

let checkLevel = function (level, val, gret) {
    let bval = false;
    if (level && level.length > 0) {
        for (let i = 0; i < level.length; i++) {
            //  console.log(" level.length", val, level[i], gret);
            if (gret && level[i] > val && level[i].length == (val.length + 1)) {
                bval = true;
            } else if (!gret && level[i] < val && level[i].length == (val.length + 1)) {
                bval = true;
            }
        }
    } else {
        return false;
    }
    return bval;
}


const getTopMostGroup = (groups) => {
    let min = groups[0].level[0];
    let data = groups[0].group;
    for (const group of groups) {
        if (group.level[0] < min) {
            min = group.level[0];
            data = group.group;
        }
    }
    return data;
};

const Acl = {
    allUsers: [],
    init: (db) => {
        Acl.setDefaultDataPermission(db);
        Acl.setUsersDataPermission(db);
        Acl.setRoles(db)
        Acl.setRegions(db)
    },

    setRoles(db) {
        roles = [];
        db.collection('group').aggregate([
            { $lookup: { from: 'permissions', localField: 'permissions', foreignField: '_id', as: 'permissions' } }
        ]).toArray(function (err, docs) {
            if (err) {
                roles = [];
            }
            else {
                roles = docs;
                if (roles && roles.length > 0) {
                    Acl.getChild(roles[0]);
                    rolesTree = roles[0];
                }
            }
            let viewroles = Acl.getViewRoles("area_manager");
        });
    },

    setDefaultDataPermission: async (db) => {
        let data = await db.collection('app_configuration').aggregate([]).toArray();
        DefaultDataPermission = data[0];
    },

    getDefaultDataPermission: async (module) => {
        return !isUndefined(DefaultDataPermission) ? DefaultDataPermission[module] : null;
    },

    setUsersDataPermission: async (database = db) => {
        let data = await database.collection('group').find({}, { key: 1, data_restrictions: 1, _id: 0 }).toArray();
        UsersDataPermission = data;
    },

    getUsersDataPermission: async (group, module) => {
        console.log('GROUP::getUsersDataPermission ', group);

        let HigherGroup;
        let GroupDetails = [];

        if (group && group.length > 0) {
            for (const eachgroup of group) {
                // console.log('ROLES: ', roles);

                roles.find((role) => {
                    if (role.key == eachgroup) {
                        // console.log('ROLE:: ', role);

                        GroupDetails.push({ group: eachgroup, level: role.level });
                    }
                });
            }
            if (GroupDetails && GroupDetails.length > 0) {
                HigherGroup = getTopMostGroup(GroupDetails);
            }
        }

        let data;
        for (const iterator of UsersDataPermission) {
            if (iterator.key == HigherGroup) {
                data = iterator;
                break;
            }
        }
        return !isUndefined(data) ? data.data_restrictions && data.data_restrictions[module] : null;
    },

    setRegions: async (db) => {
        try {
            let data = await db.collection('region').aggregate([]).toArray();
            this.regions = data;
        } catch (error) {
            throw new Error(error)
        }
    },

    getViewRoles: (roleName, viewRoles, skipCurrentRole) => {
        if (!viewRoles) {
            viewRoles = [];
        }
        if (roles && roles.length > 0) {
            // console.log('roles: ', roles);

            roles.forEach(role => {
                let key = role.key || role.name;
                if (key == roleName && viewRoles.indexOf(roleName) == -1) {
                    if(!skipCurrentRole)
                    {
                        viewRoles.push(roleName);
                    } 
                    if (role.child && role.child.length > 0) {
                        role.child.forEach(childRole => {
                            let key = childRole.key || childRole.name;
                            Acl.getViewRoles(key, viewRoles);
                        });
                    }
                }
            });
        }
        return viewRoles;
    }
    ,
    getUserViewRoles: (groups, skipCurrentRole) => {
        let viewRoles = [];
        if (groups) {
            groups.forEach(name => {
                Acl.getViewRoles(name, viewRoles, skipCurrentRole);
            });
        }
        return viewRoles;
    },
    getUserUnAvailableRoles: (groups, skipCurrentRole) => {
        let availableRoles = [];
        if (groups) {
            groups.forEach(name => {
                Acl.getViewRoles(name, availableRoles, skipCurrentRole);
            });
        }
        let unvAvailableRoles = [];
        roles.forEach(role => {
            if(availableRoles.indexOf(role.key)==-1){
                unvAvailableRoles.push(role.key);
            }
        })
        return unvAvailableRoles; 
    },
    getChild: (role) => {
        role.child = [];
        if (role.level && role.level.length > 0) {
            for (let i = 0; i < role.level.length; i++) {
                let min = role.level[i];
                let max = (parseInt(min) + 1) + "";
                if (roles && roles.length > 0) {
                    roles.forEach(role2 => {
                        if (checkLevel(role2.level, min, true) && checkLevel(role2.level, max, false)) {
                            let roleCopy = role2;
                            if (!roleCopy.parent) {
                                roleCopy.parent = [];
                            }
                            roleCopy.parent.push(role);

                            role.child.push(roleCopy);
                        }
                    });
                    if (role.child && role.child.length > 0) {
                        console.log('fn.getChild :: name ', role.name, role.child.length);
                        role.child.forEach(role3 => {
                            Acl.getChild(role3);
                        })
                    }
                }
            }
        }
    },

    getRolePermission: (roleName, moduleName, permissions, mode) => {
        if (!permissions) {
            permissions = [];
        }
        if (roles && roles.length > 0) {
            // console.log('roles: ', roles);

            roles.forEach(role => {
                let key = role.key || role.name;
                if (key == roleName) {
                    let permissions1 = role.permissions;
                    if (permissions1 && permissions1.length > 0) {
                        permissions1.forEach(per => {
                            let key2 = per.key || per.name;
                            key2 = roleName + "_" + key2 + "_" + per.module;
                            if (moduleName == per.module && permissions.indexOf(key2) == -1) {
                                permissions.push(key2);
                            }
                        });
                    }
                    if (mode == 2) { //get parents
                        if (role.parent && role.parent.length > 0) {
                            role.parent.forEach(childRole => {
                                let key = childRole.key || childRole.name;
                                let permissions1 = Acl.getRolePermission(key, moduleName, permissions, mode);
                            });
                        }
                    } else if (mode == 3) {
                        if (role.child && role.child.length > 0) {
                            role.child.forEach(childRole => {
                                let key = childRole.key || childRole.name;
                                let permissions1 = Acl.getRolePermission(key, moduleName, permissions, mode);
                            });
                        }
                    }
                }
            });
        }
        return permissions;
    },
    getRolePermissionDown: (roleName, moduleName, permissions) => {
        if (!permissions) {
            permissions = [];
        }
        if (roles && roles.length > 0) {
            roles.forEach(role => {
                let key = role.key || role.name;
                if (key == roleName) {
                    let permissions1 = role.permissions;
                    if (permissions1 && permissions1.length > 0) {
                        permissions1.forEach(per => {
                            let key2 = per.key || per.name;
                            key2 = roleName + "_" + key2;
                            if (moduleName == per.module && permissions.indexOf(key2 == -1)) {
                                permissions.push(key2);
                            }
                        });
                    }
                    if (role.child && role.child.length > 0) {
                        role.child.forEach(childRole => {
                            let key = childRole.key || childRole.name;
                            let permissions1 = Acl.getRolePermission(key, moduleName, permissions);
                        });
                    }
                }

            });
        }
        return permissions;
    },
    getRoleByName: (roleName) => {
        if (roles && roles.length > 0) {
            roles.forEach(role => {
                let key = role.key || role.name;
                if (key == roleName) {
                    return role;
                }
            });
        }
    },
    allowRoles: (doc, roles, permissions) => {
        if (doc) {
            if (!doc.acl_meta) {
                doc.acl_meta = {};
            }
            if (!doc.acl_meta.roles) {
                doc.acl_meta.roles = [];
            }
            if (!doc.acl_meta.permissions) {
                doc.acl_meta.permissions = [];
            }
            if (roles && roles.length > 0) {
                roles.forEach(role => {
                    doc.acl_meta.roles.push({ role: role, permissions: permissions });
                });
            }
        }

    },
    allowUser: (moduleName, user, doc) => {
        let self = this;
        if (doc) {
            if (!doc.acl_meta) {
                doc.acl_meta = {};
            }
            if (!doc.acl_meta.roles) {
                doc.acl_meta.roles = [];
            }
            if (!doc.acl_meta.users) {
                doc.acl_meta.users = [];
            }
            if (!doc.acl_meta.permissions) {
                doc.acl_meta.permissions = [];
            }
            if (user) {
                // console.log('acl user', JSON.stringify(user));
                if (isArray(user._id)) {
                    user._id.forEach(eachUserId => {
                        if (doc.acl_meta.users.indexOf(eachUserId.toString()) == -1) {
                            doc.acl_meta.users.push(eachUserId.toString());
                        }
                    });
                } else {
                    if (doc.acl_meta.users.indexOf(user._id.toString()) == -1) {
                        doc.acl_meta.users.push(user._id.toString());
                    }
                }

                if (user.group) {
                    if (user.group.length > 0) {
                        user.group.forEach(role => {
                            let permissions = Acl.getRolePermission(role, moduleName);
                            if (doc.acl_meta.roles.indexOf(role) == -1) {
                                doc.acl_meta.roles.push(role);
                            }

                            if (permissions && permissions.length > 0) {
                                permissions.forEach(per => {
                                    if (doc.acl_meta.permissions.indexOf(per) == -1) {
                                        doc.acl_meta.permissions.push(per);
                                    }
                                });
                            }
                        });
                    }
                }
            }

        }
    },
    getAclQueryPermissions: (moduleName, permission, user) => {
        let permissions = [];
        let permissions2 = [];
        if (user.group) {
            if (user.group.length > 0) {
                user.group.forEach(role => {
                    //  console.log('ROLE: ', role);
                    permissions = Acl.getRolePermission(role, moduleName, permissions, 3);
                });
            }
        }
        permissions.forEach(per => {
            if (per.indexOf(permission) != -1) {
                permissions2.push(per);
            }
        });

        // console.log("ACL permission", JSON.stringify(permissions2));
        let q = { 'acl_meta.permissions': { '$in': permissions2 } }
        return permissions2;
    },
    getRegions: () => {
        return this.regions
    }

}
module.exports = Acl;