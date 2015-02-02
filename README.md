# grunt-css-sprite

## 这是什么

这是一个帮助前端开发工程师将 css 代码中的切片合并成雪碧图的工具；
其灵感来源于 `grunt-sprite`，由于其配置参数限制目录结构等，不能满足通用项目需求，重新造轮子发布；
它的主要功能是：

1. 对 css 文件进行处理，收集切片序列，生成雪碧图
2. 在原css代码中为切片添加`background-position`属性
3. 生成用于高清设备的高清雪碧图，并在css文件末尾追加媒体查询代码
4. 生成高清设备雪碧图，使用 `image-set`
5. 支持选择器提取，进一步优化CSS文件大小
6. 在引用雪碧图的位置打上时间戳
7. 在样式末尾追加时间戳
8. 按照时间戳命名文件


### 配置说明

```
// 自动雪碧图
sprite: {
    options: {
        // sprite背景图源文件夹，只有匹配此路径才会处理，默认 images/slice/
        imagepath: 'test/slice/',
        // 映射CSS中背景路径，支持函数和数组，默认为 null
        imagepath_map: null,
        // 雪碧图输出目录，注意，会覆盖之前文件！默认 images/
        spritedest: 'test/publish/images/',
        // 替换后的背景路径，默认 ../images/
        spritepath: '../images/',
        // 各图片间间距，如果设置为奇数，会强制+1以保证生成的2x图片为偶数宽高，默认 0
        padding: 2,
        // 是否使用 image-set 作为2x图片实现，默认不使用
		useimageset: false,
        // 是否以时间戳为文件名生成新的雪碧图文件，如果启用请注意清理之前生成的文件，默认不生成新文件
        newsprite: false,
        // 给雪碧图追加时间戳，默认不追加
        spritestamp: true,
        // 在CSS文件末尾追加时间戳，默认不追加
        cssstamp: true,
        // 默认使用二叉树最优排列算法
        algorithm: 'binary-tree',
        // 默认使用`pixelsmith`图像处理引擎
        engine: 'pixelsmith'
    },
    autoSprite: {
        files: [{
            // 启用动态扩展
            expand: true,
            // css文件源的文件夹
            cwd: 'test/css/',
            // 匹配规则
            src: '*.css',
            // 导出css和sprite的路径地址
            dest: 'test/publish/css/',
            // 导出的css名
            ext: '.sprite.css'
        }]
    }
}
```

* **files**

    使用标准的动态文件对象

