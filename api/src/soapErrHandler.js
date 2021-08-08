'use strict';

const xmlParser = require("fast-xml-parser");
const SoapError = require("./SoapError");
module.exports = function (err) {
    const rawXml = err?.response?.data;
    if (rawXml) {
        const data = xmlParser.parse(rawXml, {ignoreAttributes: false, ignoreNameSpace: true});
        if (data?.Envelope?.Body?.Fault?.detail?.UPnPError) {
            throw new SoapError(JSON.stringify(data?.Envelope?.Body?.Fault?.detail?.UPnPError));
        }
    }
    throw err;
}