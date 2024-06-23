const path = require("path");

const MiniCssExtractPlugin = require('mini-css-extract-plugin');


module.exports = {
    mode: 'development',
    devtool: 'inline-source-map',
    entry: {
        'main': './src/examples/main.scss',
        '2D-ants': './src/examples/2D-ants.ts',
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
                test: /\.(scss|css)$/,
                use: [
                    MiniCssExtractPlugin.loader,
                    'css-loader',
                    {
                        loader: 'postcss-loader',
                        options: {
                            postcssOptions: {
                                plugins: [
                                    require('autoprefixer'),
                                    require('tailwindcss'),
                                ],
                            },
                        },
                    },
                    'sass-loader',
                ],
            },
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
    plugins: [
        new MiniCssExtractPlugin({
            filename: 'main.css',
        }),
    ],
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
        watchFiles: ['src/**/*', 'public/**/*'],
        compress: true,
        port: 9001,
    }
}
