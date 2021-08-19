const fs = require('fs');
const nock = require('nock')
const deviceFactory = require('../src/DeviceFactory');
const assert = require("assert");
const MediaServer = require('../src/MediaServer');
const MediaRenderer = require('../src/MediaRenderer');

describe('Rootxml', function () {
    it('should return a MediaServer', function () {
        const rootXmlDescription = fs.readFileSync(__dirname + '/MediaServerMiniDlna.xml', {encoding: 'utf8', flag: 'r'});
        const device = deviceFactory.createFromXml(rootXmlDescription, 'http://foo:8200/rootDesc.xml');
        assert(device instanceof MediaServer)
    })
    it('should extract ContentDirectoryUrl (MiniDlna)', function () {
        const rootXmlDescription = fs.readFileSync(__dirname + '/MediaServerMiniDlna.xml', {encoding: 'utf8', flag: 'r'});
        const device = deviceFactory.createFromXml(rootXmlDescription, 'http://foo:8200/rootDesc.xml');
        assert.deepStrictEqual(device.getContentDirectoryControlUrl(), 'http://foo:8200/ctl/ContentDir')
    })
    it('should extract ContentDirectoryUrl (PlainUPnP)', function () {
        const rootXmlDescription = fs.readFileSync(__dirname + '/MediaServerPlainUPnP.xml', {encoding: 'utf8', flag: 'r'});
        const device = deviceFactory.createFromXml(rootXmlDescription, 'http://foo:8200/rootDesc.xml');
        assert.deepStrictEqual(device.getContentDirectoryControlUrl(), 'http://foo:8200/upnp/dev/4b8474d4-741b-4be3-9c9f-4879bbb7183f/svc /upnp-org/ContentDirectory/action')
    })
    it('should extract name', function () {
        const rootXmlDescription = fs.readFileSync(__dirname + '/MediaServerMiniDlna.xml', {encoding: 'utf8', flag: 'r'});
        const device = deviceFactory.createFromXml(rootXmlDescription, 'http://foo:8200/rootDesc.xml');
        assert.deepStrictEqual(device.getName(), 'MyNAS')
    })

    it('should return a MediaRenderer', function () {
        const rootXmlDescription = fs.readFileSync(__dirname + '/MediaRendererKodi.xml', {encoding: 'utf8', flag: 'r'});
        const device = deviceFactory.createFromXml(rootXmlDescription, 'http://foo:8200/rootDesc.xml');
        assert(device instanceof MediaRenderer)
    })
    it('should extract getAVTransportControlUrl', function () {
        const rootXmlDescription = fs.readFileSync(__dirname + '/MediaRendererKodi.xml', {encoding: 'utf8', flag: 'r'});
        const device = deviceFactory.createFromXml(rootXmlDescription, 'http://foo:8200/rootDesc.xml');
        assert.deepStrictEqual(device.getAVTransportControlUrl(), 'http://foo:8200/AVTransport/c20294a9-0cda-311e-d084-9d3ab09d27be/control.xml')
    })
    it('should extract getRenderingControlUrl', function () {
        const rootXmlDescription = fs.readFileSync(__dirname + '/MediaRendererKodi.xml', {encoding: 'utf8', flag: 'r'});
        const device = deviceFactory.createFromXml(rootXmlDescription, 'http://foo:8200/rootDesc.xml');
        assert.deepStrictEqual(device.getRenderingControlUrl(), 'http://foo:8200/RenderingControl/c20294a9-0cda-311e-d084-9d3ab09d27be/control.xml')
    })

    it('should return volume', function () {
        const rootXmlDescription = fs.readFileSync(__dirname + '/MediaRendererKodi.xml', {
            encoding: 'utf8',
            flag: 'r'
        });
        const device = deviceFactory.createFromXml(rootXmlDescription, 'http://foo:8200/rootDesc.xml');
        nock('http://foo:8200')
            .post('/RenderingControl/c20294a9-0cda-311e-d084-9d3ab09d27be/control.xml')
            .reply(200, '<?xml version="1.0" encoding="utf-8" standalone="yes"?><s:Envelope s:encodingStyle="http://schemas.xmlsoap.org/soap/encoding/" xmlns:s="http://schemas.xmlsoap.org/soap/envelope/"><s:Body><u:GetVolumeResponse xmlns:u="urn:schemas-upnp-org:service:RenderingControl:1"><CurrentVolume>25</CurrentVolume></u:GetVolumeResponse></s:Body></s:Envelope>')
        return device
            .getVolume({instanceID: 0})
            .then(volume => assert.deepStrictEqual(volume, 25));
    })

    it('should apply quirks on bubble renderer', function () {
        const rootXmlDescription = fs.readFileSync(__dirname + '/MediaRendererBubble.xml', {
            encoding: 'utf8',
            flag: 'r'
        });
        const device = deviceFactory.createFromXml(rootXmlDescription, 'http://foo:8200/rootDesc.xml');
        nock('http://foo:8200')
            .post('/dev/9f126244-b23e-4cde-8e97-6d5a5f3f5f42/svc/upnp-org/RenderingControl/action')
            .reply(200, '<?xml version="1.0" encoding="utf-8" standalone="yes"?><s:Envelope s:encodingStyle="http://schemas.xmlsoap.org/soap/encoding/" xmlns:s="http://schemas.xmlsoap.org/soap/envelope/"><s:Body><u:GetVolumeResponse xmlns:u="urn:schemas-upnp-org:service:RenderingControl:1"><CurrentVolume>25</CurrentVolume></u:GetVolumeResponse></s:Body></s:Envelope>')
        return device
            .getVolume({instanceID: 0})
            .then(volume => assert.deepStrictEqual(volume, 100));
    })
})