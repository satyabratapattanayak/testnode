const ObjectId = require('mongodb').ObjectID;
const formidable = require('formidable');
const fs = require('fs');

const Model = require('../fileUpload/upload.model.js');
const Config = require('../../config/config');
const { getCurrentUserInfo } = require('../shared/shared.controller');

const getRandomNum = () => { return Math.floor(1000 + Math.random() * 9000); };


const getFile = (req, res, next) => {
    Model.getFile(req.query)
        .then((result) => {
            if (result == 0) {
                res.json('file not found');
            }

            // localPath
            let imagePath = result.file_location + result.file_name;

            // server path
            // let imagePath = '/home/CRMBackend/server/uploads' + result.file_name;


            // const url = '159.65.148.36:4636/api/file/get?fileId=' + req.query.fileId;
            const url = Config.imageURL + req.query.fileId;
            res.download(imagePath);
        })
        .catch(e => next(e));
};

const getFileForView = (req, res, next) => {
    console.log("I am here");
    Model.getFile(req.query)
        .then((result) => {
            if (!result) {
                return res.status(404).json({ message: 'File not found' });
            }

            const filePath = result.file_location + result.file_name; // Full path to the file

            // Check if the file exists
            if (!fs.existsSync(filePath)) {
                return res.status(404).json({ message: 'File not found on server' });
            }

            // Set headers for inline viewing
            res.setHeader('Content-Type', result.file_type);
            // res.setHeader('Content-Disposition', `inline; filename="${path.basename(result.file_name)}"`);

            // Stream the file to the response
            const fileStream = fs.createReadStream(filePath);
            fileStream.pipe(res);
        })
        .catch((e) => {
            console.error("Error fetching file:", e);
            next(e);
        });
};

const getFileUrlForView = (req, res, next) => {
    console.log("I am here");
    Model.getFile(req.query)
        .then((result) => {
            if (!result) {
                return res.status(404).json({ message: 'File not found' });
            }

            // Construct the full file path
            const filePath = result.file_location + result.file_name;
            const fileUrl = `${Config.imageURL}${result.file_name}`; // Use base URL from config
            console.log("file path: ", filePath)
            console.log("file Url: ", fileUrl)

            // Check if the file exists on the server
            if (!fs.existsSync(filePath)) {
                return res.status(404).json({ message: 'File not found on server' });
            }

            // Return the file URL instead of streaming the file
            res.json({ fileUrl });
        })
        .catch((e) => {
            console.error("Error fetching file:", e);
            next(e);
        });
};


const upload = (req, res, next) => {
    getCurrentUserInfo(req.headers.authorization).then((currentLoggedUser) => {
        // parse a file upload
        const form = new formidable.IncomingForm();

        if (req.hostname == 'localhost' || req.hostname == '192.168.1.11') {
            // form.uploadDir = '/home/developer-ashraf/projects/CRMBackend/uploads/';
            form.uploadDir = 'uploads/';
        } else {
            // form.uploadDir = '/home/crmadmin/crmapi/CRMBackend/uploads/';
            // form.uploadDir = '/var/lib/jenkins/workspace/crm_backend/uploads/';
            form.uploadDir = Config.fileUploadPath;
        }
        form.keepExtensions = true;
        form.maxFieldsSize = 10 * 1024 * 1024; //10 MB
        form.multiples = true;
        form.parse(req, (err, fields, files) => {

            // console.log('fiels: ', files);

            if (err) {
                res.send({
                    result: 'failed',
                    files: {},
                    messege: `Cannot upload files.Error is : ${err}`
                });
            }
            let arrayOfFiles = [];

            if (files['fileKey']) {
                if (files['fileKey'] instanceof Array) {
                    arrayOfFiles = files['fileKey'];
                } else {
                    arrayOfFiles.push(files['fileKey']);
                }
            } else if (files['']) {
                if (files[''] instanceof Array) {
                    arrayOfFiles = files[''];
                } else {
                    arrayOfFiles.push(files['']);
                }
            } else if (files['file']) {
                if (files['file'] instanceof Array) {
                    arrayOfFiles = files['file'];
                } else {
                    arrayOfFiles.push(files['file']);
                }
            }


            if (arrayOfFiles.length > 0) {
                let fileNames = [];
                let files = [];
                let fileIds = [];
                arrayOfFiles.forEach((eachFile) => {
                    console.log('eachFile: ', eachFile.path);
                    console.log('eachFile: ', eachFile.path.split('upload_'));
                    // fileNames.push(eachFile.path);
                    // fileNames.push(eachFile.path.split('/')[1]);
                    const fname = getRandomNum() + '_' + eachFile.name;
                    fs.rename(eachFile.path, form.uploadDir + '/' + fname, (err) => {
                        if (err) {
                            console.log('fs rename err: ', err);
                        }
                    });
                    fileNames.push(Config.imageURL + fname);
                    const fileId = ObjectId();

                    let body = {
                        _id: fileId,
                        file_name: fname,
                        file_type: eachFile.type,
                        file_location: form.uploadDir, // '/home/developer-ashraf/konspec/CRMBackend/server/uploads',
                        file_size: eachFile.size,
                        file_upload_date: eachFile.lastModifiedDate,
                        uploaded_by: ObjectId(currentLoggedUser._id)
                    };

                    Model.upload(body)
                        .then((resp) => {
                            files.push(resp[0]._id);
                        })
                        .catch(e => console.log('catch error: ', e));
                    body.id = fileId;

                    fileIds.push(body);
                });
                res.send({
                    result: 'ok',
                    files: fileIds,
                    numberOfFiles: fileNames.length,
                    messege: 'File uploaded successfully!'
                });
            } else {
                res.send({
                    result: 'failed',
                    files: {},
                    numberOfFiles: 0,
                    messege: 'No files to upload !'
                });
            }
        });
    }).catch((e) => next(e));
};

module.exports = { getFile, upload, getFileForView, getFileUrlForView };