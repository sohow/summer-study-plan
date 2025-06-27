import path from 'path';
import { fileURLToPath } from 'url';
import HtmlWebpackPlugin from 'html-webpack-plugin';
import MiniCssExtractPlugin from 'mini-css-extract-plugin';
import CssMinimizerPlugin from 'css-minimizer-webpack-plugin';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default (env, argv) => {
    const isProduction = argv.mode === 'production';

    return {
        mode: isProduction ? 'production' : 'development',
        // 定义两个入口点：一个给主应用(index.html)，一个给登录页(login.html)
        entry: {
            main: './public/js/main.js',
            login: './public/js/auth.js'
        },
        output: {
            // 所有的输出文件都放到 dist 目录下
            path: path.resolve(__dirname, 'dist'),
            // 使用 [contenthash] 实现浏览器缓存优化
            filename: 'js/[name].[contenthash].js',
            clean: true, // 在每次构建前清理 /dist 文件夹
        },
        devtool: isProduction ? 'source-map' : 'eval-source-map',
        module: {
            rules: [
                {
                    test: /\.css$/i,
                    // 使用 MiniCssExtractPlugin.loader 将 CSS 提取为单独文件
                    use: [MiniCssExtractPlugin.loader, 'css-loader'],
                },
            ],
        },
        plugins: [
            new MiniCssExtractPlugin({
                filename: 'css/[name].[contenthash].css',
            }),
            // 为主应用生成 index.html
            new HtmlWebpackPlugin({
                template: './public/index.html',
                filename: 'index.html',
                chunks: ['main'], // 只引入 main 相关的 JS 和 CSS
            }),            
            // 为登录页生成 login.html
            new HtmlWebpackPlugin({
                template: './public/login.html',
                filename: 'login.html',
                chunks: ['login'], // 只引入 login 相关的 JS 和 CSS
            }),
        ],
        optimization: {
            minimizer: [
                `...`, // 继承 Webpack 默认的 JS 压缩器 (TerserPlugin)
                new CssMinimizerPlugin(), // 添加 CSS 压缩器
            ],
        },
    };
};