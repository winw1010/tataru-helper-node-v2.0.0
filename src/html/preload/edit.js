'use strict';

// electron
const { ipcRenderer } = require('electron');

// No kanji
const regNoKanji = /^[^\u3100-\u312F\u3400-\u4DBF\u4E00-\u9FFF]+$/;

// file module
const fileModule = {
  getPath: (...args) => {
    return ipcRenderer.sendSync('get-path', ...args);
  },
  getUserDataPath: (...args) => {
    return ipcRenderer.sendSync('get-user-data-path', ...args);
  },
  readJson: (filePath, returnArray) => {
    return ipcRenderer.sendSync('read-json', filePath, returnArray);
  },
  writeJson: (filePath, data) => {
    ipcRenderer.send('write-json', filePath, data);
  },
};

// log path
const logPath = fileModule.getUserDataPath('log');

// user text path
const userTextPath = fileModule.getUserDataPath('text');

// target log
let targetLog = null;

// google form
const formId = '1FAIpQLScj8LAAHzy_nTIbbJ1BSqNzyZy3w5wFrLxDVUMbY0BIAjaIAg';
const entry1 = 'entry.195796166';
const entry2 = 'entry.1834106335';
const entry3 = 'entry.2057890818';
const entry4 = 'entry.654133178';

// DOMContentLoaded
window.addEventListener('DOMContentLoaded', () => {
  setIPC();

  setView();
  setEvent();
  setButton();
});

// set IPC
function setIPC() {
  // change UI text
  ipcRenderer.on('change-ui-text', () => {
    const config = ipcRenderer.sendSync('get-config');
    document.dispatchEvent(new CustomEvent('change-ui-text', { detail: config }));
  });

  // send data
  ipcRenderer.on('send-data', (event, id) => {
    readLog(id);
  });
}

// set view
function setView() {
  const config = ipcRenderer.sendSync('get-config');

  document.getElementById('select-engine').innerHTML = ipcRenderer.sendSync('get-engine-select');
  document.getElementById('select-from').innerHTML = ipcRenderer.sendSync('get-source-select');
  document.getElementById('select-to').innerHTML = ipcRenderer.sendSync('get-target-select');

  document.getElementById('select-engine').value = config.translation.engine;
  document.getElementById('select-from').value = config.translation.from;
  document.getElementById('select-to').value = config.translation.to;

  document.getElementById('checkbox-replace').checked = config.translation.replace;
}

// set event
function setEvent() {
  // move window
  document.addEventListener('move-window', (e) => {
    ipcRenderer.send('move-window', e.detail, false);
  });

  document.getElementById('checkbox-replace').oninput = () => {
    let config = ipcRenderer.sendSync('get-config');
    config.translation.replace = document.getElementById('checkbox-replace').checked;
    ipcRenderer.send('set-config', config);
  };
}

// set button
function setButton() {
  // restart
  document.getElementById('button-restart-translate').onclick = () => {
    const config = ipcRenderer.sendSync('get-config');

    let dialogData = {
      id: targetLog.id,
      playerName: targetLog.player,
      code: targetLog.code,
      name: targetLog.name,
      text: targetLog.text,
      timestamp: targetLog.timestamp,
      translation: config.translation,
    };

    if (!dialogData.translation.replace) {
      // clear id and timestamp
      dialogData.id = null;
      dialogData.timestamp = null;
    }

    dialogData.translation.engine = document.getElementById('select-engine').value;
    dialogData.translation.from = document.getElementById('select-from').value;
    dialogData.translation.fromPlayer = document.getElementById('select-from').value;
    dialogData.translation.to = document.getElementById('select-to').value;

    ipcRenderer.send('add-task', dialogData);
  };

  // load json
  document.getElementById('button-load-json').onclick = () => {
    ipcRenderer.send('load-json');
  };

  // report translation
  document.getElementById('button-report-translation').onclick = () => {
    reportTranslation();
  };

  // save custom
  document.getElementById('button-save-custom').onclick = () => {
    const textBefore = document.getElementById('textarea-before').value.replaceAll('\n', '').trim();
    const textAfter = document.getElementById('textarea-after').value.replaceAll('\n', '').trim();
    const type = document.getElementById('select-type').value;

    let fileName = '';
    let textBefore2 = textBefore;
    let array = [];

    if (textBefore.length > 1) {
      if (type === 'custom-source') {
        fileName = 'custom-source.json';
        if (textBefore2.length < 3 && regNoKanji.test(textBefore2)) textBefore2 += '#';
        array.push([textBefore2, textAfter]);
      } else if (type === 'custom-overwrite') {
        fileName = 'custom-overwrite.json';
        array.push([textBefore2, textAfter]);
      } else if (type === 'player' || type === 'retainer') {
        fileName = 'player-name.json';
        if (textBefore2.length < 3 && regNoKanji.test(textBefore2)) textBefore2 += '#';
        array.push([textBefore2, textAfter, type]);
      } else {
        fileName = 'custom-target.json';
        if (textBefore2.length < 3 && regNoKanji.test(textBefore2)) textBefore2 += '#';
        array.push([textBefore2, textAfter, type]);
      }

      ipcRenderer.send('save-user-custom', fileName, array);
      ipcRenderer.send('show-notification', '已儲存自訂翻譯');
    } else {
      ipcRenderer.send('show-notification', '原文字數不足');
    }
  };

  // delete custom
  document.getElementById('button-delete-custom').onclick = () => {
    const textBefore = document.getElementById('textarea-before').value.replaceAll('\n', '').trim();
    const type = document.getElementById('select-type').value;

    let fileName = '';
    let textBefore2 = textBefore;

    if (textBefore.length > 1) {
      if (type === 'custom-source') {
        fileName = 'custom-source.json';
        if (textBefore2.length < 3 && regNoKanji.test(textBefore2)) textBefore2 += '#';
      } else if (type === 'custom-overwrite') {
        fileName = 'custom-overwrite.json';
      } else if (type === 'player' || type === 'retainer') {
        fileName = 'player-name.json';
        if (textBefore2.length < 3 && regNoKanji.test(textBefore2)) textBefore2 += '#';
      } else {
        fileName = 'custom-target.json';
        if (textBefore2.length < 3 && regNoKanji.test(textBefore2)) textBefore2 += '#';
      }

      ipcRenderer.send('delete-user-custom', fileName, textBefore2);
      ipcRenderer.send('show-notification', '已刪除自訂翻譯');
    } else {
      ipcRenderer.send('show-notification', '原文字數不足');
    }
  };

  // view custom
  document.getElementById('button-view-custom').onclick = () => {
    ipcRenderer.send('execute-command', `start "" "${userTextPath}"`);
  };

  // close
  document.getElementById('img-button-close').onclick = () => {
    ipcRenderer.send('close-window');
  };
}

