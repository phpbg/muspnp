'use strict';

const { XMLParser } = require('fast-xml-parser');
const xmlParser = new XMLParser({ignoreAttributes: false, removeNSPrefix: true, processEntities: false});
const MediaServer = require('./MediaServer');
const MediaRenderer = require('./MediaRenderer');
const deviceQuirks = require('./deviceQuirks');
const logger = require('./loggerFactory')();

const createFromXml = function (xml, location) {
    const schema = xmlParser.parse(xml);
    const deviceType = schema?.root?.device?.deviceType;
    if (! deviceType) {
        return;
    }
    if (/MediaServer:[0-5]$/.test(deviceType)) {
        return applyQuirks(new MediaServer(schema, location));
    }
    if (/MediaRenderer:[0-5]$/.test(deviceType)) {
        return applyQuirks(new MediaRenderer(schema, location));
    }
}

const applyQuirks = function(target) {
    deviceQuirks.forEach((quirk) => {
        if (Object.keys(quirk.criteria).every(property => {
            if (quirk.criteria[property] instanceof RegExp) {
                return quirk.criteria[property].test(target.schema?.root?.device[property])
            }
            return quirk.criteria[property] === target.schema?.root?.device[property]
        })) {
            logger("Apply quirks %O on %s", quirk.criteria, target.getName())
            quirk.quirks.forEach(quirkFunction => quirkFunction(target))
        }
    })
    return target;
}

module.exports = {
    createFromXml: createFromXml
}