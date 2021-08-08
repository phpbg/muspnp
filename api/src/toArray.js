'use strict';

/**
 * Make sure the returned data is an array
 * @param data
 * @returns {array}
 */
module.exports = (data) => {
    return data == null ? [] : Array.isArray(data) ? data : [data];
}