const fs = require('fs');
const nock = require('nock')
const deviceFactory = require('../src/DeviceFactory');
const assert = require("assert");
const MediaServer = require('../src/MediaServer');
const MediaRenderer = require('../src/MediaRenderer');

describe('Rootxml', function () {
    it('should return a MediaServer', function () {
        const rootXmlDescription = fs.readFileSync(__dirname + '/MediaServerMiniDlna.xml', {
            encoding: 'utf8',
            flag: 'r'
        });
        const device = deviceFactory.createFromXml(rootXmlDescription, 'http://foo:8200/rootDesc.xml');
        assert(device instanceof MediaServer)
    })
    it('should extract ContentDirectoryUrl (MiniDlna)', function () {
        const rootXmlDescription = fs.readFileSync(__dirname + '/MediaServerMiniDlna.xml', {
            encoding: 'utf8',
            flag: 'r'
        });
        const device = deviceFactory.createFromXml(rootXmlDescription, 'http://foo:8200/rootDesc.xml');
        assert.deepStrictEqual(device.getContentDirectoryControlUrl(), 'http://foo:8200/ctl/ContentDir')
    })
    it('should extract ContentDirectoryUrl (PlainUPnP)', function () {
        const rootXmlDescription = fs.readFileSync(__dirname + '/MediaServerPlainUPnP.xml', {
            encoding: 'utf8',
            flag: 'r'
        });
        const device = deviceFactory.createFromXml(rootXmlDescription, 'http://foo:8200/rootDesc.xml');
        assert.deepStrictEqual(device.getContentDirectoryControlUrl(), 'http://foo:8200/upnp/dev/4b8474d4-741b-4be3-9c9f-4879bbb7183f/svc /upnp-org/ContentDirectory/action')
    })
    it('should extract name', function () {
        const rootXmlDescription = fs.readFileSync(__dirname + '/MediaServerMiniDlna.xml', {
            encoding: 'utf8',
            flag: 'r'
        });
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

    it('should decode html entities', function () {
        const rootXmlDescription = fs.readFileSync(__dirname + '/MediaServerGerbera.xml', {
            encoding: 'utf8',
            flag: 'r'
        });
        const device = deviceFactory.createFromXml(rootXmlDescription, 'http://foo:8200/rootDesc.xml');
        nock('http://foo:8200')
            .post('/upnp/control/cds')
            .reply(200, '<s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/" s:encodingStyle="http://schemas.xmlsoap.org/soap/encoding/"><s:Body>\n<u:BrowseResponse xmlns:u="urn:schemas-upnp-org:service:ContentDirectory:1">\r\n<Result>&lt;?xml version=&quot;1.0&quot; encoding=&quot;UTF-8&quot;?&gt;\n&lt;DIDL-Lite xmlns=&quot;urn:schemas-upnp-org:metadata-1-0/DIDL-Lite/&quot; xmlns:dc=&quot;http://purl.org/dc/elements/1.1/&quot; xmlns:upnp=&quot;urn:schemas-upnp-org:metadata-1-0/upnp/&quot; xmlns:sec=&quot;http://www.sec.co.kr/dlna&quot;&gt;\n&lt;item id=&quot;6891966&quot; parentID=&quot;6891965&quot; restricted=&quot;1&quot;&gt;\n&lt;dc:title&gt;Atlantis&lt;/dc:title&gt;\n&lt;upnp:class&gt;object.item.audioItem.musicTrack&lt;/upnp:class&gt;\n&lt;dc:date&gt;1970-01-01&lt;/dc:date&gt;\n&lt;dc:description&gt;MediaMonkey Datenbank&lt;/dc:description&gt;\n&lt;upnp:album&gt;Rock &amp;amp; Pop Diamonds 1970&lt;/upnp:album&gt;\n&lt;upnp:artist&gt;Donovan&lt;/upnp:artist&gt;\n&lt;upnp:artist role=&quot;AlbumArtist&quot;&gt;various&lt;/upnp:artist&gt;\n&lt;upnp:date&gt;1970-01-01&lt;/upnp:date&gt;\n&lt;upnp:genre&gt;Rock/Pop&lt;/upnp:genre&gt;\n&lt;upnp:originalTrackNumber&gt;1&lt;/upnp:originalTrackNumber&gt;\n&lt;res bitrate=&quot;92949&quot; bitsPerSample=&quot;16&quot; duration=&quot;0:05:01.666&quot; nrAudioChannels=&quot;2&quot; protocolInfo=&quot;http-get:*:audio/x-flac:DLNA.ORG_OP=01;DLNA.ORG_CI=0&quot; sampleFrequency=&quot;44100&quot; sec:acodec=&quot;flac&quot; size=&quot;28039654&quot;&gt;http://192.168.1.8:55555/content/media/object_id/6891966/res_id/0/ext/file.flac&lt;/res&gt;\n&lt;/item&gt;\n&lt;/DIDL-Lite&gt;\n</Result>\r\n<NumberReturned>1</NumberReturned>\r\n<TotalMatches>1</TotalMatches>\r\n<UpdateID>229</UpdateID>\r\n</u:BrowseResponse>\r\n</s:Body> </s:Envelope>')
        return device
            .browse({id: 0, start: 0, count: 0})
            .then(response => assert.deepStrictEqual(response, {
                "NumberReturned": 1,
                "Result": [
                    {
                        "@_id": "6891966",
                        "@_parentID": "6891965",
                        "@_restricted": "1",
                        "dc:date": "1970-01-01",
                        "dc:description": "MediaMonkey Datenbank",
                        "dc:title": "Atlantis",
                        "res": {
                            "#text": "http://192.168.1.8:55555/content/media/object_id/6891966/res_id/0/ext/file.flac",
                            "@_bitrate": "92949",
                            "@_bitsPerSample": "16",
                            "@_duration": "0:05:01.666",
                            "@_nrAudioChannels": "2",
                            "@_protocolInfo": "http-get:*:audio/x-flac:DLNA.ORG_OP=01;DLNA.ORG_CI=0",
                            "@_sampleFrequency": "44100",
                            "@_sec:acodec": "flac",
                            "@_size": "28039654"
                        },
                        "upnp:album": "Rock &amp; Pop Diamonds 1970",
                        "upnp:artist": [
                            "Donovan",
                            {
                                "#text": "various",
                                "@_role": "AlbumArtist"
                            }
                        ],
                        "upnp:class": "object.item.audioItem.musicTrack",
                        "upnp:date": "1970-01-01",
                        "upnp:genre": "Rock/Pop",
                        "upnp:originalTrackNumber": 1
                    }
                ],
                "TotalMatches": 1,
                "UpdateID": 229
            }));
    })
})