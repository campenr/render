const path = require("path");

module.exports = {
    mode: 'development',
    devtool: 'inline-source-map',
    entry: {
        '2D-bouncing-square': './src/examples/2D-bouncing-square.ts',
        '2D-image': './src/examples/2D-image.ts',
    },
    output: {
        filename: '[name].js',
        path: path.resolve(__dirname, 'public', 'static', 'build'),
        publicPath: '/static/'
    },
    module: {
        rules: [
            {
                test: /\.svelte$/,
                use: {
                    loader: 'svelte-loader',
                },
            },
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
        extensions: ['.ts', '.tsx', '.js', '.jsx', '.svelte'],
        conditionNames: ['require', 'svelte'],
    },
    experiments: {
        asyncWebAssembly: true,
    },
    devServer: {
        static: [
            {
                directory: path.join(__dirname, 'public', 'examples'),
                serveIndex: true,
            },
            {
                directory: path.resolve(__dirname, 'public', 'static', 'build'),
                publicPath: '/static/',
            },
            {
                directory: path.resolve(__dirname, 'public', 'static', 'image'),
                publicPath: '/static/image/',
            },
        ],
        compress: true,
        port: 9000
    }
}
