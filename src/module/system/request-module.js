'use strict';

/*
// axios
const axios = require('axios').default;
*/

// net
const { net } = require('electron');

// config module
const configModule = require('./config-module');

// restricted headers
const restrictedHeaders = ['Content-Length', 'Host', 'Trailer', 'Te', 'Upgrade', 'Cookie2', 'Keep-Alive', 'Transfer-Encoding'];

// get
function get(options, headers = {}, timeout = 15000) {
    return netRequest('GET', options, null, headers, timeout, 'data');
}

// post
function post(options, data = null, headers = {}, timeout = 15000) {
    return netRequest('POST', options, data, headers, timeout, 'data');
}

// net request
async function netRequest(method, options, data, headers, timeout, returnType = 'data') {
    /*
    try {
        const axiosConfig = {
            method: method.toLowerCase(),
            url: options.protocol + '//' + options.hostname + options.path,
            headers: fixHeaders(headers),
            timeout: timeout,
        };

        if (data) {
            axiosConfig.data = data;
        }

        const response = await axios(axiosConfig);

        if (returnType === 'data') {
            return response.data;
        } else {
            return response;
        }
    } catch (error) {
        console.log(error);
        return null;
    }
    */

    // set request
    options.method = method;
    const request = net.request(options);

    // set headers
    const headerNameList = Object.getOwnPropertyNames(headers);
    for (let index = 0; index < headerNameList.length; index++) {
        const headerName = headerNameList[index];

        if (!restrictedHeaders.includes(headerName)) {
            if (headerName === 'Connection' && headers[headerName] === 'upgrade') {
                continue;
            } else {
                request.setHeader(headerName, headers[headerName]);
            }
        }
    }

    // return promise
    return new Promise((resolve) => {
        // set timeout
        const requestTimeout = setTimeout(() => {
            console.log('Request timeout');
            request.abort();
            resolve(null);
        }, timeout);

        // on request error
        request.on('error', (error) => {
            console.log(error);
            resolve(null);
        });

        // on response
        request.on('response', (response) => {
            // clear timeout
            clearTimeout(requestTimeout);

            // set chunk array
            let chunkArray = [];

            // on response error
            response.on('error', () => {
                console.log(response.statusCode + ': ' + response.statusMessage);
                resolve(null);
            });

            // on response end
            response.on('end', () => {
                // set chunk string
                const chunkString = Buffer.concat(chunkArray).toString();

                /*
                // show chunk string
                if (method === 'POST') {
                    console.log('chunk string:', chunkString + '\r\n');
                }
                */

                // resolve
                if (returnType === 'data') {
                    try {
                        resolve(JSON.parse(chunkString));
                    } catch (error) {
                        resolve(chunkString);
                    }
                } else {
                    resolve(response);
                }
            });

            // on response data
            response.on('data', (chunk) => {
                if (response.statusCode === 200) {
                    chunkArray.push(chunk);
                }
            });
        });

        // write data
        if (data) {
            request.write(data);
        }

        // end request
        request.end();
    });
}

// get cookie
async function getCookie(options, targetRegExp = /(?<target>.*)/, headers = {}, timeout = 15000) {
    return new Promise((resolve) => {
        netRequest('GET', options, null, headers, timeout, 'response').then((response) => {
            //console.log('headers', response?.headers);
            //console.log('set-cookie', response?.headers?.['set-cookie']);
            const cookieString = response?.headers?.['set-cookie']?.join('; ') || '';

            if (Array.isArray(targetRegExp)) {
                const targetArray = [];
                for (let index = 0; index < targetRegExp.length; index++) {
                    const regex = targetRegExp[index];
                    const target = regex.exec(cookieString)?.groups?.target;
                    if (target) {
                        targetArray.push(target);
                    }
                }
                resolve(targetArray.join('; '));
            } else {
                resolve(targetRegExp.exec(cookieString)?.groups?.target);
            }
        });
    });
}

/*
// fix headers
function fixHeaders(headers = {}) {
    const headerNameList = Object.getOwnPropertyNames(headers);
    let fixedHeaders = {};

    for (let index = 0; index < headerNameList.length; index++) {
        const headerName = headerNameList[index];

        if (!restrictedHeaders.includes(headerName)) {
            if (headerName === 'Connection' && headers[headerName] === 'upgrade') {
                continue;
            } else {
                fixedHeaders[headerName] = headers[headerName];
            }
        }
    }

    return fixedHeaders;
}
*/

// get expiry date
function getExpiryDate() {
    return new Date().getTime() + 21600000;
}

// get sec-ch-ua
function getSCU() {
    const scu = configModule.getConfig()?.system?.scu;
    return scu ? scu : '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"';
}

// get user agent
function getUserAgent() {
    const userAgent = configModule.getConfig()?.system?.userAgent;
    return userAgent ? userAgent : 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
}

// to parameters
function toParameters(data = {}) {
    const dataNames = Object.getOwnPropertyNames(data);
    let parameters = [];

    for (let index = 0; index < dataNames.length; index++) {
        const dataName = dataNames[index];
        parameters.push(`${dataName}=${data[dataName]}`);
    }

    return parameters.join('&');
}

// module exports
module.exports = {
    get,
    post,
    getCookie,
    getExpiryDate,
    getSCU,
    getUserAgent,
    toParameters,
};
