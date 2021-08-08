'use strict';
const axios = require('axios');
const logger = require('./loggerFactory')();

axios.interceptors.request.use(request => {
    logger(`Request: ${request.method.toUpperCase()} | ${request.url} | ${JSON.stringify(request.data || '')}}`);
    return request;
}, error => {
    logger('Request error', error.message);
    return Promise.reject(error);
})

axios.interceptors.response.use(response => {
    logger(`Response: ${response.status} | ${JSON.stringify(response.data)}`);
    return response;
}, error => {
    if (error.response) {
        logger(`Response error : ${error.response.status} | ${JSON.stringify(error.response.data)}`);
    } else {
        logger('Error', error.message);
    }
    return Promise.reject(error);
})

module.exports = axios;