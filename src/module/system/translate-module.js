'use strict';

// engine module
const engineModule = require('./engine-module');

// translator
const baidu = require('../translator/baidu');
const youdao = require('../translator/youdao');
const caiyun = require('../translator/caiyun');
const papago = require('../translator/papago');
const deepl = require('../translator/deepl');
//const google = require('../translator/google');
const gpt = require('../translator/gpt');
const cohere = require('../translator/cohere');
const gemini = require('../translator/gemini');
const zhConverter = require('../translator/zh-convert');

// translate
async function translate(text = '', translation = {}, table = []) {
  // clear newline
  text = text.replace(/\r|\n/g, '');

  // check length
  if (text === '') {
    return '……';
  }

  // check target
  if (translation.from === translation.to) {
    return text;
  }

  // translate
  try {
    const result = await translate2(text, translation, table);

    if (engineModule.aiList.includes(translation.engine)) {
      return zhConvert(result, translation.to);
    } else {
      return zhConvert(clearCode(result, table), translation.to);
    }
  } catch (error) {
    return zhConvert(error, translation.to);
  }
}

// translate 2
async function translate2(text = '', translation = {}, table = []) {
  const autoChange = translation.autoChange;
  let engineList = engineModule.getEngineList(translation.engine);
  let result = { isError: false, text: '' };

  do {
    const engine = engineList.shift();
    const option = engineModule.getTranslateOption(engine, translation.from, translation.to, text);
    result = await getTranslation(engine, option, table);
  } while (result.isError && autoChange && engineList.length > 0);

  return result.text;
}

// get translation
async function getTranslation(engine = '', option = {}, table = []) {
  console.log('Before:', option?.text);

  let isError = false;
  let text = '';

  try {
    switch (engine) {
      case 'Baidu':
        text = await baidu.exec(option);
        break;

      case 'Youdao':
        text = await youdao.exec(option);
        break;

      case 'Caiyun':
        text = await caiyun.exec(option);
        break;

      case 'Papago':
        text = await papago.exec(option);
        break;

      case 'DeepL':
        text = await deepl.exec(option);
        break;

      case 'GPT':
        text = await gpt.exec(option, table);
        break;

      case 'Cohere':
        text = await cohere.exec(option, table);
        break;

      case 'Gemini':
        text = await gemini.exec(option, table);
        break;

      /*
      case 'Google':
        result = await google.exec(option);
        break;
      */

      default:
        break;
    }
  } catch (error) {
    console.log(error);
    text = 'An error occured';
    isError = true;
  }

  if (typeof text !== 'string') {
    text = 'An error occured';
    isError = true;
  }

  console.log('After:', text);

  return {
    isError,
    text,
  };
}

// zh convert
function zhConvert(text = '', languageTo = '') {
  if (languageTo === engineModule.languageEnum.zht) {
    text = zhConverter.exec({ text: text, tableName: 'zh2Hant' });
  } else if (languageTo === engineModule.languageEnum.zhs) {
    text = zhConverter.exec({ text: text, tableName: 'zh2Hans' });
  }

  return text;
}

// clear code
function clearCode(text = '', table = []) {
  if (table.length > 0) {
    table.forEach((value) => {
      const code = value[0];
      text = text.replaceAll(new RegExp(`${code}+`, 'gi'), code.toUpperCase());
    });
  }

  return text;
}

// module exports
module.exports = {
  translate,
  getTranslation,
  zhConvert,
};
