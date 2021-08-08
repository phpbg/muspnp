'use strict';

const Device = require("./Device");
const xmlParser = require("fast-xml-parser");
const axios = require('./axios');
const soapErrHandler = require('./soapErrHandler');

class MediaRenderer extends Device {
    /**
     * @returns {string}
     */
    getAVTransportControlUrl() {
        const service = this.getServices()
            .find(service => /AVTransport:[0-4]$/.test(service.serviceType));
        const path = (service || {}).controlURL;
        return `${this.location.origin}${path}`;
    }

    /**
     * @returns {string}
     */
    getRenderingControlUrl() {
        const service = this.getServices()
            .find(service => /RenderingControl:[0-4]$/.test(service.serviceType));
        const path = (service || {}).controlURL;
        return `${this.location.origin}${path}`;
    }

    /**
     * @returns {string}
     */
    getAVTransportEventSubUrl() {
        const service = this.getServices()
            .find(service => /AVTransport:[0-4]$/.test(service.serviceType));
        const path = (service || {}).controlURL;
        return `${this.location.origin}${path}`;
    }

    setAVTransportURI({instanceID, currentURI, currentUriMetadata}) {
        const req = `<s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/" s:encodingStyle="http://schemas.xmlsoap.org/soap/encoding/">
    <s:Body>
        <u:SetAVTransportURI xmlns:u="urn:schemas-upnp-org:service:AVTransport:1"><InstanceID>${instanceID}</InstanceID><CurrentURI>${currentURI}</CurrentURI><CurrentURIMetaData>${currentUriMetadata}</CurrentURIMetaData></u:SetAVTransportURI>
    </s:Body>
</s:Envelope>`;
        return axios.request({
            method: 'post',
            url: this.getAVTransportControlUrl(),
            headers: {
                'CONTENT-TYPE': 'text/xml; charset="utf-8"',
                SOAPACTION: '"urn:schemas-upnp-org:service:AVTransport:1#SetAVTransportURI"'
            },
            data: req
        })
            .catch(soapErrHandler)
            .then(() => null);
    }

    play({instanceID, speed}) {
        const req = `<s:Envelope s:encodingStyle="http://schemas.xmlsoap.org/soap/encoding/" xmlns:s="http://schemas.xmlsoap.org/soap/envelope/">
  <s:Body>
    <u:Play xmlns:u="urn:schemas-upnp-org:service:AVTransport:1">
      <InstanceID>${instanceID}</InstanceID>
      <Speed>${speed}</Speed>
    </u:Play>
  </s:Body>
</s:Envelope>`;
        return axios.request({
            method: 'post',
            url: this.getAVTransportControlUrl(),
            headers: {
                'CONTENT-TYPE': 'text/xml; charset="utf-8"',
                SOAPACTION: '"urn:schemas-upnp-org:service:AVTransport:1#Play"'
            },
            data: req
        })
            .catch(soapErrHandler)
            .then(() => null);
    }

    pause({instanceID}) {
        const req = `<s:Envelope s:encodingStyle="http://schemas.xmlsoap.org/soap/encoding/" xmlns:s="http://schemas.xmlsoap.org/soap/envelope/">
  <s:Body>
    <u:Pause xmlns:u="urn:schemas-upnp-org:service:AVTransport:1">
      <InstanceID>${instanceID}</InstanceID>
    </u:Pause>
  </s:Body>
</s:Envelope>`;
        return axios.request({
            method: 'post',
            url: this.getAVTransportControlUrl(),
            headers: {
                'CONTENT-TYPE': 'text/xml; charset="utf-8"',
                SOAPACTION: '"urn:schemas-upnp-org:service:AVTransport:1#Pause"'
            },
            data: req
        })
            .catch(soapErrHandler)
            .then(() => null);
    }

