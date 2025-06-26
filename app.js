
const express = require('express');
const path = require('path');
// const Promise = require('bluebird');
const favicon = require('serve-favicon');
const logger = require('morgan');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const { forOwn } = require('lodash');
// const paginate = require('express-paginate');
const validate = require('express-validation');
const httpStatus = require('http-status');
const useragent = require('express-useragent');

const multer = require('multer');
const UPLOAD_PATH = 'uploads';
const upload = multer({ dest: `${UPLOAD_PATH}/` }); // multer configuration

const config = require('./server/config/config');
let production = config.production;
const database = require('./server/service/database');
const notification = require('./server/service/notification');
const Jobs = require('./server/cronjob/cronjob');
const SharedModel = require('./server/modules/shared/shared.model');

const userModule = require('./server/modules/users');
const leadModule = require('./server/modules/lead');
const customersModule = require('./server/modules/customers');
const opportunityModule = require('./server/modules/opportunity');
const contactsModule = require('./server/modules/contacts');
const scheduleModule = require('./server/modules/schedule');
const venuesModule = require('./server/modules/venues');
const venueAreaModule = require('./server/modules/venue_areas');
const quotesModule = require('./server/modules/quotes');
const uploadModule = require('./server/modules/fileUpload');
const importModule = require('./server/import');
const authModule = require('./server/modules/auth');
const roleModule = require('./server/modules/role');
const groupModule = require('./server/modules/group');
const routePlanModule = require('./server/modules/routePlan');
const endProductsModule = require('./server/modules/endProducts');
const industryModule = require('./server/modules/industry');
const subIndustryModule = require('./server/modules/subIndustry');
const processModule = require('./server/modules/process');
const subProcessModule = require('./server/modules/subProcess');
const categoryModule = require('./server/modules/category');
const subCategoryModule = require('./server/modules/subCategory');
const widgetModule = require('./server/modules/widget');
const recommendationModule = require('./server/modules/recommendationChart');
const konspecCodeModule = require('./server/modules/konspecCode');
const supplierModule = require('./server/modules/supplier');
const dealerModule = require('./server/modules/dealer');
const notificationModule = require('./server/modules/notification');

const methodologyModule = require('./server/modules/methodology');
const regionModule = require('./server/modules/region');
const stateModule = require('./server/modules/state');
const auditModule = require('./server/modules/audit');
const notesModule = require('./server/modules/notes');
const priorityModule = require('./server/modules/priority');
const statusModule = require('./server/modules/status');
const countriesModule = require('./server/modules/countries');
const formIOModule = require('./server/modules/formio');

const citiesModule = require('./server/modules/cities');
const zoneModule = require('./server/modules/zone');
const areaModule = require('./server/modules/area');
const initTriggers = require('./server/triggers/triggers');
const expenseReportModule = require('./server/modules/expense_report');
const sharedModule = require('./server/modules/shared');
const acl = require('./server/service/acl');
const videoModule = require('./server/modules/video');
const productModule = require('./server/modules/product');
const loginAuditModule = require('./server/modules/loginAudit');
const dealsModule = require('./server/modules/deals');

const notificationService = require('./server/service/notification');


// Promise = require('bluebird'); // make bluebird default Promise

const mountAllRoutes = (module) => {
    /* eslint-disable new-cap */
    const result = express.Router();
    /* eslint-enable new-cap */

    forOwn(module.routes, (routeDef, routeName) => {

        if (!module.controller[routeName]) {
            const err = `route ${routeName} not found on controller`;
            console.log('mount error', err);
            throw new Error(err);
        }
        if (!module.schemas[routeName]) {
            result[routeDef.verb](
                routeDef.path,
                module.controller[routeName]
            );
        } else {
            result[routeDef.verb](
                routeDef.path,
                validate(module.schemas[routeName]),
                module.controller[routeName]
            );
        }
        // console.log(`mounted API: ${routeName}`);
    });
    return result;
};

const app = express();


