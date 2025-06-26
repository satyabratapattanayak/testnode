const ObjectId = require('mongodb').ObjectID;
const { isEmpty, head, first, isUndefined } = require('lodash');
const jwt = require('jsonwebtoken');
const useragent = require('express-useragent');
const parser = require('ua-parser-js');
const Moment = require("moment");

const Auth = require('../auth/auth.model.js');
const config = require('../../config/config');
const Audit = require('../audit/audit.model.js');
const { setUsersDataPermission } = require('../../service/acl');
const { auditActions, Modules } = require('../shared/shared.model');
const { getTodayEndTime } = require("../../config/dateutil");


const log = (module, action, userId, data, msg) => {
    let logData = {
        module: module,
        action: action,
        userId: userId ? ObjectId(userId) : null,
        data: data,
        message: msg,
        date: new Date()
    };
    Audit.addLog(logData);
};


const audit = (action, req, userId, token, msg) => {
    let clientIp = req.headers['x-forwarded-for'] ? req.headers['x-forwarded-for'] :
        req.connection.remoteAddress ? req.connection.remoteAddress :
            req.ip;
    let parserDetails = parser(req.headers['user-agent'])

    let deviceMsg = !isUndefined(parserDetails.device.type) ?
        `${parserDetails.device.type} ${parserDetails.device.vendor} ${parserDetails.device.model}` :
        `${parserDetails.browser.name}/${parserDetails.browser.major}`;

    let doc = {
        token: token,
        ipAdds: splitString(clientIp, ':'),
        browser: deviceMsg,
        browserDetails: req.headers['user-agent'],
        location: req.body.location
    };

    let module = req.useragent.isMobile ? Modules().mobileApp : Modules().webApp

    log(module, action, userId, doc, `${msg} ${deviceMsg}`)

    function splitString(stringToSplit, separator) {
        var arrayOfStrings = stringToSplit.split(separator); // [ '', '', 'ffff', '127.0.0.1' ]
        return arrayOfStrings.length == 3 ? arrayOfStrings[2] : arrayOfStrings[3];
    }

}


const login = async (req, res, next) => {
    try {
        console.log('login request body: ', req.body);
        console.log('login request headers: ', req.headers);
        console.log('req IP: ', req.ip);
        console.log('IP: ', req.headers['x-forwarded-for'], ' :: ', req.connection.remoteAddress);

        const result = await Auth.login(req.body.email, req.body.password, req.body.token);

        if (result == null) {
            res.status(404).json({
                message: 'User not found!',
                status: 404
            });
        }

        if (result === 0) {
            res.status(401).json({
                message: 'wrong password!',
                status: 401
            });
        } else if (result === 1) {
            res.status(400).json({
                status: 400,
                message: 'You have been DeActivated. Please contact admin.',
            });
        } else if (result === 2) {
            res.status(400).json({
                status: 400,
                message: 'Invalid Configurations. Please contact admin.',
            });
        } else {

            const encodeUserInfo = { _id: head(result)._id, };

            const token = generateJWT_Token(req, encodeUserInfo);

            let permissions = [];
            if (head(result).permission_details && head(result).permission_details.length > 0) {
                head(result).permission_details.forEach(perm => {
                    permissions.push(perm.module + '_' + perm.name);
                });
            }

            if (first(result).group && first(result).group.includes('admin')) {
                first(result).isAdmin = 1;
            }

            audit(auditActions().login, req, result[0]._id, token, 'logged in')

            return res.status(200).json({
                status: 200,
                token: token,
                userId: head(result)._id,
                emp_code: head(result).emp_code,
                username: head(result).first_name + ' ' + head(result).last_name,
                group: head(result).group,
                role: head(result).role_details[0] && head(result).role_details[0].type,
                isFirstTimeLogin: head(result).isFirstTimeLogin,
                isAdmin: first(result).isAdmin ? first(result).isAdmin : 0,
                permissions: permissions,
            });
        }
    } catch (error) {
        next(error);
    }
};


const logout = async (req, res, next) => {
    try {
        console.log('logout request body: ', req.body);
        console.log('logout request headers: ', req.headers);
        console.log('req IP: ', req.ip);
        console.log('IP: ', req.headers['x-forwarded-for'], ' :: ', req.connection.remoteAddress);


        let token = req.body.token;
        let userId = req.body.userId;
        const result = Auth.logout(userId, token);
        audit(auditActions().logout, req, userId, token, 'logged out from')
        res.json({ message: 'successfully logged out' })
    } catch (error) {
        next(error);
    }
};


const forgotPassword = async (req, res, next) => {
    try {
        let email = req.body.email;
        const result = await Auth.forgotPassword(email);
        if (!result) {
            res.status(404).json({ status: 404, message: 'user not found' });
        } else {
            res.status(200).json(
                {
                    status: 200,
                    message: `A reset password link has been sent to "${email}".`
                }
            );
        }
    } catch (error) {
        next(error);
    }
};

const resetPassword = async (req, res, next) => {
    try {
        if (!req.query.token) { res.json('token is required') }
        let token = req.query.token;
        let password = req.body.password;
        const result = await Auth.resetPassword(token, password);
        if (!result) {
            res.status(400).json({ status: 400, message: 'This URL has been used. Please request for a new link.' });
        } else {
            res.status(200).json({ status: 200, message: 'Password updated successfully!.' });
        }
    } catch (error) {
        next(error);
    }

};


module.exports = {
    login,
    logout,
    forgotPassword,
    resetPassword
};

function generateJWT_Token(req, encodeUserInfo) {
    let jwtTokenExpireTime = null;
    
    if (req.useragent.isMobile) {
        jwtTokenExpireTime = '30d'; 
    } else {
        jwtTokenExpireTime = config.jwtTokenExpireTime;
    }
    const token = jwt.sign(encodeUserInfo, req.app.get('superSecret'), {
        expiresIn: jwtTokenExpireTime
    });
    return token;
}

