const js = require("@eslint/js");
const globals = require("globals");

module.exports = [
    {
        ignores: ["forge.config.cjs"],
    },
    js.configs.recommended,
    {
        languageOptions: {
            ecmaVersion: 2021,
            sourceType: "commonjs",
            globals: {
                ...globals.node,
                ...globals.commonjs,
                ...globals.es2021,
            },
        },
    },
    // api/ - node only, no browser
    {
        files: ["api/**/*.js"],
        languageOptions: {
            globals: {
                ...globals.node,
            },
        },
    },
    // api/test/ - mocha globals
    {
        files: ["api/test/**/*.js"],
        languageOptions: {
            globals: {
                ...globals.mocha,
            },
        },
    },
    // preload.js - needs browser globals
    {
        files: ["preload.js"],
        languageOptions: {
            globals: {
                ...globals.browser,
            },
        },
    },
    // src/ - browser only, module sourceType, custom globals
    {
        files: ["src/**/*.js"],
        languageOptions: {
            sourceType: "module",
            globals: {
                ...globals.browser,
                dayjs: "readonly",
                dayjs_plugin_duration: "readonly",
            },
        },
    },
];
