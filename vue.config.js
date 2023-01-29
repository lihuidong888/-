const { defineConfig } = require("@vue/cli-service");
module.exports = defineConfig({
    transpileDependencies: true,
    lintOnSave: true,
    devServer: {
        headers: {
            "Access-Control-Allow-Headers":
            "Origin,X-Requested-With,Content-Type,Accept",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
            "Cross-Origin-Embedder-Policy": "require-corp",
            "Cross-Origin-Opener-Policy": "same-origin",
            "cross-origin-resource-policy": "cross-origin",
        },
        proxy: {},
    },
});
