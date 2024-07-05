'use strict';

const requestModule = require('../system/request-module');

const { createPrompt } = require('./ai-function');

const configModule = require('../system/config-module');

const maxTokens = 4096;

const maxHistory = 8;

const prompt_history_mgr = {
    soruce: '',
    target: '',
    prompt_history: [],

    add: function(prompt_content) {
        this.prompt_history.push({"role": "user", "content": prompt_content});
        if (this.prompt_history.length > maxHistory) {
            this.prompt_history.splice(1, 1);
        }
    },

    get: function() {
        return this.prompt_history;
    },

    reset: function (customizedKimiPrompt, source, target, table, type) {
        this.source = source;
        this.target = target;
        if (!customizedKimiPrompt) {
            console.log("Use default prompt");
            this.prompt_history = [
                {"role": "system", "content": createPrompt(source, target, table, type)},
            ];
        } else {
            console.log("Use customized prompt");
            this.prompt_history = [
                {"role": "system", "content": customizedKimiPrompt},
            ];
        }
    },

    should_reset: function (source, target) {
        return source !== this.source || target !== this.target;
    }
};

// translate
async function exec(option, table = [], type = 'sentence') {
    const response = translate(option.text, option.from, option.to, table, type);
    return response;
}

async function translate(sentence = '', source = 'Japanese', target = 'Chinese', table = [], type = 'sentence') {
    const config = configModule.getConfig();
    // const prompt = createPrompt(source, target, table, type);
    if (prompt_history_mgr.should_reset(source, target)) {
        prompt_history_mgr.reset(config.api.customizedKimiPrompt, source, target, table, type);
    }

    prompt_history_mgr.add(sentence);

    const response = await requestModule.post(
        'https://api.moonshot.cn/v1/chat/completions',
        {
          messages: prompt_history_mgr.get(),
          model: 'moonshot-v1-8k',
          maxTokens: maxTokens,
          temperature: 0.3,
        },
        {
          'Content-Type': 'application/json',
          Authorization: 'Bearer ' + config.api.kimiToken,
        }
      );
    
    console.log('prompt_history_mgr', prompt_history_mgr.get());

    return response?.data?.choices[0]?.message?.content;
}
  
  // module exports
  module.exports = {
    exec,
  };
  