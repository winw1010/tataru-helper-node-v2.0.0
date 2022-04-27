'use strict';

// language table
const { languageTable, languageIndex } = require('./translator/language-table');

// correction function
const cfen = require('./correction-function-en');
const cf = require('./correction-function');

// dialog module
const { appendBlankDialog, updateDialog } = require('./dialog-module');

// queue
let queueItem = [];
let queue = setInterval(() => {
    try {
        if (queueItem.length > 0) {
            const item = queueItem.splice(0, 1)[0];
            start(item.dialogData, item.translation, item.tryCount);
        }
    } catch (error) {
        console.log(error);
    }
}, 1000);

// document
let chArray = {
    // replace
    map: [],
    name: [],
    other: [],
    player: [],

    // combine
    combine: [],

    // after
    afterTranslation: [],

    // temp
    chTemp: [],
    nameTemporary: [],
}

let enArray = {
    // exception
    exception: [],
};

function loadJSON(language) {
    const sub0 = languageIndex[languageTable.en];
    const sub1 = languageIndex[language];
    const ch = sub1 === 2 ? 'text/cht' : 'text/chs';
    const en = 'text/en';

    // ch array
    chArray.afterTranslation = cf.readJSON(ch, 'afterTranslation.json');

    chArray.main = cf.readJSONMain(sub0, sub1);
    chArray.player = cf.readJSON('text_temp', 'player.json');
    chArray.chTemp = cf.readJSON('text_temp', 'chTemp.json');

    // combine
    chArray.combine = cf.combineArrayWithTemp(chArray.chTemp, chArray.player, chArray.main);

    // en array
    enArray.exception = cf.readJSON(en, 'exception.json');
}

function addToQueue(dialogData, translation, tryCount = 0) {
    queueItem.push({
        dialogData: dialogData,
        translation: translation,
        tryCount: tryCount
    });
}

async function start(dialogData, translation, tryCount) {
    // exception check
    if (translation.skip && cf.exceptionCheck(dialogData.code, dialogData.name, dialogData.text, enArray.exception)) {
        return;
    }

    // check try count
    if (tryCount > 5) {
        updateDialog(dialogData.id, '', '翻譯失敗，請改用其他翻譯引擎', dialogData, translation);
        return;
    } else {
        tryCount++;
    }

    // append blank dialog
    appendBlankDialog(dialogData.id, dialogData.code);

    // player name
    if (dialogData.playerName !== '' && dialogData.playerName.includes(' ')) {
        if (!chArray.player.length > 0 || chArray.player[0][0] !== dialogData.playerName) {
            const firstName = dialogData.playerName.split(' ')[0];
            const lastName = dialogData.playerName.split(' ')[1];

            chArray.player = [
                [dialogData.playerName, dialogData.playerName],
                [firstName, firstName],
                [lastName, lastName]
            ];

            // combine
            chArray.combine = cf.combineArrayWithTemp(chArray.chTemp, chArray.player, chArray.main);

            // write
            cf.writeJSON('text_temp', 'player.json', chArray.player);
        }
    }

    // translate name
    let translatedName = '';
    if (translation.fix) {
        translatedName = await nameProcess(dialogData.name, translation);
    } else {
        translatedName = await cf.translate(dialogData.name, translation);
    }

    // translate text
    let translatedText = '';
    if (translation.fix) {
        translatedText = await textProcess(dialogData.name, dialogData.text, translation);
    } else {
        translatedText = await cf.translate(dialogData.text, translation);
    }

    if (dialogData.text !== '' && translatedText === '') {
        addToQueue(dialogData, translation, tryCount);
        return;
    }

    // update dialog
    updateDialog(dialogData.id, translatedName, translatedText, dialogData, translation);
}

async function nameProcess(name, translation) {
    if (name === '') {
        return '';
    }

    // same check
    if (cf.sameAsArrayItem(name, chArray.combine)) {
        return cfen.replaceTextPure(name, chArray.combine);
    }
    if (cf.sameAsArrayItem(name + '*', chArray.combine)) {
        // short name
        return cfen.replaceTextPure(name + '*', chArray.combine);
    } else {
        // code
        const result = cfen.replaceTextByCode(name, chArray.combine);

        // translate name
        let outputName = '';
        outputName = result.text;
        outputName = await cf.translate(outputName, translation);

        // clear code
        outputName = cf.clearCode(outputName, result.table);

        // table
        outputName = cfen.replaceTextPure(outputName, result.table);

        // save to temp
        chArray.chTemp = cf.readJSONPure('text_temp', 'chTemp.json');

        if (outputName.length < 3) {
            chArray.chTemp.push([name + '*', outputName, 'npc']);
        } else {
            chArray.chTemp.push([name, outputName, 'npc']);
        }

        // combine
        chArray.combine = cf.combineArrayWithTemp(chArray.chTemp, chArray.player, chArray.main);

        // write
        cf.writeJSON('text_temp', 'chTemp.json', chArray.chTemp);

        return outputName;
    }
}

async function textProcess(name, text, translation) {
    if (text === '') {
        return;
    }

    // text temp
    const originalText = text;

    // combine
    const result = cfen.replaceTextByCode(text, chArray.combine);
    text = result.text;

    // should translate check
    if (cfen.shouldTranslate(text, result.table)) {
        // translate    
        text = await cf.translate(text, translation);
    }

    // caiyun fix
    text = cf.caiyunFix(text);

    // clear code
    text = cf.clearCode(text, result.table);

    // table
    text = cfen.replaceTextPure(text, result.table);

    // gender fix
    text = cfen.genderFix(originalText, text);

    // after translation
    text = cfen.replaceTextPure(text, chArray.afterTranslation);

    return text;
}

exports.loadJSON_EN = loadJSON;
exports.addToQueue_EN = addToQueue;