// read log
function readLog(id = '') {
  try {
    const config = ipcRenderer.sendSync('get-config');
    const milliseconds = parseInt(id.slice(2));
    const logFileList = [
      createLogName(milliseconds),
      createLogName(milliseconds + 86400000),
      createLogName(milliseconds - 86400000),
    ];

    if (logFileList.length > 0) {
      for (let index = 0; index < logFileList.length; index++) {
        try {
          const filePath = fileModule.getPath(logPath, logFileList[index]);
          const log = fileModule.readJson(filePath, false);
          targetLog = log[id];

          if (targetLog) {
            break;
          }
        } catch (error) {
          console.log(error);
        }
      }

      if (targetLog) {
        // show audio
        showAudio();

        // show text
        showText();

        // set select-engine
        if (targetLog?.translation?.engine) {
          document.getElementById('select-engine').value = fixLogValue(
            targetLog.translation.engine,
            ['Youdao', 'Baidu', 'Caiyun', 'Papago', 'DeepL'],
            config.translation.engine
          );
        }

        // set select-from
        if (targetLog?.translation?.from) {
          document.getElementById('select-from').value = fixLogValue(
            targetLog.translation.from,
            ['Japanese', 'English', 'Traditional-Chinese', 'Simplified-Chinese'],
            config.translation.from
          );
        }

        // set select-to
        if (targetLog?.translation?.to) {
          document.getElementById('select-to').value = fixLogValue(
            targetLog.translation.to,
            ['Japanese', 'English', 'Traditional-Chinese', 'Simplified-Chinese'],
            config.translation.to
          );
        }
      }
    }
  } catch (error) {
    console.log(error);
  }
}

// show audio
function showAudio() {
  const text = targetLog.audio_text || targetLog.text;

  if (text !== '') {
    try {
      const urlList = ipcRenderer.sendSync('google-tts', text, targetLog.translation.from);
      console.log('TTS url:', urlList);

      let innerHTML = '';
      for (let index = 0; index < urlList.length; index++) {
        const url = urlList[index];

        innerHTML += `
                    <audio class="w-100" controls preload="metadata">
                        <source src="${url}" type="audio/ogg">
                        <source src="${url}" type="audio/mpeg">
                    </audio>
                    <br>
                `;
      }

      document.getElementById('div-audio').innerHTML = innerHTML;
    } catch (error) {
      console.log(error);
    }
  }
}

// show text
function showText() {
  const text1 = document.getElementById('div-text1');
  const text2 = document.getElementById('div-text2');

  text1.innerHTML = `<span>${targetLog.name !== '' ? targetLog.name + '：<br>' : ''}${targetLog.text}</span>`;
  text2.innerHTML =
    `<span>${targetLog.translated_name !== '' ? targetLog.translated_name + '：<br>' : ''}` +
    `${targetLog.translated_text}</span>`;
}

// report translation
function reportTranslation() {
  try {
    const text1 = (targetLog.name !== '' ? targetLog.name + ': ' : '') + targetLog.text;
    const text2 =
      (targetLog.translated_name !== '' ? targetLog.translated_name + ': ' : '') + targetLog.translated_text;
    const path =
      `/forms/d/e/${formId}/formResponse?` +
      `${entry1}=待處理` +
      `&${entry2}=${targetLog.translation.engine}` +
      `&${entry3}=${text1}` +
      `&${entry4}=${text2}`;

    ipcRenderer.send('post-form', encodeURI(path));
    ipcRenderer.send('show-message-box', '回報完成');
  } catch (error) {
    console.log(error);
    ipcRenderer.send('show-message-box', error);
  }
}

// fix log value
function fixLogValue(value = '', valueArray = [], defaultValue = '') {
  if (!valueArray.includes(value)) value = defaultValue;
  return value;
}

// create log name
function createLogName(milliseconds = null) {
  return ipcRenderer.sendSync('create-log-name', milliseconds);
}