    stop({instanceID}) {
        const req = `<s:Envelope s:encodingStyle="http://schemas.xmlsoap.org/soap/encoding/" xmlns:s="http://schemas.xmlsoap.org/soap/envelope/">
  <s:Body>
    <u:Stop xmlns:u="urn:schemas-upnp-org:service:AVTransport:1">
      <InstanceID>${instanceID}</InstanceID>
    </u:Stop>
  </s:Body>
</s:Envelope>`;
        return axios.request({
            method: 'post',
            url: this.getAVTransportControlUrl(),
            headers: {
                'CONTENT-TYPE': 'text/xml; charset="utf-8"',
                SOAPACTION: '"urn:schemas-upnp-org:service:AVTransport:1#Stop"'
            },
            data: req
        })
            .catch(soapErrHandler)
            .then(() => null);
    }

    seek({instanceID, unit, target}) {
        const req = `<s:Envelope s:encodingStyle="http://schemas.xmlsoap.org/soap/encoding/" xmlns:s="http://schemas.xmlsoap.org/soap/envelope/">
  <s:Body>
    <u:Seek xmlns:u="urn:schemas-upnp-org:service:AVTransport:1">
      <InstanceID>${instanceID}</InstanceID>
      <Unit>${unit}</Unit>
      <Target>${target}</Target>
    </u:Seek>
  </s:Body>
</s:Envelope>`;
        return axios.request({
            method: 'post',
            url: this.getAVTransportControlUrl(),
            headers: {
                'CONTENT-TYPE': 'text/xml; charset="utf-8"',
                SOAPACTION: '"urn:schemas-upnp-org:service:AVTransport:1#Seek"'
            },
            data: req
        })
            .catch(soapErrHandler)
            .then(() => null);
    }

    /**
     * This action returns information associated with the current position of the transport of the specified instance; it has no effect on state.
     * @param instanceID
     * @returns {Promise<{Track: number,TrackDuration: string, TrackMetaData: string, TrackURI: string,RelTime: string,AbsTime: string, RelCountAbsCount: string}>}
     * @example {
     *     Track: 1,
     *     TrackDuration: '00:04:14',
     *     TrackMetaData: '&lt;DIDL-Lite xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:upnp="urn:schemas-upnp-org:metadata-1-0/upnp/" xmlns="urn:schemas-upnp-org:metadata-1-0/DIDL-Lite/" xmlns:dlna="urn:schemas-dlna-org:metadata-1-0/"&gt;\n&lt;item id="64$24A$0$1" parentID="64$24A$0" restricted="1"&gt;&lt;dc:title&gt;Au lieu du crime&lt;/dc:title&gt;&lt;upnp:class&gt;object.item.audioItem.musicTrack&lt;/upnp:class&gt;&lt;dc:creator&gt;-M-&lt;/dc:creator&gt;&lt;dc:da
     *   te&gt;1999-01-01&lt;/dc:date&gt;&lt;upnp:artist&gt;-M-&lt;/upnp:artist&gt;&lt;upnp:album&gt;Je dis Aime&lt;/upnp:album&gt;&lt;res size="10197299" duration="0:04:14.932" bitrate="320000" sampleFrequency="44100" nrAudioChannels="2" proto
     *   colInfo="http-get:*:audio/mpeg:DLNA.ORG_PN=MP3;DLNA.ORG_OP=01;DLNA.ORG_CI=0;DLNA.ORG_FLAGS=01700000000000000000000000000000"&gt;http://192.168.1.62:8200/MediaItems/10217.mp3&lt;/res&gt;&lt;/item&gt;&lt;/DIDL-Lite&gt;',
     *     TrackURI: 'http://192.168.1.62:8200/MediaItems/10217.mp3',
     *     RelTime: '00:00:24',
     *     AbsTime: '00:00:00',
     *     RelCount: 2147483647,
     *     AbsCount: 2147483647
     *   }
     */
    getPositionInfo({instanceID}) {
        const req = `<s:Envelope s:encodingStyle="http://schemas.xmlsoap.org/soap/encoding/" xmlns:s="http://schemas.xmlsoap.org/soap/envelope/">
  <s:Body>
    <u:GetPositionInfo xmlns:u="urn:schemas-upnp-org:service:AVTransport:1">
      <InstanceID>${instanceID}</InstanceID>
    </u:GetPositionInfo>
  </s:Body>
</s:Envelope>`;
        return axios.request({
            method: 'post',
            url: this.getAVTransportControlUrl(),
            headers: {
                'CONTENT-TYPE': 'text/xml; charset="utf-8"',
                SOAPACTION: '"urn:schemas-upnp-org:service:AVTransport:1#GetPositionInfo"'
            },
            data: req
        })
            .catch(soapErrHandler)
            .then(response => {
                const data = xmlParser.parse(response.data, {ignoreAttributes: false, ignoreNameSpace: true});
                const info = data?.Envelope?.Body?.GetPositionInfoResponse;
                if (info == null) {
                    throw new Error(`Unexpected response from AVTransport: ${response.data}`)
                }
                return info;
            })
    }

