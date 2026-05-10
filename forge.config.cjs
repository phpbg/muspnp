module.exports = {
  packagerConfig: {},
  makers: [
    {
      name: '@electron-forge/maker-squirrel',
      config: {
        name: 'muspnp'
      }
    },
    {
      name: '@electron-forge/maker-zip',
      platforms: ['darwin']
    },
    {
      name: '@electron-forge/maker-deb',
      config: {
        options: {
          description: 'Play your music on your devices at home.',
          maintainer: 'Samuel CHEMLA',
          homepage: 'https://github.com/phpbg/muspnp#readme',
          version: '1.2.1',
          categories: ['Audio', 'Video', 'AudioVideo']
        }
      }
    },
    {
      name: '@electron-forge/maker-rpm',
      config: {
        options: {
          description: 'Play your music on your devices at home.',
          homepage: 'https://github.com/phpbg/muspnp#readme',
          version: '1.2.1',
          categories: ['Audio', 'Video', 'AudioVideo']
        }
      }
    }
  ]
};