notification.init();
database.init().then((db) => {
    Jobs.init();
    initTriggers(db);
    acl.init(db);
    SharedModel.init(db);

    // app.enable('trust proxy');

    app.get('/', (req, res) => {
        res.send({
            success: true,
            message: 'hey!, Server is up!',
        });
    });
    app.get('/api', (req, res) => {
        res.send({
            status: 200,
            message: 'API is running on : ' + config.PORT,
        });
    });

    // view engine setup
    /* app.set('views', path.join(__dirname, 'views'));
    app.set('view engine', 'ejs'); */

    // uncomment after placing your favicon in /public
    app.use(favicon(path.join(__dirname, 'public/images', 'favicon.ico')));
    app.use(logger('dev'));
    app.use(bodyParser.json());
    app.use(bodyParser.urlencoded({ extended: false }));
    app.use(cookieParser());
    app.use(express.static(path.join(__dirname, 'public')));
    app.use(useragent.express());


    // pagination middleware
    // app.use(paginate.middleware(5, 50));

    // enable cors
    app.use(cors());

    // jasonwebtoken secret key
    app.set('superSecret', config.jwtSecretKey);

    const router = express.Router();
    app.use('/api', router);

    const Authenticate = () => {
        router.use((req, res, next) => {
            // check header or url parameters or post parameters for token
            const token = req.body.token || req.query.token || req.headers.authorization;
            // decode token
            if (token) {
                // verifies secret and checks exp
                jwt.verify(token, app.get('superSecret'), (err, decoded) => {
                    if (err) {
                        return res.status(498).json({ message: 'UnAuthorized/Failed to authenticate token.', status: 498 });
                    } else {
                        // if everything is good, save to request for use in other routes
                        req.user = decoded;
                        next();
                    }
                });
            } else {
                // if there is no token, return an error
                return res.status(499).send({
                    message: 'No token provided',
                    status: 499
                });
            }
        });
    }

    // Routes token verification not required
    router.use('/auth', mountAllRoutes(authModule));
    router.use('/role', mountAllRoutes(roleModule));
    router.use('/group', mountAllRoutes(groupModule));
    router.use('/methodology', mountAllRoutes(methodologyModule));
    router.use('/businesstype', mountAllRoutes(methodologyModule));
    router.use('/region', mountAllRoutes(regionModule));
    router.use('/state', mountAllRoutes(stateModule));
    router.use('/audit', mountAllRoutes(auditModule));
    router.use('/notes', mountAllRoutes(notesModule));
    router.use('/priority', mountAllRoutes(priorityModule));
    router.use('/status', mountAllRoutes(statusModule));
    router.use('/countries', mountAllRoutes(countriesModule));
    router.use('/formio', mountAllRoutes(formIOModule));
    router.use('/cities', mountAllRoutes(citiesModule));
    router.use('/zone', mountAllRoutes(zoneModule));
    router.use('/file', mountAllRoutes(uploadModule));
    router.use('/import', upload.single('file'), mountAllRoutes(importModule));
    router.use('/shared', mountAllRoutes(sharedModule));
    router.use('/users', mountAllRoutes(userModule));
    router.use('/permissions', mountAllRoutes(userModule));
    router.use('/area', mountAllRoutes(areaModule));
    router.use('/dealer', mountAllRoutes(dealerModule));

    // jwt middleware to verify a token
    router.use((req, res, next) => {
        // console.log('req.url token verify: ', req.url);
        // check header or url parameters or post parameters for token
        const token = req.body.token || req.query.token || req.headers.authorization;
        // decode token
        if (token) {
            // verifies secret and checks exp
            jwt.verify(token, app.get('superSecret'), (err, decoded) => {
                if (err) {
                    return res.status(498).json({ message: 'UnAuthorized/Failed to authenticate token.', status: 498 });
                } else {
                    // if everything is good, save to request for use in other routes
                    req.user = decoded;
                    next();
                }
            });
        } else {
            // if there is no token, return an error
            return res.status(499).send({
                message: 'No token provided',
                status: 499
            });
        }
    });

    // Routes token verification is required   
    router.use('/lead', mountAllRoutes(customersModule));
    router.use('/customer', mountAllRoutes(customersModule));
    router.use('/opportunity', mountAllRoutes(opportunityModule));
    router.use('/contacts', mountAllRoutes(contactsModule));
    router.use('/schedule', mountAllRoutes(scheduleModule));
    router.use('/venues', mountAllRoutes(venuesModule));
    router.use('/venuearea', mountAllRoutes(venueAreaModule));
    router.use('/quotes', mountAllRoutes(quotesModule));
    router.use('/expensereport', mountAllRoutes(expenseReportModule));
    router.use('/routeplan', mountAllRoutes(routePlanModule));
    router.use('/endproduct', mountAllRoutes(endProductsModule));
    router.use('/industry', mountAllRoutes(industryModule));
    router.use('/subindustry', mountAllRoutes(subIndustryModule));
    router.use('/process', mountAllRoutes(processModule));
    router.use('/subprocess', mountAllRoutes(subProcessModule));
    router.use('/category', mountAllRoutes(categoryModule));
    router.use('/subcategory', mountAllRoutes(subCategoryModule));
    router.use('/recommendationchart', mountAllRoutes(recommendationModule));
    router.use('/konspecCode', mountAllRoutes(konspecCodeModule));
    router.use('/widget', mountAllRoutes(widgetModule));
    router.use('/supplier', mountAllRoutes(supplierModule));
    router.use('/video', mountAllRoutes(videoModule));
    router.use('/product', mountAllRoutes(productModule));
    router.use('/login-audit', mountAllRoutes(loginAuditModule));
    router.use('/notifications', mountAllRoutes(notificationModule));
    router.use('/deal', mountAllRoutes(dealsModule));

    // catch 404 and forward to error handler
    app.use((req, res) => {
        const err = new Error('API Not Found!');
        err.status = 404;
        res.status(404).json({ message: 'API not found!', status: 404 });
        // next(err);
    });

    // error handler
    app.use((err, req, res, next) => {

        // set locals, only providing error in development
        if (err instanceof validate.ValidationError) { return res.status(err.status).json(err); }
        res.locals.message = err.message;
        res.locals.error = req.app.get('env') === 'development' ? err : {};
        if (production) {
            if (err.status !== 499 && err.status !== 498 && req.url !== '/api/auth/login') {
                notifyOnAPIError(err, req);
            }
            if (err.status == 500 || !err.status) {
                err.message = 'Internal Server Error';
            }
        }
        res.status(err.status || 500).json({
            status: httpStatus[err.status] || 500,
            message: err.message.match('Argument passed in must be a single String of 12 bytes or a string of 24 hex characters') ? 'Invalid Id has been passed on either in the "request data" or in the "API Url"' : err.message,
        });
        // res.render('error');
    });

    // error handler, send stacktrace only during development
    /* app.use((err, req, res, next) => { // eslint-disable-line no-unused-vars
        if (err instanceof validate.ValidationError) { return res.status(err.status).json(err); }
        res.status(err.status || 500).json({
            message: err.isPublic ? err.message : httpStatus[err.status],
            // stack: config.env.NODE_ENV === 'development' ? err.stack : {}

            // 'API Error': err.message,
            'API Error': err.message.match('Argument passed in must be a single String of 12 bytes or a string of 24 hex characters') ? 'Invalid Id has been passed on either in the "request data" or in the "API Url"' : err.message,
            // 'status code': httpStatus[err.status],
            status: err.status,
            // stack: err.stack,
        });
    }); */
});
module.exports = app;

function notifyOnAPIError(err, req) {
    const message = {
        to: 'ashraf.seventech@gmail.com',
        from: 'info@seventech.co',
        subject: "Error on KonspecCRM API",
        // html: '<strong>Status:</strong> ' + err.status + '<br>' + '<strong>Error:</strong> ' + String(err) + ' <br> ' + '<strong>req.url:</strong> ' + req.url + ' <br> ' + '<strong>req.originalUrl:</strong> ' + req.originalUrl + ' <br> ' + '<strong>req.body:</strong> ' + JSON.stringify(req.body),
        html: '<strong>Status:</strong> ' + err.status + '<br>' + '<strong>Error:</strong> ' + String(err) + ' <br> ' + '<strong>req.url:</strong> ' + req.url + ' <br> ' + '<strong>req.originalUrl:</strong> ' + req.originalUrl + ' <br> ' + '<strong>req.params:</strong> ' + JSON.stringify(req.params) + ' <br> ' + '<strong>req.query:</strong> ' + JSON.stringify(req.query) + ' <br> ' + '<strong>req.body:</strong> ' + JSON.stringify(req.body),
    };
    notificationService.sendEmail(message);
}


