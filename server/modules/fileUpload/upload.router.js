const routes = {
    getFile: {
        description: '',
        path: '/get',
        verb: 'get'
    },
    getFileForView: {
        description: '',
        path: '/view-file',
        verb: 'get'
    },
    getFileUrlForView: {
        description: '',
        path: '/url-file',
        verb: 'get'
    },
    upload: {
        description: '',
        path: '/upload',
        verb: 'post'
    }
};

module.exports = { routes };