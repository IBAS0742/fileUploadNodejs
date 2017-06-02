/**
 * Created by sunbing on 17-5-23.
 */

var fs = require('fs');
var formidable = require('formidable');

var fileUpload = (function(){
    var filesName = [];
    var fieldsName = [];
    var defaultSetting = {
        encoding : 'utf-8',
        uploadDir : 'uploads/',
        keepExtensions : true,
        maxFieldsSize : 2 * 1024,   // 2 kb
        fileNames : ['file1'],
        fieldsNames : [],
        multiples : true
    };
    /**
     * obj 为 form 的默认参数
     * 内容为
     *      1.encoding              编码
     *      2.uploadDir             上传路径
     *      3.keepExtensions        是否保留后缀
     *          isKeepExtensions    是的时候可以取到 true/false
     *      4.maxFieldsSize         默认字段大小
     *      5.fileNames             文件名
    * */
    var initForm = function(form,obj) {
        defaultSetting = this.defaultSetting;
        if (!obj) {
            obj = defaultSetting;
        }
        form.encoding = obj.encoding ? obj.encoding : defaultSetting.encoding;        //设置编码
        form.uploadDir = obj.uploadDir ? obj.uploadDir : defaultSetting.defaultSetting;     //设置上传目录
        form.keepExtensions = obj.keepExtensions ? obj.isKeepExtensions : defaultSetting.isKeepExtensions;     //保留后缀
        form.maxFieldsSize = obj.maxFieldsSize ? obj.maxFieldsSize : defaultSetting.maxFieldsSize;   //字段大小
        form.fileNames = obj.fileNames ? obj.fileNames : defaultSetting.fileNames;
        form.fieldsNames = obj.fieldsNames ? obj.fieldsNames : defaultSetting.fieldsNames;
        filesName = form.fileNames;
        fieldsName = form.fieldsNames;
        form.multiples = obj.multiples ? obj.multiples : false;
    };
    /**
     * 标记 * 表示函数有返回值并可能会被使用而影响程序正常运行
     * req                      : request 对象
     * res                      : response 对象
     * errHandle                : 错误处理，格式为
     *                              function (err,res) {}
     * successHandle            : 成功时的回调函数，默认传入参数内容依次为 response 对象
     * uploadHandle             : 上传处理函数，这里可以是一个函数，也可以是一个对象
     *                            对象格式为
     *                                {
     *                                    '文件字段名' : function(form,file){ //处理指定文件 }
     *                                }
     *                            函数格式为
     *                            function(form,file)
     *                            其中两者的区别是，对象可以根据不同的文件进行处理，函数则是每一个文件都按照同一个规则进行处理
     *                            同时，当不存在对应文件的字段名时将使用默认的函数进行处理
     * fieldHandle *            : 字段处理函数，格式和上传处理函数相同，传入对象为字段内容和字段名称，但是存在返回值
     *                              返回值的规定是，如果字段符合要求则返回 false，表示无误，否则返回错误信息
     *                              function (fieldValue,fieldName) {
     *                                  //handling
     *                                  return false or errorMessage;
     *                              }
     * fieldHandleOccurError    : 处理字段是发生错误处理，这里的定义方式和 uploadHandle 形式一样
     *                              function (res,errorMessage) {
     *                                  //这里的 errorMessage 由上面的 fieldHandle 所定义
     *                              }
    * */
    var add = function(req,res,errHandle,successHandle,uploadHandle,fieldHandle,fieldHandleOccurError) {
        var form = new formidable.IncomingForm();   //创建上传表单
        initForm.call(this,form);

        var this_ = this;

        form.parse(req, function(err, fields, files) {
            if (err) {
                deleteFile(files);
                if (errHandle) {
                    errHandle(err,res);
                } else {
                    this_.defaultErrHandle(err,res)
                }
                return;
            }

            //fieldHandle = (fieldHandle instanceof Function) ? fieldHandle : defaultFieldHandle;
            //fieldHandleOccurError = (fieldHandleOccurError instanceof Function) ? fieldHandleOccurError : defaultFieldHandleOccurErrorHandle;
            fieldHandle = autoSelectHandle(fieldHandle,this_.defaultFieldHandle);
            fieldHandleOccurError = autoSelectHandle(fieldHandleOccurError,this_.defaultFieldHandleOccurErrorHandle);
            for (var i = 0;i < fieldsName.length;i++) {
                var ret = fieldHandle(fields[fieldsName[i]],fieldsName[i],fieldsName[i]);
                if (ret) {
                    deleteFile(files);
                    fieldHandleOccurError(res,fieldsName[i],ret,fieldsName[i]);
                    return;
                }
            }

            //uploadHandle = (uploadHandle instanceof Function) ? uploadHandle : this_.defaultUploadHandle;
            uploadHandle = autoSelectHandle(uploadHandle,this_.defaultUploadHandle);
            for (var i = 0;i < filesName.length;i++) {
                if (files[filesName[i]]) {
                    if (files[filesName[i]] instanceof Array) {
                        var files_ = files[filesName[i]];
                        for (var j = 0;j < files_.length;j++) {
                            uploadHandle(form,files_[j],filesName[i]);
                        }
                    } else {
                        uploadHandle(form,files[filesName[i]],filesName[i]);
                    }
                }
            }

            deleteFile(files);
            if (successHandle) {
                successHandle(res);
            } else {
                this_.defaultSuccessHandle(res);
            }
        });
    };
    var autoSelectHandle = function(curFn,defaultFn) {
        if (curFn) {
            if (curFn instanceof Function) {
                return function (a,b) {
                    return curFn(a,b);
                }
            } else  if (curFn instanceof Object) {
                return function (a,b,c) {
                    if (curFn[c]) {
                        return curFn[c](a,b);
                    } else {
                        return defaultFn(a,b);
                    }
                }
            } else {
                return function (a,b) {
                    return defaultFn(a,b);
                }
            }
        } else {
            return function (a,b) {
                defaultFn(a,b);
            }
        }
    };
    var defaultErrHandle = function(err,res) {
        res.json(err);
    };
    var defaultUploadHandle = function(form,file) {
        var newPath = form.uploadDir + (new Date()).getTime() + "_" + file.name;
        console.log(newPath);
        fs.renameSync(file.path, newPath);  //重命名
    };
    var defaultSuccessHandle = function(res) {
        res.json({ok : 1});
    };
    var defaultFieldHandle = function(field) {
        return false;
    };
    var defaultFieldHandleOccurErrorHandle = function(res,field,ret) {
        res.json({error : "处理字段" + field + "时，发生错误！\n错误信息为：" + ret});
    };
    var deleteFile = function(files) {
        for (var i in files) {
            var f = files[i];
            if (f instanceof Array) {
                for (var j = 0;j < f.length;j++) {
                    fs.exists(f[j].path,function() {
                        fs.unlinkSync(f[j].path);
                    });
                }
            } else {
                fs.exists(f.path,function() {
                    fs.unlinkSync(f.path);
                });
            }
        }
    };
    return {
        add : add,
        defaultErrHandle : defaultErrHandle,
        defaultUploadHandle : defaultUploadHandle,
        defaultSuccessHandle : defaultSuccessHandle,
        defaultFieldHandle : defaultFieldHandle,
        defaultFieldHandleOccurErrorHandle : defaultFieldHandleOccurErrorHandle,
        defaultSetting : defaultSetting
    };
})();

exports.fileUpload = fileUpload;


