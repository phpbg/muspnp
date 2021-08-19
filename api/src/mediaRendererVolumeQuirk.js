'use strict';

/**
 * Allow to set specifix max volume
 * @param {number} maxVol
 */
module.exports = function(maxVol) {
    return function (target) {
        const targetGetVolume = target.getVolume.bind(target)
        const targetSetVolume = target.setVolume.bind(target);
        target.getVolume = (...args) => {
            return targetGetVolume(...args).then((volume) => Math.round(100 * volume / maxVol))
        }
        target.setVolume = ({desiredVolume, ...args}) => {
            const normalizedVol = Math.round(maxVol * desiredVolume / 100);
            return targetSetVolume({desiredVolume: normalizedVol, ...args});
        }
    }
}