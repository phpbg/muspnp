'use strict';

const xmlParser = require("fast-xml-parser");
const Device = require("./Device");
const toArray = require("./toArray");
const axios = require('./axios');
const soapErrHandler = require('./soapErrHandler');
const _ = require('lodash')

class MediaServer extends Device {
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
        const req = `<?xml version="1.0" encoding="utf-8"?>
<s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/" s:encodingStyle="http://schemas.xmlsoap.org/soap/encoding/">
	<s:Body>
		<u:Browse xmlns:u="urn:schemas-upnp-org:service:ContentDirectory:1">
			<ObjectID>${id}</ObjectID>
			<BrowseFlag>BrowseDirectChildren</BrowseFlag>
			<Filter>*</Filter>
			<StartingIndex>${start}</StartingIndex>
			<RequestedCount>${count}</RequestedCount>
			<SortCriteria></SortCriteria>
		</u:Browse>
	</s:Body>
</s:Envelope>`;
        return axios.request({
            method: 'post',
            url: this.getContentDirectoryControlUrl(),
            headers: {
                'CONTENT-TYPE': 'text/xml; charset="utf-8"',
                SOAPAction: '"urn:schemas-upnp-org:service:ContentDirectory:1#Browse"'
            },
            data: req
        })
            .catch(soapErrHandler)
            .then((response) => {
                const data = xmlParser.parse(response.data, {ignoreAttributes: false, ignoreNameSpace: true});
                const browseResponse = data?.Envelope?.Body?.BrowseResponse;
                const didlResult = _.unescape(browseResponse?.Result);
                const result = xmlParser.parse(didlResult, {ignoreAttributes: false});
                const container = toArray(result["DIDL-Lite"].container);
                container.push(...(toArray(result["DIDL-Lite"].item)));
                browseResponse.Result = container;
                return browseResponse;
            });
    }

    /**
     * Return metadata as plain xml string and object
     * @param id
     * @returns {Promise<{xml: string, object: object}>}
     */
    getMetadata({id}) {
        const req = `<?xml version="1.0" encoding="utf-8"?>
<s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/" s:encodingStyle="http://schemas.xmlsoap.org/soap/encoding/">
	<s:Body>
		<u:Browse xmlns:u="urn:schemas-upnp-org:service:ContentDirectory:1">
			<ObjectID>${id}</ObjectID>
			<BrowseFlag>BrowseMetadata</BrowseFlag>
			<Filter>*</Filter>
			<StartingIndex>0</StartingIndex>
			<RequestedCount>0</RequestedCount>
			<SortCriteria></SortCriteria>
		</u:Browse>
	</s:Body>
</s:Envelope>`;
        return axios.request({
            method: 'post',
            url: this.getContentDirectoryControlUrl(),
            headers: {
                'CONTENT-TYPE': 'text/xml; charset="utf-8"',
                SOAPAction: '"urn:schemas-upnp-org:service:ContentDirectory:1#Browse"'
            },
            data: req
        })
            .catch(soapErrHandler)
            .then((response) => {
                const data = xmlParser.parse(response.data, {ignoreAttributes: false, ignoreNameSpace: true});
                const browseResponse = data?.Envelope?.Body?.BrowseResponse;
                const didlResult = _.unescape(browseResponse?.Result);
                const result = xmlParser.parse(didlResult, {ignoreAttributes: false});
                return {
                    object: result["DIDL-Lite"].container || result["DIDL-Lite"].item,
                    xml: browseResponse?.Result
                }
            });
    }

    /**
     * @returns {Promise<string | undefined>}
     */
    getSearchCapabilities() {
        const req = `<?xml version="1.0" encoding="utf-8"?>
<s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/" s:encodingStyle="http://schemas.xmlsoap.org/soap/encoding/">
	<s:Body>
		<u:GetSearchCapabilities xmlns:u="urn:schemas-upnp-org:service:ContentDirectory:1">
		</u:GetSearchCapabilities>
	</s:Body>
</s:Envelope>`;
        return axios.request({
            method: 'post',
            url: this.getContentDirectoryControlUrl(),
            headers: {
                'CONTENT-TYPE': 'text/xml; charset="utf-8"',
                SOAPAction: '"urn:schemas-upnp-org:service:ContentDirectory:1#GetSearchCapabilities"'
            },
            data: req
        })
            .catch(soapErrHandler)
            .then((response) => {
                const data = xmlParser.parse(response.data, {ignoreAttributes: false, ignoreNameSpace: true});
                return data?.Envelope?.Body?.GetSearchCapabilitiesResponse?.SearchCaps;
            });
    }

    search({id, start, count, search}) {
        const req = `<?xml version="1.0" encoding="utf-8"?>
<s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/" s:encodingStyle="http://schemas.xmlsoap.org/soap/encoding/">
	<s:Body>
		<u:Search xmlns:u="urn:schemas-upnp-org:service:ContentDirectory:1">
		    <ContainerID>${id}</ContainerID>
            <SearchCriteria>${search}</SearchCriteria>
            <Filter>*</Filter>
            <StartingIndex>${start}</StartingIndex>
            <RequestedCount>${count}</RequestedCount>
            <SortCriteria></SortCriteria>
		</u:Search>
	</s:Body>
</s:Envelope>`;
        return axios.request({
            method: 'post',
            url: this.getContentDirectoryControlUrl(),
            headers: {
                'CONTENT-TYPE': 'text/xml; charset="utf-8"',
                SOAPAction: '"urn:schemas-upnp-org:service:ContentDirectory:1#Search"'
            },
            data: req
        })
            .catch(soapErrHandler)
            .then((response) => {
                const data = xmlParser.parse(response.data, {ignoreAttributes: false, ignoreNameSpace: true});
                const searchResponse = data?.Envelope?.Body?.SearchResponse;
                const didlResult = _.unescape(searchResponse?.Result);
                const result = xmlParser.parse(didlResult, {ignoreAttributes: false});
                const container = toArray(result["DIDL-Lite"].container);
                container.push(...(toArray(result["DIDL-Lite"].item)));
                searchResponse.Result = container;
                return searchResponse;
            });
    }
}

module.exports = MediaServer;