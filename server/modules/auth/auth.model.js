const mongodb = require('mongodb').MongoClient;
const objectid = require('mongodb').ObjectID;
const jwt = require('jsonwebtoken');
const httpStatus = require('http-status');
const { isEmpty, head } = require('lodash');

const Audit = require('../audit/audit.model.js');
const DataAccess = require('../../helpers/DataAccess');
const config = require('../../config/config');
const { sendEmail } = require('../../triggers/actions');
const { auditActions, Modules } = require('../shared/shared.model');

let mydb;
const collection_name = 'users';
const database = require('../../service/database');
database.getDb().then(res => { mydb = res; });

const log = (module, action, userId, data, msg) => {
    let logData = {
        module: module,
        action: action,
        documentId: userId ? objectid(userId) : null,
        userId: userId ? objectid(userId) : null,
        data: data,
        message: msg,
        date: new Date()
    };
    Audit.addLog(logData);
};


const model = {
    generateToken: async (id) => {
        const encodeUserInfo = { _id: id, };
        const token = jwt.sign(encodeUserInfo, config.jwtSecretKey);
        return token;
    },
    login: async (email, password, token) => {
        try {

            let query = { email: email, deleted: { $ne: 1 } }

            const crieteria = [
                { $match: query },
                { $lookup: { from: 'role', localField: 'role', foreignField: '_id', as: 'role_details' } },
                { $lookup: { from: 'group', localField: 'group', foreignField: 'key', as: 'group_details' } },
                { $lookup: { from: 'permissions', localField: 'group_details.permissions', foreignField: '_id', as: 'permission_details' } },
                // { $project: { permission: { $concat: ['$permission_details.module', '-', '$permission_details.name'] } } }
            ];
            const user = await DataAccess.aggregate('users', crieteria);

            if (!user || isEmpty(user))
                return null;
            if (user) {
                if (!user[0].isActive) return 1;
                if (!user[0].group || user[0].group.length == 0) return 2;
                //return comparePassword(password,head(user).password).then((res)=>{
                if (password === head(user).password) {
                    // if(res){
                    let tokens = head(user).tokens;
                    if (!tokens) {
                        tokens = [];
                    }
                    if (tokens.indexOf(token) == -1 && token) {
                        tokens.push(token);
                    }
                    DataAccess.UpdateOne('users', { _id: head(user)._id }, { $set: { tokens: tokens } });
                    return user;
                } else {
                    return 0;
                }
                //  });
            }
        } catch (e) {
            throw new Error(e);
        }
    },
    forgotPassword: async (email) => {
        try {
            const resp = await DataAccess.findOne('users', { email: email })
            if (!resp) {
                return false;
            } else {
                let token = await model.generateToken(resp._id)
                console.log('token: ', token);

                let doc = {
                    token: token,
                    email: resp.email,
                    user: resp._id
                }

                log(Modules().user, auditActions().forgot_password, resp._id, doc, `reset the password`)
                DataAccess.UpdateOne('users', { _id: objectid(resp._id) }, { $push: { tokens: token } })
                return resp;
            }
        } catch (error) {
            throw new Error(error)
        }
    },
    resetPassword: async (token, password) => {
        try {
            const resp = await DataAccess.findOne('users', { tokens: { $in: [token] } })
            if (!resp || resp == null || isEmpty(resp)) {
                return false;
            } else {
                return encryptPassword().then((hash) => {
                    //   password = hash;
                    DataAccess.UpdateOne('users', { _id: objectid(resp._id) }, { $set: { password: password }, $pull: { tokens: token } });
                    return true;
                });
            }
        } catch (error) {
            throw new Error(error)
        }
    },

    logout: async (userId, token) => {
        try {
            DataAccess.UpdateOne('users', { _id: objectid(userId) }, { $pull: { tokens: token } });
        } catch (error) {
            throw new Error(error)
        }
    },
};
const encryptPassword = () => {
    return new Promise((resolve, reject) => {
        let hash = '';
        // const bcrypt = require('bcrypt');
        // const saltRounds = 10;
        // bcrypt.genSalt(saltRounds, function(err, salt) {
        // bcrypt.hash(password, salt, function(err, hash) {
        // Store hash in your password DB.
        resolve(hash);
        //  });
        //  });
    })
}
const comparePassword = (password, hash) => {
    return new Promise((resolve, reject) => {
        let res = '';
        // const bcrypt = require('bcrypt');
        // bcrypt.compare(password, hash, function(err, res) {
        // res == true
        resolve(res);
    });

}

module.exports = model;