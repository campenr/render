const path = require("path");

module.exports = {
    mode: 'development',
    devtool: 'inline-source-map',
    entry: [
        './src/index.ts',
    ],
    output: {
        filename: 'index.js',
        path: path.resolve(__dirname, 'public', 'static', 'build'),
        publicPath: '/static/'
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
            // {
            //     test: /\.tsx?$/,
            //     use: 'ts-loader',
            //     exclude: /node_modules/,
            // },
        ]
    },
    resolve: {
        extensions: ['.ts', '.tsx', '.js', '.jsx'],
    },
    experiments: {
        asyncWebAssembly: true,
    },
    devServer: {
        static: [
            {
                directory: path.join(__dirname, 'public'),
            },
            {
                directory: path.resolve(__dirname, 'public', 'static', 'build'),
                publicPath: '/static/',
            },
        ],
        compress: true,
        port: 9000
    }
}