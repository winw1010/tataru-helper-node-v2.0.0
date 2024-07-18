'use strict';

/*
function createPrompt(source = 'Japanese', target = 'Chinese') {
  //I want you to act as an expert translator.
  //let prompt = `You will be provided with a ${type} in ${source}, and your task is to translate it into ${target}. Your response should not be in ${source}.`;
  return `Translate the following text from ${source} to ${target} and do not include any explanation.`;
}
*/

function createTranslatePrompt(source = 'Japanese', target = 'Chinese', type = 'sentence', customPrompt = '') {
  //return `You are a professional translation machine, your job is to translate the ${source} name and sentence provided by the user into ${target} and do not include any explanation. Use homophonic translation if it is not a word or phrase in ${source}.`;
  if (customPrompt) {
    return customPrompt
      .replace(/\$\{source\}/g, source)
      .replace(/\$\{target\}/g, target)
      .replace(/\$\{type\}/g, type);
  }

  return `Translate the following ${type} from ${source} to ${target} and do not include any explanation.`;
}

function createImagePrompt() {
  return 'Copy the text from this image and do not include any explanation.';
}

// psuh chat history
function pushChatHistory(chatHistory = [], text = '', responseText = '', chatLength = 0, userName = 'user', assistantName = 'assistant') {
  chatLength = parseInt(chatLength);

  if (chatLength <= 0) return;

  chatHistory.push(
    {
      role: userName,
      content: text,
    },
    {
      role: assistantName,
      content: responseText,
    }
  );

  while (chatHistory.length > chatLength * 2) {
    chatHistory.shift();
  }
}

module.exports = {
  createTranslatePrompt,
  createImagePrompt,
  pushChatHistory,
};
