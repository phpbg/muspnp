'use strict';

const { XMLParser } = require('fast-xml-parser');
const xmlParser = new XMLParser({ignoreAttributes: false, removeNSPrefix: true, processEntities: false});
const SoapError = require("./SoapError");
module.exports = function (err) {
    const rawXml = err?.response?.data;
    if (rawXml) {
        const data = xmlParser.parse(rawXml);
        if (data?.Envelope?.Body?.Fault?.detail?.UPnPError) {
            throw new SoapError(JSON.stringify(data?.Envelope?.Body?.Fault?.detail?.UPnPError));
        }
    }
    throw err;
}