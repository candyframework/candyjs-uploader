"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs = require("fs");
const formidable = require("formidable");
const FileHelper = require("candyjs/helpers/FileHelper");
const StringHelper = require("candyjs/helpers/StringHelper");
const TimeHelper = require("candyjs/helpers/TimeHelper");
/**
 * 文件上传
 */
class Index {
    constructor(options = null) {
        /**
         * @property {any} configs 配置
         */
        this.configs = {
            permission: 0o777,
            /**
             * 保存文件的基准目录 如 '/www/upload' 不能为空
             */
            basePath: '',
            subPath: '',
            /**
             * 是否在上传目录按日期创建子目录 为空表示不创建
             */
            rotatePattern: 'ym',
            /**
             * 允许的文件类型
             */
            allowTypes: 'image/jpg, image/jpeg, image/png',
            /**
             * Byte - 1 MB
             */
            maxSize: 1048576,
            /**
             * 随机生成文件名
             */
            useRandomName: true,
            fileNameLength: 20,
            /**
             * 指定文件名 useRandomName === false 时生效
             */
            givenName: ''
        };
        /**
         * @property {String} savePath 上传路径
         */
        this.savePath = '';
        this.initOptions(options);
    }
    initOptions(options = null) {
        if (null === options) {
            return;
        }
        for (let k in options) {
            this.configs[k] = options[k];
        }
        this.configs.basePath = StringHelper.rTrimChar(this.configs.basePath, '/');
        this.configs.subPath = StringHelper.rTrimChar(this.configs.subPath, '/');
    }
    /**
     * 初始化文件名
     */
    generateFileName() {
        let str = 'abcdefghijklmnopqrstuvwxyz0123456789';
        let chars = '';
        if (this.configs.useRandomName) {
            // 14 是文件名的时间戳前缀
            for (let i = 0; i < this.configs.fileNameLength - 14; i++) {
                chars += str[Math.floor(Math.random() * str.length)];
            }
            chars = chars + TimeHelper.format('ymdhis');
        }
        else {
            chars = this.configs.givenName;
        }
        return chars;
    }
    /**
     * 根据配置创建上传目录 basePath + subPath + rotatePattern
     */
    async initSavePath() {
        this.savePath = this.configs.basePath;
        if ('' !== this.configs.subPath) {
            this.savePath = this.savePath + '/' + this.configs.subPath;
        }
        if ('' !== this.configs.rotatePattern) {
            this.savePath = this.savePath + '/' + TimeHelper.format(this.configs.rotatePattern);
        }
        return new Promise((resolve, reject) => {
            FileHelper.createDirectory(this.savePath, this.configs.permission, () => {
                resolve();
            });
        });
    }
    /**
     * 上传文件
     *
     * @param {any} req
     * @param {String} fileName 上传文件名
     */
    async upload(req, fileName) {
        await this.initSavePath();
        return new Promise((resolve, reject) => {
            const form = formidable({
                uploadDir: this.savePath
            });
            form.parse(req, (err, fields, files) => {
                if (null !== err) {
                    resolve({
                        status: 1,
                        data: null,
                        message: err.message
                    });
                    return;
                }
                let file = files[fileName];
                // type
                if (-1 === this.configs.allowTypes.indexOf(file.type)) {
                    fs.unlink(file.path, () => { });
                    resolve({
                        status: 2,
                        data: null,
                        message: 'The file type is not allowed'
                    });
                    return;
                }
                // size
                if (file.size > this.configs.maxSize) {
                    fs.unlink(file.path, () => { });
                    resolve({
                        status: 2,
                        data: null,
                        message: 'The file size exceeds limit'
                    });
                    return;
                }
                // ok
                let newPath = this.savePath + '/' + this.generateFileName() + file.type.replace('image/', '.');
                fs.rename(file.path, newPath, (err) => {
                    resolve({
                        status: 0,
                        data: newPath.replace(this.configs.basePath, ''),
                        message: ''
                    });
                });
            });
        });
    }
    /**
     * 上传 base64 图片
     *
     * @param {String} base64Str 编码的字符串
     */
    async saveBase64(base64Str) {
        await this.initSavePath();
        return new Promise((resolve, reject) => {
            let position = base64Str.indexOf(',');
            let dataBuffer = Buffer.from(base64Str.substring(position + 1), 'base64');
            let ext = base64Str.substring(0, position).replace('data:image/', '.').replace(';base64', '');
            let newPath = this.savePath + '/' + this.generateFileName() + ext;
            fs.writeFile(newPath, dataBuffer, (err) => {
                resolve({
                    status: 0,
                    data: newPath.replace(this.configs.basePath, ''),
                    message: ''
                });
            });
        });
    }
}
exports.default = Index;
