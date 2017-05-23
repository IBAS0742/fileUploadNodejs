# fileUploadNodejs

通过再次包装 node-formidable 简化文件上传接口的调用

## 安装
```
npm install fileuploadaddin --save
```

## 例子
```
var fs = require('fs');
var ful = require('./fileUploadAPI/ful').fileUpload;
//这里使用了 express 框架
router.post('/upFile',function(req,res) {
  ful.add(req,res);
});
```

## 使用说明

### fileUpload 对象
| 属性 | 说明 |
|----|----|
| add  | 核心调用函数
|defaultSetting| form 的默认[设置](https://github.com/felixge/node-formidable)
|defaultErrHandle| 默认错误处理（这里处理的是解析参数发生的错误）
|defaultUploadHandle| 默认文件上传处理
|defaultSuccessHandle| 默认成功回调
|defaultFieldHandle| 默认字段处理方法
|defaultFieldHandleOccurErrorHandle| 默认字段处理发生错误时触发处理方法

- 这里的每一个属性都是可以修改的，但是请按照编写方式进行修改，其中 add 封装程度太高建议不要改写，除非能看懂 autoSelectHandle 的处理方法。
- 这里建议修改的参数为 defaultSetting，修改为符合当前项目的配置即可。

### add 函数使用说明
|参数|函数格式为|
|---|---
|req|request Object
|res|response Object
|errHandle|function(err,res) {}
|successHandle|function(res) {}
|uploadHandle|function(form,file) {} \| Object
|fieldHandle|function(fieldValue,fieldName) {} \| Object
|fieldHandleOccurError|function(res,errorMessage) {} \| Object
- 其中 【uploadHandle/fieldHandle/fieldHandleOccurError】的 Object 格式如下
```javascript
{
    'pro1' : function(a,b) {},
    'pro2' : function(a,b) {},
    ...
}
//其中的 a,b 对应三个函数中分别的 【form,file/fieldValue,fieldName/res,errorMessage】
//pro1,pro2,... 对应的是相应的前端的 input 元素 name 属性的值
//例如
//<input type = 'file' name = 'file1' />
// 对应为 uploadHandle = { 'file1' : function(form,file) {} }
//<input type = 'text' name = 'text1' />
// 对应为 fieldHandle = { 'text1' : function(fieldValue,fieldName) {} }
//       fieldHandleOccurError = { 'text1' : function(res,errorMessage) {} }
```


```javascript
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
```

### 例子
```javascript
//定义服务器将接收两个字段对应的文件
//<input name = 'file1' type = 'file'/>
//<input name = 'file2' type = 'file'/>
ful.defaultSetting.fileNames = ['file1','file2'];
router.post('/upFile',function(req,res) {
  //对两个文件作出不同的处理
  ful.add(req,res,null,null,{
    'file1' : function(form,file) {
      var newPath = form.uploadDir + "file1" + file.name;
      console.log(newPath);
      fs.renameSync(file.path, newPath);  //重命名
    },
    'file2' : function(form,file) {
      var newPath = form.uploadDir + "file2" + file.name;
      console.log(newPath);
      fs.renameSync(file.path, newPath);  //重命名
    }
  });
});
```
