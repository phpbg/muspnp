'use strict';

const mediaRendererVolumeQuirk = require("./mediaRendererVolumeQuirk")

module.exports = [
    {
        // BubbleUPNP renderer has only 0-25 volume range
        // UPnP spec let any device have its own max
        // dlna suggest a 0-100 range
        criteria: {
            deviceType: "urn:schemas-upnp-org:device:MediaRenderer:1",
            modelDescription: "BubbleUPnP Media Renderer",
            modelName: "BubbleUPnP Media Renderer",
            modelNumber: /[0-3]\.[0-9]+\.[0-9]+/ // all versions <=3.x.x
        },
        quirks: [mediaRendererVolumeQuirk(25)]
    }
]