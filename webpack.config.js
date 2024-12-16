const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyPlugin = require('copy-webpack-plugin');
const webpack = require('webpack');
const Dotenv = require('dotenv-webpack');

module.exports = {
 mode: 'production',
 entry: {
   popup: path.resolve(__dirname, 'src/index.tsx'),
   background: path.resolve(__dirname, 'src/background.js'),
   contentScript: path.resolve(__dirname, 'src/contentScript.ts') 
 },
 output: {
   path: path.resolve(__dirname, 'build'),
   filename: '[name].js',
   clean: true
 },
 resolve: {
   extensions: ['.tsx', '.ts', '.js', '.jsx'],
   alias: {
     '@': path.resolve(__dirname, 'src/'),
   }
 },
 module: {
   rules: [
     {
       test: /\.tsx?$/,
       use: 'ts-loader',
       exclude: /node_modules/
     },
     {
       test: /\.css$/,
       use: ['style-loader', 'css-loader', 'postcss-loader']
     },
     {
       test: /\.svg$/,
       type: 'asset/resource'
     },
     {
       test: /\.(png|jpg|jpeg|gif)$/i,
       type: 'asset/resource'
     },
     {
      test: /\.(png|jpg|jpeg|gif|webp)$/i,
      type: 'asset/resource'
    }
   ]
 },
 plugins: [
   new Dotenv({
     systemvars: true,
   }),
   new webpack.DefinePlugin({
     'process.env': JSON.stringify(process.env)
   }),
   new HtmlWebpackPlugin({
     template: path.resolve(__dirname, 'public/index.html'),
     chunks: ['popup']
   }),
   new CopyPlugin({
     patterns: [
       { 
         from: "public/manifest.json",
         to: "manifest.json"
       },
       { 
         from: "public/icon.png",
         to: "icon.png"
       },
       {
         from: "public/cattributes",
         to: "cattributes"
       },
       {
         from: "src/background.js",
         to: "background.js"
       }
     ]
   })
 ]
};