    /**
     * @param instanceID
     * @returns {Promise<{CurrentTransportState: string, CurrentTransportStatus: string, CurrentSpeed: number}>}
     * @example: {CurrentTransportState: 'STOPPED', CurrentTransportStatus: 'OK', CurrentSpeed: 1}
     */
    getTransportInfo({instanceID}) {
        const req = `<s:Envelope s:encodingStyle="http://schemas.xmlsoap.org/soap/encoding/" xmlns:s="http://schemas.xmlsoap.org/soap/envelope/">
  <s:Body>
    <u:GetTransportInfo xmlns:u="urn:schemas-upnp-org:service:AVTransport:1">
      <InstanceID>${instanceID}</InstanceID>
    </u:GetTransportInfo>
  </s:Body>
</s:Envelope>`;
        return axios.request({
            method: 'post',
            url: this.getAVTransportControlUrl(),
            headers: {
                'CONTENT-TYPE': 'text/xml; charset="utf-8"',
                SOAPACTION: '"urn:schemas-upnp-org:service:AVTransport:1#GetTransportInfo"'
            },
            data: req
        })
            .catch(soapErrHandler)
            .then(response => {
                const data = xmlParser.parse(response.data, {ignoreAttributes: false, ignoreNameSpace: true});
                const info = data?.Envelope?.Body?.GetTransportInfoResponse;
                if (info == null) {
                    throw new Error(`Unexpected response from AVTransport: ${response.data}`)
                }
                return info;
            })
    }

    /**
     * @param instanceID
     * @returns {Promise<{MinValue: number, MaxValue: number}>}
     * @example: {MinValue: -15360, MaxValue: 0}
     */
    getVolumeDBRange({instanceID}) {
        const req = `<s:Envelope s:encodingStyle="http://schemas.xmlsoap.org/soap/encoding/" xmlns:s="http://schemas.xmlsoap.org/soap/envelope/">
  <s:Body>
    <u:GetVolumeDBRange xmlns:u="urn:schemas-upnp-org:service:RenderingControl:1">
      <InstanceID>${instanceID}</InstanceID>
      <Channel>Master</Channel>
    </u:GetVolumeDBRange>
  </s:Body>
</s:Envelope>`;
        return axios.request({
            method: 'post',
            url: this.getRenderingControlUrl(),
            headers: {
                'CONTENT-TYPE': 'text/xml; charset="utf-8"',
                SOAPACTION: '"urn:schemas-upnp-org:service:RenderingControl:1#GetVolumeDBRange"'
            },
            data: req
        })
            .catch(soapErrHandler)
            .then(response => {
                const data = xmlParser.parse(response.data, {ignoreAttributes: false, ignoreNameSpace: true});
                const info = data?.Envelope?.Body?.GetVolumeDBRangeResponse;
                if (info == null) {
                    throw new Error(`Unexpected response from RenderingControl: ${response.data}`)
                }
                return info;
            })
    }

    /**
     * @param instanceID
     * @returns number
     */
    getVolumeDB({instanceID}) {
        const req = `<s:Envelope s:encodingStyle="http://schemas.xmlsoap.org/soap/encoding/" xmlns:s="http://schemas.xmlsoap.org/soap/envelope/">
  <s:Body>
    <u:GetVolumeDB xmlns:u="urn:schemas-upnp-org:service:RenderingControl:1">
      <InstanceID>${instanceID}</InstanceID>
      <Channel>Master</Channel>
    </u:GetVolumeDB>
  </s:Body>
</s:Envelope>`;
        return axios.request({
            method: 'post',
            url: this.getRenderingControlUrl(),
            headers: {
                'CONTENT-TYPE': 'text/xml; charset="utf-8"',
                SOAPACTION: '"urn:schemas-upnp-org:service:RenderingControl:1#GetVolumeDB"'
            },
            data: req
        })
            .catch(soapErrHandler)
            .then(response => {
                const data = xmlParser.parse(response.data, {ignoreAttributes: false, ignoreNameSpace: true});
                const info = data?.Envelope?.Body?.GetVolumeDBResponse?.CurrentVolumeDB || data?.Envelope?.Body?.GetVolumeDBResponse?.CurrentVolume;
                if (info == null) {
                    throw new Error(`Unexpected response from RenderingControl: ${response.data}`)
                }
                return info;
            })
    }