* **options**

    * `imagepath`
        必填项，sprite背景图源文件夹，只有匹配此路径才会处理，默认 images/slice/

    * `imagepath_map`
    	映射CSS中背景路径，支持函数和数组，默认为 null

    * `spritedest`
        必填项，雪碧图输出目录，注意，会覆盖之前文件！默认 images/

    * `spritepath`
        可选项，替换后的背景路径，默认为 `path.relative(cssDestPath, spriteDestPath);`

    * `padding`
        可选项，指定各图片间间距，默认 0

	* `useimageset`
        可选项，是否使用 image-set 作为2x图片实现，默认不使用

    * `newsprite`
        可选项，是否以时间戳为文件名生成新的雪碧图文件，如果启用请注意清理之前生成的文件，默认不生成新文件

    * `spritestamp`
        可选项，是否给雪碧图追加时间戳，默认不追加

    * `cssstamp`
        可选项，是否在CSS文件末尾追加时间戳，默认不追加

    * `engine`
        可选项，指定图像处理引擎，默认选择`pngsmith`

    * `algorithm`
        可选项，指定排列方式，有`top-down` （从上至下）, `left-right`（从左至右）, `diagonal`（从左上至右下）, `alt-diagonal` （从左下至右上）和 `binary-tree`（二叉树排列） 五种供选择，默认 `binary-tree`；参考 [Layout](https://github.com/twolfson/layout/)


## 载入插件

请不要忘了载入插件

```
grunt.loadNpmTasks('grunt-css-sprite');
```

## 打个比方

有一个类似这样的目录结构：

```
├── test/
    ├── css/
        └── icon.css
    ├── images/
        ├── slice/
            ├── icon-a.png
            ├── icon-a@2x.png
            ├── icon-b.png
            └── icon-b@2x.png
    └── publish/
        ├── css/
            └── icon.sprite.css
        └── images/
            ├── icon.png
            └── icon@2x.png
```

`css/icon.css` 调用`images/slice/`目录下的切片，`grunt-css-sprite` 会将 `css/icon.css` 进行处理。

`publish/css/` 目录下是处理完成的样式 `icon.sprite.css` ，而 `publish/images/` 目录下是合并完成的雪碧图。


## 特别注意

1. 生成后的雪碧图将以源 css 文件名来命名
2. 仅当CSS中定义`url(xxxx)`的路径匹配参数`imagepath`才进行处理，和具体`background`，`background-image`CSS无关，这里有区别于`grunt-sprite`
3. 理论上高清切片都应该是源切片尺寸的2倍，所以所有高清切片的尺寸宽和高都必须是偶数
4. 理论上所有的切片都应该是 `.png` 格式，`png8` `png24` 和 `png32`不限
5. `spritesmith` 默认只支持png格式，如果有其他格式需要，请参考 *可选依赖*


## 可选依赖

`grunt-css-sprite` 使用 [spritesmith](https://github.com/Ensighten/spritesmith) 作为内部核心实现

经 [Mark](https://github.com/jsmarkus) 提醒，之前对于`gm` 的依赖纯属多余；如果你需要将图片处理引擎切换为`gm`或者其他引擎，请手动安装对应的依赖包。
举例 [Graphics Magick(gm)](http://www.graphicsmagick.org/) 依赖的安装流程：

* **Graphics Magick(gm)**

    * Mac
        // 安装GM图形库
        ```
        brew install GraphicsMagick
        npm install gmsmith
        ```

    * Windows
        前往官方网站[下载安装GM图形库](http://www.graphicsmagick.org/download.html)
        然后命令行执行：
        ```
        npm install gmsmith
        ```

### 版本记录

`0.0.1` 从 `grunt-sprite` 迁移改进

`0.0.2` 完善部分处理流程，优化图片重复，规避 `a[href*='}{']::after{ content:'}{';}` 这类奇葩CSS

`0.0.5` 修改 `spritesmith` 依赖为 `0.18.0`，实现`padding`参数；优化Retina处理流程，拼合选择器，减小CSS文件体积 `.a,.b,.c{ background-image:url(icon.png); background-size:95px auto;}`

`0.0.6` 修正生成Retina CSS部分一个严重的逻辑错误，去除重复选择器生成；完善测试用例；添加`grunt jshint`任务

`0.0.7` 修正`backgroun[-image]`之后缺少分号时造成新生成的CSS出错，修改默认处理引擎为`pngsmith`，取消对`gm`的依赖

`0.0.8` 修正`getSliceData`获取所有CSS背景属性正则匹配

`0.0.9` 重构操作流程，添加 `image-set` 支持

`0.1.2` 添加，完善 `imagepath-map` 参数

`0.1.3` 修正 #11 #12

`0.1.5` 更新依赖 `spritesmith` 版本

`0.1.6` 重构整体流程，支持选择器提取，进一步优化CSS文件大小

`0.2.0` 分离内部逻辑，提取出 [css-spritesmith](https://github.com/laoshu133/css-spritesmith)，为支持 `gulp` 做准备


### 致谢

感谢 [spritesmith](https://github.com/Ensighten/spritesmith)

感谢 [Meters](https://github.com/hellometers)

感谢 [Mark](https://github.com/jsmarkus) 修正 [#1](https://github.com/laoshu133/grunt-css-sprite/pull/1)，提出 [#2](https://github.com/laoshu133/grunt-css-sprite/pull/2)

感谢 [unmric](https://github.com/unmric)

> 使用中有任何问题，请提交 [Issue](https://github.com/laoshu133/grunt-css-sprite/issues)
