'use strict';

const toArray = require("./toArray");

class Device {
    /**
     * @param {object} schema
     * @param {string} location
     */
    constructor(schema, location) {
        this.schema = schema;
        this.location = new URL(location);
    }

    /**
     * @returns {string}
     */
    getName() {
        return this.schema?.root?.device?.friendlyName || this.schema?.root?.device?.modelName;
    }

    /**
     * @returns {array}
     */
    getServices() {
        return toArray(this.schema?.root?.device?.serviceList?.service)
    }
}

module.exports = Device;