"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs = require("fs");
const formidable = require("formidable");
const FileHelper = require("candyjs/helpers/FileHelper");
const TimeHelper = require("candyjs/helpers/TimeHelper");
const StringHelper = require("candyjs/helpers/StringHelper");
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
             * 保存文件的基准目录 不能为空 如 '/www/upload'
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
            maxFileSize: 1048576,
            /**
             * 随机生成文件名的长度
             */
            fileNameLength: 20,
            /**
             * 指定文件名
             */
            givenName: ''
        };
        /**
         * @property {String} savePath 上传路径
         */
        this.savePath = '';
        this.initOptions(options);
    }
    /**
     * @private
     */
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
     *
     * @private
     */
    generateFileName() {
        let str = 'abcdefghijklmnopqrstuvwxyz0123456789';
        let chars = '';
        // 没有指定名字 就随机生成一个
        if ('' === this.configs.givenName) {
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
     *
     * @private
     */
    initSavePath() {
        this.savePath = this.configs.basePath;
        if ('' !== this.configs.subPath) {
            this.savePath = this.savePath + '/' + this.configs.subPath;
        }
        if ('' !== this.configs.rotatePattern) {
            this.savePath = this.savePath + '/' + TimeHelper.format(this.configs.rotatePattern);
        }
        return new Promise((resolve, reject) => {
            FileHelper.createDirectory(this.savePath, this.configs.permission, (err) => {
                if (null !== err) {
                    reject(err);
                }
                else {
                    resolve(null);
                }
            });
        });
    }
    /**
     * 上传文件
     *
     * @private
     * @param {any} req
     * @param {String} fileName 上传文件使用的名字
     * @returns {Promise}
     */
    async upload(req, fileName) {
        try {
            await this.initSavePath();
        }
        catch (err) {
            return Promise.resolve({
                status: Index.ERROR_INTERNAL,
                data: '',
                message: err.message
            });
        }
        return new Promise((resolve, reject) => {
            const form = formidable({
                uploadDir: this.savePath,
                maxFileSize: this.configs.maxFileSize
            });
            form.parse(req, (error, fields, files) => {
                if (null !== error) {
                    // size limit
                    if (formidable.errors.biggerThanMaxFileSize === error.code) {
                        resolve({
                            status: Index.ERROR_OVER_FILESIZE,
                            data: '',
                            message: 'The file size exceeds limit'
                        });
                    }
                    else {
                        resolve({
                            status: Index.ERROR_FRAMEWORK,
                            data: '',
                            message: error.message
                        });
                    }
                    return;
                }
                let file = files[fileName];
                // type
                if (-1 === this.configs.allowTypes.indexOf(file.mimetype)) {
                    fs.unlink(file.filepath, () => { });
                    resolve({
                        status: Index.ERROR_UNSUPPORT_FILETYPE,
                        data: '',
                        message: 'The file type is not allowed'
                    });
                    return;
                }
                // ok
                let newPath = this.savePath + '/' + this.generateFileName() + file.mimetype.replace('image/', '.');
                fs.rename(file.filepath, newPath, (err) => {
                    if (null !== err) {
                        resolve({
                            status: Index.ERROR_INTERNAL,
                            data: '',
                            message: err.message
                        });
                        return;
                    }
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
     * 保存 base64 图片
     *
     * @param {String} base64Str 编码的字符串
     * @returns {Promise}
     */
    async saveBase64Image(base64Str) {
        try {
            await this.initSavePath();
        }
        catch (err) {
            return Promise.resolve({
                status: Index.ERROR_INTERNAL,
                data: '',
                message: err.message
            });
        }
        return new Promise((resolve, reject) => {
            let position = base64Str.indexOf(',');
            let dataBuffer = Buffer.from(base64Str.substring(position + 1), 'base64');
            let ext = base64Str.substring(0, position).replace('data:image/', '.').replace(';base64', '');
            let newPath = this.savePath + '/' + this.generateFileName() + ext;
            fs.writeFile(newPath, dataBuffer, (err) => {
                if (null !== err) {
                    resolve({
                        status: Index.ERROR_INTERNAL,
                        data: '',
                        message: err.message
                    });
                    return;
                }
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
Index.ERROR_INTERNAL = 5000;
Index.ERROR_FRAMEWORK = 1000;
Index.ERROR_OVER_FILESIZE = 2000;
Index.ERROR_UNSUPPORT_FILETYPE = 2001;
