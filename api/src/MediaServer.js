'use strict';

const soap = require("soap");
const xmlParser = require("fast-xml-parser");
const Device = require("./Device");
const toArray = require("./toArray");
const logger = require("./loggerFactory")();

class MediaServer extends Device {
    getSoapClient() {
        if (this._client) {
            return Promise.resolve(this._client);
        }
        return soap.createClientAsync(this.getWsdl(), {
            escapeXML: true,
            endpoint: this.getContentDirectoryControlUrl()
        }).then((client) => {
            client.on('request', (xml) => logger('Soap request:%s', xml));
            client.on('response', (xml) => logger('Soap response:%s', xml));
            this._client = client;
            return client;
        })
    }

    getWsdl() {
        return __dirname + '/../schemas/mediaServer.wsdl';
    }

    /**
     * @returns {string}
     */
    getContentDirectoryControlUrl() {
        const service = this.getServices()
            .find(service => /ContentDirectory:[0-4]$/.test(service.serviceType));
        const path = (service || {}).controlURL;
        return `${this.location.origin}${path}`;
    }

    browse({id, start, count}) {
        return this
            .getSoapClient()
            .then((client) => client.BrowseAsync({
                    ObjectID: id,
                    BrowseFlag: 'BrowseDirectChildren',
                    Filter: '*',
                    StartingIndex: start,
                    RequestedCount: count,
                    SortCriteria: ''
                })
            )
            .then((response) => {
                const data = response[0];
                const result = xmlParser.parse(data.Result, {ignoreAttributes: false});
                const container = toArray(result["DIDL-Lite"].container);
                container.push(...(toArray(result["DIDL-Lite"].item)));
                data.Result = container;
                return data;
            });
    }

    /**
     * Return metadata as plain xml string and object
     * @param id
     * @returns {Promise<{xml: string, object: object}>}
     */
    getMetadata({id}) {
        return this.getSoapClient()
            .then((client) =>
                client.BrowseAsync({
                    ObjectID: id,
                    BrowseFlag: 'BrowseMetadata',
                    Filter: '*',
                    StartingIndex: 0,
                    RequestedCount: 0,
                    SortCriteria: ''
                })
            )
            .then((response) => {
                const data = response[0];
                const result = xmlParser.parse(data.Result, {ignoreAttributes: false});
                return {
                    object: result["DIDL-Lite"].container || result["DIDL-Lite"].item,
                    xml: data.Result
                }
            });
    }

    /**
     * @returns {Promise<string | null>}
     */
    getSearchCapabilities() {
        return this.getSoapClient()
            .then((client) => client.GetSearchCapabilitiesAsync())
            .then((response) => {
                const data = response[0];
                return data?.SearchCaps ? data.SearchCaps : null;
            });
    }

    search({id, start, count, search}) {
        return this
            .getSoapClient()
            .then((client) => client.SearchAsync({
                    ContainerID: id,
                    SearchCriteria: search,
                    Filter: '*',
                    StartingIndex: start,
                    RequestedCount: count,
                    SortCriteria: ''
                })
            )
            .then((response) => {
                const data = response[0];
                const result = xmlParser.parse(data.Result, {ignoreAttributes: false});
                const container = toArray(result["DIDL-Lite"].container);
                container.push(...(toArray(result["DIDL-Lite"].item)));
                data.Result = container;
                return data;
            });
    }
}

module.exports = MediaServer;