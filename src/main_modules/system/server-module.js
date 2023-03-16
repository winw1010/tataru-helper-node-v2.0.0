'use strict';

// http
const http = require('http');

// config module
const configModule = require('./config-module');

// dialog module
const dialogModule = require('./dialog-module');

// correction-module
const { correctionEntry } = require('../correction/correction-module');

// system channel
const systemChannel = ['0039', '0839', '0003', '0038', '003C', '0048', '001D', '001C'];

// text history
let textHistory = {};

// create server
const server = http.createServer(function (request, response) {
    if (request.method === 'POST') {
        request.on('data', function (data) {
            dataProcess(data);
        });

        request.on('end', function () {
            response.writeHead(200, { 'Content-Type': 'text/html' });
            response.end('POST complete.');
        });
    } else if (request.method === 'GET') {
        response.writeHead(200, { 'Content-Type': 'text/html' });
        response.end('GET is not in service.');
    }
});

server.on('listening', () => {
    console.log('Opened server on', server.address());
});

server.on('error', (error) => {
    server.close();
    dialogModule.showNotification('伺服器發生錯誤: ' + error);
});

// start server
function startServer() {
    const config = configModule.getConfig();
    const host = config.server.host;
    const port = config.server.port;

    server.close();
    server.listen(port, host);
}

// data process
function dataProcess(data) {
    try {
        const config = configModule.getConfig();
        let dialogData = JSON.parse(data.toString());

        if (dataCheck(dialogData)) {
            // clear id and timestamp
            dialogData.id = null;
            dialogData.timestamp = null;

            // check code
            if (dialogData.text !== '' && config.channel[dialogData.code]) {
                // history check
                if (textHistory[dialogData.text] && new Date().getTime() - textHistory[dialogData.text] < 5000) {
                    return;
                } else {
                    textHistory[dialogData.text] = new Date().getTime();
                }

                // name check
                if (dialogData.name === '...') {
                    dialogData.name = '';
                }

                // system message fix
                if (isSystemMessage(dialogData.code)) {
                    if (dialogData.name !== '') {
                        dialogData.text = dialogData.name + ': ' + dialogData.text;
                        dialogData.name = '';
                    }
                }

                // start correction
                correctionEntry(dialogData, config.translation);

                // show data
                console.log('data:', dialogData);
            } else {
                // show data
                console.log('data:', dialogData);
                console.log('Chat code is not in list.');
            }
        }
    } catch (error) {
        console.error(error);
    }
}

// dialog data check
function dataCheck(dialogData) {
    const names = Object.getOwnPropertyNames(dialogData);
    return names.includes('code') && names.includes('name') && names.includes('text');
}

// channel check
function isSystemMessage(code) {
    return systemChannel.includes(code);
}

// module exports
module.exports = {
    startServer,
};
