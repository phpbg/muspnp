'use strict';

const xmlParser = require('fast-xml-parser');
const MediaServer = require('./MediaServer');
const MediaRenderer = require("./MediaRenderer");

const createFromXml = function (xml, location) {
    const schema = xmlParser.parse(xml);
    const deviceType = schema?.root?.device?.deviceType;
    if (! deviceType) {
        return;
    }
    if (/MediaServer:[0-5]$/.test(deviceType)) {
        return new MediaServer(schema, location);
    }
    if (/MediaRenderer:[0-5]$/.test(deviceType)) {
        return new MediaRenderer(schema, location);
    }
}

module.exports = {
    createFromXml: createFromXml
}