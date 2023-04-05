const path = require("path");

module.exports = {
    mode: 'production',
    entry: [
        './src/index.ts',
    ],
    output: {
        filename: 'index.js',
        path: path.resolve(__dirname)
    },
    module: {
        rules: [
            {
                test: /\.[jt]sx?$/,
                loader: 'esbuild-loader',
                options: {
                    target: 'es2015'
                },
            },
        ]
    },
    experiments: {
        asyncWebAssembly: true,
        syncWebAssembly: true
    },
    devServer: {
        static: {
            directory: path.join(__dirname),
        },
        compress: true,
        port: 9000
    }
}