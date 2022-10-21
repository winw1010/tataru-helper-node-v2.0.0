'use strict';

// fs
const { unlinkSync } = require('fs');

// file module
const fileModule = require('./main_modules/system/file-module');

// electron
const { contextBridge, ipcRenderer } = require('electron');

// ui module
const { changeUIText } = require('./renderer_modules/ui-module');

// temp image path
const tempImagePath = fileModule.getRootPath('src', 'trained_data');

// DOMContentLoaded
window.addEventListener('DOMContentLoaded', () => {
    setContextBridge();
    setIPC();

    setView();
    setEvent();
    setButton();
});

// set context bridge
function setContextBridge() {
    contextBridge.exposeInMainWorld('myAPI', {
        dragWindow: (...args) => {
            ipcRenderer.send('drag-window', ...args);
        },
    });
}

// set IPC
function setIPC() {
    ipcRenderer.on('send-data', (event, stringArray) => {
        let text = '';

        for (let index = 0; index < stringArray.length; index++) {
            text += stringArray[index] + '\n';
        }

        document.getElementById('textarea_screen_text').value = text;
    });
}

// set view
function setView() {
    const config = ipcRenderer.sendSync('get-config');
    document.getElementById('checkbox_split').checked = config.captureWindow.split;
    document.getElementById('img_result').setAttribute('src', getPath('crop.jpeg'));
    changeUIText();
}

// set event
function setEvent() {
    // checkbox
    document.getElementById('checkbox_split').oninput = () => {
        let config = ipcRenderer.sendSync('get-config');
        config.captureWindow.split = document.getElementById('checkbox_split').checked;
        ipcRenderer.send('set-config', config);
    };
}

// set button
function setButton() {
    // page
    document.getElementById('button_radio_captured_text').onclick = () => {
        document.querySelectorAll('.div_page').forEach((value) => {
            document.getElementById(value.id).hidden = true;
        });
        document.getElementById('div_captured_text').hidden = false;
    };

    document.getElementById('button_radio_captured_image').onclick = () => {
        document.querySelectorAll('.div_page').forEach((value) => {
            document.getElementById(value.id).hidden = true;
        });
        document.getElementById('div_captured_image').hidden = false;
    };

    // translate
    document.getElementById('button_translate').onclick = () => {
        translate(document.getElementById('textarea_screen_text').value);
    };

    // close
    document.getElementById('img_button_close').onclick = () => {
        ipcRenderer.send('close-window');
    };
}

function translate(text) {
    const config = ipcRenderer.sendSync('get-config');

    // set string array
    let stringArray = [];
    if (config.captureWindow.split) {
        stringArray = text.split('\n');
    } else {
        stringArray = [text.replaceAll('\n', '')];
    }

    // delete images
    deleteImages();

    // start translate
    const timestamp = new Date().getTime();
    for (let index = 0; index < stringArray.length; index++) {
        const element = stringArray[index];
        if (element !== '') {
            const dialogData = {
                id: 'id' + (timestamp + index),
                code: '003D',
                playerName: '',
                name: '',
                text: element,
                timestamp: timestamp + index,
            };

            ipcRenderer.send('start-translation', dialogData, config.translation);
        }
    }
}

// get path
function getPath(fileName) {
    return fileModule.getPath(tempImagePath, fileName);
}

// delete images
function deleteImages() {
    const images = ['screenshot.png', 'crop.jpeg', 'result.jpeg'];

    images.forEach((value) => {
        try {
            unlinkSync(getPath(value));
        } catch (error) {
            console.log(error);
        }
    });
}
