import * as fs from 'fs';

import * as formidable from 'formidable';

import * as FileHelper from 'candyjs/helpers/FileHelper';
import * as TimeHelper from 'candyjs/helpers/TimeHelper';
import * as StringHelper from 'candyjs/helpers/StringHelper';

/**
 * 文件上传
 */
export default class Index {
    /**
     * @property {any} configs 配置
     */
    public configs = {
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
        maxSize: 1048576,
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
    private savePath: string = '';

    constructor(options: any = null) {
        this.initOptions(options);
    }

    /**
     * @private
     */
    private initOptions(options: any = null): void {
        if(null === options) {
            return;
        }

        for(let k in options) {
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
    private generateFileName(): string {
        let str = 'abcdefghijklmnopqrstuvwxyz0123456789';
        let chars = '';

        // 没有指定名字 就随机生成一个
        if('' === this.configs.givenName) {
            // 14 是文件名的时间戳前缀
            for(let i=0; i<this.configs.fileNameLength - 14; i++) {
                chars += str[ Math.floor(Math.random() * str.length) ];
            }
            chars = chars + TimeHelper.format('ymdhis');

        } else {
            chars = this.configs.givenName;
        }

        return chars;
    }

    /**
     * 根据配置创建上传目录 basePath + subPath + rotatePattern
     *
     * @private
     */
    private async initSavePath(): Promise<any> {
        this.savePath = this.configs.basePath;

        if('' !== this.configs.subPath) {
            this.savePath = this.savePath + '/' + this.configs.subPath;
        }

        if('' !== this.configs.rotatePattern) {
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
     * @private
     * @param {any} req
     * @param {String} fileName 上传文件使用的名字
     * @returns {Promise}
     */
    public async upload(req: any, fileName: string): Promise<any> {
        await this.initSavePath();

        return new Promise((resolve, reject) => {
            const form = formidable({
                uploadDir: this.savePath
            });
            form.parse(req, (err, fields, files) => {
                if(null !== err) {
                    resolve({
                        status: 1,
                        data: null,
                        message: err.message
                    });
                    return;
                }

                let file = files[fileName];

                // type
                if(-1 === this.configs.allowTypes.indexOf(file.type)) {
                    fs.unlink(file.path, () => {});
                    resolve({
                        status: 2,
                        data: null,
                        message: 'The file type is not allowed'
                    });
                    return;
                }

                // size
                if(file.size > this.configs.maxSize) {
                    fs.unlink(file.path, () => {});
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
     * 保存 base64 图片
     *
     * @param {String} base64Str 编码的字符串
     * @returns {Promise}
     */
    public async saveBase64Image(base64Str: string): Promise<any> {
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
