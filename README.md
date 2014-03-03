## grunt-sprite

### 这是什么

这是一个帮助前端开发工程师将css代码中的切片合并成雪碧图的工具；
其原著为 `grunt-sprite`，由于其配置参数限制目录和处理不完善（或者说不适合我，具体见配置参数）等，现在修改部分发布；
它的主要功能是：

1. 使用二叉树排列算法，对css文件进行处理，收集切片序列，生成雪碧图
2. 在原css代码中为切片添加background-position属性
3. 生成用于高清设备的高清雪碧图，并在css文件末尾追加媒体查询代码
4. 在引用雪碧图的位置打上时间戳
5. 在样式末尾追加时间戳


### 安装依赖

`grunt-sprite` 使用 [spritesmith](https://github.com/Ensighten/spritesmith) 作为内部核心算法，根据官方文档中提到的[基本依赖](https://github.com/Ensighten/spritesmith#requirements)，须要安装[Graphics Magick(gm)](http://www.graphicsmagick.org/) 和 [PhantomJS](http://phantomjs.org/) 两个依赖。

* **Graphics Magick(gm)**

	`GraphicsMagick` 为 `grunt-sprite` 提供用于图像处理的框架，安装方法：
	
	* Mac
	
			// 安装GM图形库    
  			brew install GraphicsMagick 
  			
  	* Windows
  	
  		前往官方网站[下载安装GM图形库](http://www.graphicsmagick.org/download.html)
  		
* **PhantomJS**

	`PhantomJS` 为 `spritesmith` 提供 CSS选择器 与 JSON 的支持，安装方法：
		
	* Mac
	
			// 安装 Phantomjs
			brew install phantomjs
  			
  	* Windows
  	
  		前往官方网站[下载安装Phantomjs](http://phantomjs.org/download.html)
  		
  		
### 配置说明

  	// 自动雪碧图
      sprite: {
          allslice: {
              files: [
                  {
                      //启用动态扩展
                      expand: true,
                      // css文件源的文件夹
                      cwd: 'test/css/',
                      // 匹配规则
                      src: ['*.css'],
                      //导出css和sprite的路径地址
                      dest: 'test/publish/css/',
                      // 导出的css名
                      ext: '.sprite.css'
                  }
              ],
              options: {
				// 默认使用GM图像处理引擎
				engine: 'gm',
				// 默认使用二叉树最优排列算法
				algorithm: 'binary-tree',
				// sprite背景图源文件夹，只有匹配此路径才会处理，默认 images/slice/
				imagepath: 'test/slice/',
				// 雪碧图输出目录，注意，会覆盖之前文件！默认 images/
				spritedest: 'test/publish/images/',
				// 是否以时间戳为文件名生成新的雪碧图文件，如果启用请注意清理之前生成的文件，默认不生成新文件
				newsprite: false,
				// 替换后的背景路径，默认 ../images/
				spritepath: '../images/',
				// 给雪碧图追加时间戳，默认不追加
				spritestamp: true,
				// 在CSS文件末尾追加时间戳，默认不追加
				cssstamp: true
			}
          }
      }
      
      
* **files**

	使用标准的动态文件对象
	
* **options**

	* `engine` 
	
		必选项，指定图像处理引擎，默认选择gm
	* `algorithm` 
	
		必选项，指定排列方式，有`top-down` （从上至下）, `left-right`（从左至右）, `diagonal`（从左上至右下）, `alt-diagonal` （从左下至右上）和 `binary-tree`（二叉树排列） 五种供选择，默认binary-tree
	* `imagepath` 
	
		必选项，sprite背景图源文件夹，只有匹配此路径才会处理，默认 images/slice/
	* `spritedest` 
	
		必选项，雪碧图输出目录，注意，会覆盖之前文件！默认 images/
	* `newsprite` 
	
		可选项，是否以时间戳为文件名生成新的雪碧图文件，如果启用请注意清理之前生成的文件，默认不生成新文件
	* `spritestamp` 
	
		可选项，是否给雪碧图追加时间戳，默认不追加
	* `cssstamp` 
	
		可选项，是否在CSS文件末尾追加时间戳，默认不追加
	
### 载入插件

请不要忘了载入插件

	grunt.loadNpmTasks('grunt-sprite');	
	
### 打个比方

有一个类似这样的目录结构：
		
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
		
`css/icon.css` 调用`images/slice/`目录下的切片，`grunt-css-sprite` 会将 `css/icon.css` 进行处理。

`publish/css/` 目录下是处理完成的样式 `icon.sprite.css` ，而 `publish/images/` 目录下是合并完成的雪碧图。

### 特别注意

1. 理论上所有的切片都应该是`.png`格式，`png8` `png24` 和 `png32`不限
2. 理论上高清切片都应该是源切片尺寸的2倍，所以所有高清切片的尺寸宽和高都必须是偶数
3. 生成后的雪碧图将以源css文件名来命名

### 版本记录

`0.0.1` 从 `grunt-sprite` 迁移改进

`0.0.2` 完善部分处理流程，规避 规避 `a[href*='}{']::after{ content:'}{';}` 这类奇葩CSS

### 致谢

感谢 [Meters](https://github.com/hellometers)

