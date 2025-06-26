// @ts-check
const sockjs = require('sockjs');
const SockRouteHandler = require('./server/modules/sock/sockRouteHandler');

let sockHandler = (server) => {
    const dbSync = sockjs.createServer();
    dbSync.on('connection', function (conn) {
        console.log('socket:: on connection: ');
        let sockRoutes = new SockRouteHandler();
        conn.on('data', function (message) {
            sockRoutes.route(conn, message);
            let msg = JSON.parse(message)
            console.log('socket:: on data', message, ' :: ');
            // sockRoutes.SyncNotifications(conn, { type: 'notifications', userId: msg["userId"] })
        });
        conn.on('close', function () {
            console.log('socket connection close');
            sockRoutes.close();
        });
    });
    dbSync.installHandlers(server, { prefix: '/dbSync' });
    // dbSync.installHandlers(this.app, { prefix: '/dbSync' });
    return dbSync;
}

module.exports = sockHandler;