    /**
     * @param instanceID
     * @returns number
     */
    getVolume({instanceID}) {
        const req = `<s:Envelope s:encodingStyle="http://schemas.xmlsoap.org/soap/encoding/" xmlns:s="http://schemas.xmlsoap.org/soap/envelope/">
  <s:Body>
    <u:GetVolume xmlns:u="urn:schemas-upnp-org:service:RenderingControl:1">
      <InstanceID>${instanceID}</InstanceID>
      <Channel>Master</Channel>
    </u:GetVolume>
  </s:Body>
</s:Envelope>`;
        return axios.request({
            method: 'post',
            url: this.getRenderingControlUrl(),
            headers: {
                'CONTENT-TYPE': 'text/xml; charset="utf-8"',
                SOAPACTION: '"urn:schemas-upnp-org:service:RenderingControl:1#GetVolume"'
            },
            data: req
        })
            .catch(soapErrHandler)
            .then(response => {
                const data = xmlParser.parse(response.data, {ignoreAttributes: false, ignoreNameSpace: true});
                const info = data?.Envelope?.Body?.GetVolumeResponse?.CurrentVolume;
                if (info == null) {
                    throw new Error(`Unexpected response from RenderingControl: ${response.data}`)
                }
                return info;
            })
    }

    /**
     * @param instanceID
     * @param {number} desiredVolume
     * @returns number
     */
    setVolume({instanceID, desiredVolume}) {
        desiredVolume = Math.round(desiredVolume);
        const req = `<s:Envelope s:encodingStyle="http://schemas.xmlsoap.org/soap/encoding/" xmlns:s="http://schemas.xmlsoap.org/soap/envelope/">
  <s:Body>
    <u:SetVolume xmlns:u="urn:schemas-upnp-org:service:RenderingControl:1">
      <InstanceID>${instanceID}</InstanceID>
      <Channel>Master</Channel>
      <DesiredVolume>${desiredVolume}</DesiredVolume>
    </u:SetVolume>
  </s:Body>
</s:Envelope>`;
        return axios.request({
            method: 'post',
            url: this.getRenderingControlUrl(),
            headers: {
                'CONTENT-TYPE': 'text/xml; charset="utf-8"',
                SOAPACTION: '"urn:schemas-upnp-org:service:RenderingControl:1#SetVolume"'
            },
            data: req
        })
            .catch(soapErrHandler)
            .then(() => null);
    }

    /**
     * @param instanceID
     * @param {boolean} desiredMute
     */
    setMute({instanceID, desiredMute}) {
        const mute = desiredMute ? 1 : 0;
        const req = `<s:Envelope s:encodingStyle="http://schemas.xmlsoap.org/soap/encoding/" xmlns:s="http://schemas.xmlsoap.org/soap/envelope/">
  <s:Body>
    <u:SetMute xmlns:u="urn:schemas-upnp-org:service:RenderingControl:1">
      <InstanceID>${instanceID}</InstanceID>
      <Channel>Master</Channel>
      <DesiredMute>${mute}</DesiredMute>
    </u:SetMute>
  </s:Body>
</s:Envelope>`;
        return axios.request({
            method: 'post',
            url: this.getRenderingControlUrl(),
            headers: {
                'CONTENT-TYPE': 'text/xml; charset="utf-8"',
                SOAPACTION: '"urn:schemas-upnp-org:service:RenderingControl:1#SetMute"'
            },
            data: req
        })
            .catch(soapErrHandler)
            .then(() => null);
    }
}

module.exports = MediaRenderer;