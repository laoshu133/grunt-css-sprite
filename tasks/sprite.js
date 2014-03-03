var 
spritesmith = require('spritesmith'),
path = require('path'),
fs = require('fs'),
gm = require('gm');

module.exports = function (grunt) {
	"use strict";

	grunt.registerMultiTask('sprite', 'Create sprite image with slices and update the CSS file.', function () {
		var done = this.async();

		var options = this.options({
			// 默认使用GM图像处理引擎
			engine: 'gm',
			// 默认使用二叉树最优排列算法
			algorithm: 'binary-tree',
			// 各图片间间距，默认 0
			padding: 0,
			// sprite背景图源文件夹，只有匹配此路径才会处理，默认 images/slice/
			imagepath: 'images/slice/',
			// 雪碧图输出目录，注意，会覆盖之前文件！默认 images/
			spritedest: 'images/',
			// 是否以时间戳为文件名生成新的雪碧图文件，如果启用请注意清理之前生成的文件，默认不生成新文件
			newsprite: false,
			// 替换后的背景路径，默认 ../images/
			spritepath: '../images/',
			// 给雪碧图追加时间戳，默认不追加
			spritestamp: false,
			// 在CSS文件末尾追加时间戳，默认不追加
			cssstamp: false
		});

		function fixPath(path){
			return String(path).replace(/\\/g, '/').replace(/\/$/, '');
		}

		function getSliceData(cssPath, cssData){
			var 
			slicePath = fixPath(options.imagepath),
			rbgs = /background(?:-image)?\s*:[\s\S]*?url\((["\']?)(?!https?|\/)?[^\)]+\1\)[^};]*;?/ig,
			rurl = /\((["\']?)([^\)]+)\1\)/i,
			cssList = cssData.match(rbgs),
			sliceHash = {},
			sliceList = [],
			cssHash = {},
			inx = 0;

			if(cssList && cssList.length){
				cssList.forEach(function(css){
					var 
					url = css.match(rurl)[2],
					imgName = path.basename(url),
					imgPath = path.join(cssPath, path.dirname(url)),
					imgFullPath = fixPath(path.join(imgPath, imgName));

					if(!sliceHash[imgFullPath] && fixPath(imgPath) === slicePath && grunt.file.exists(imgFullPath)){
						sliceHash[imgFullPath] = true;
						sliceList[inx++] = imgFullPath;
					}
					cssHash[css] = imgFullPath;
				});
			}

			return {
				sliceHash: sliceHash,
				sliceList: sliceList,
				cssHash: cssHash,
				cssList: cssList
			};
		}

		function createSprite(list, callback){
			spritesmith({
				algorithm: options.algorithm,
				padding: options.padding,
				engine: options.engine,
				src: list
			}, function(err, ret){
				if(err){
					return callback(err);
				}

				callback(null, ret);
			});
		}

		function replaceCSS(cssData, sliceData, coords){
			var 
			rurl = /\((["\']?)([^\)]+)\1\)/i,
			spriteImg = options.spritepath + path.basename(sliceData.destImg) + sliceData.destImgStamp,
			cssHash = sliceData.cssHash,
			cssList = sliceData.cssList;

			cssList.forEach(function(css, inx){
				var coordData = coords[cssHash[css]];

				if(coordData){
					var newCss = css.replace(rurl, '('+ spriteImg +')');
					newCss += ' background-position:-'+ coordData.x +'px -'+ coordData.y +'px;';
					cssData = cssData.replace(css, newCss);

					//For retina css replace
					cssHash[newCss] = cssHash[css];
					cssList[inx] = newCss;
				}
			});
			return cssData;
		}

		function getRetinaSliceData(cssData, sliceData){
			var 
			retinaSliceHash = sliceData.retinaSliceHash = {},
			retinaSliceList = sliceData.retinaSliceList = [],
			retinaCssHash = sliceData.retinaCssHash = {},
			retinaCssList = sliceData.retinaCssList = [],
			cssHash = sliceData.cssHash,
			sliceInx = 0,
			cssInx = 0;
			sliceData.cssList.forEach(function(css){
				var 
				imgPath = cssHash[css],
				extName = path.extname(imgPath),
				fileName = path.basename(imgPath, extName);
				imgPath = fixPath(path.join(path.dirname(imgPath), fileName + '@2x' + extName));
				
				if(!retinaSliceHash[imgPath] && grunt.file.exists(imgPath)){
					retinaSliceHash[imgPath] = true;
					retinaSliceList[sliceInx++] = imgPath;
				}

				if(retinaSliceHash[imgPath]){
					retinaCssList[cssInx++] = css;
					retinaCssHash[css] = imgPath;
				}
			});
			return sliceData;
		}

		function getRetinaCSS(cssData, sliceData, coords){
			var 
			rreEscape = /[-\/\\^$*+?.()|[\]{}]/g,
			retinaCssHash = sliceData.retinaCssHash,
			spriteFilename = path.basename(sliceData.destRetinaImg),
			bgWidth = Math.floor(sliceData.retinaSpriteSize.width / 2),
			spriteImg = options.spritepath + spriteFilename + sliceData.destImgStamp,
			retinaCss = '\n\n/* '+ spriteFilename + ' */\n',
			cssSelectors = [],
			selectorInx = 0,
			cssProps = '';

			//规避 a[href*='}{']::after{ content:'}{';} 这类奇葩CSS
			cssData = cssData.replace(/[:=]\s*([\'\"]).*?\1/g, function(a){
				return a.replace(/\}/g, '\\007d');
			});

			//http://w3ctech.com/p/1430
			retinaCss += '@media only screen and (-o-min-device-pixel-ratio: 3/2), only screen and (min--moz-device-pixel-ratio: 1.5), only screen and (-webkit-min-device-pixel-ratio: 1.5), only screen and (min-resolution: 240dpi), only screen and (min-resolution: 2dppx) {\n';

			sliceData.retinaCssList.forEach(function(css){
				var 
				posData = coords[retinaCssHash[css]],
				re = new RegExp('([^}\\n\\/]+)\\{[^\\}]*?' + css.replace(rreEscape, '\\$&'));
				if(posData && re.test(cssData)){
					cssSelectors[selectorInx++] = RegExp.$1;

					cssProps += cssSelectors[selectorInx-1] + '{ ';
					cssProps += 'background-position:-' + (posData.x/2) + 'px -' + (posData.y/2) + 'px;';
					cssProps += '}\n';
				}
			});

			retinaCss += cssSelectors.join(',');
			retinaCss += '{ background-image:url('+ spriteImg +'); background-size:' + bgWidth + 'px auto;}\n';
			retinaCss += cssProps;
			retinaCss += '}\n';
			return retinaCss;
		}

		function doneSprite(cssData, destCSS){
			if(options.cssstamp){
				var timeNow = grunt.template.today('yyyymmddHHmmss');
				cssData += '\n.TmTStamp{ content:\''+ timeNow +'\'}';
			}
			grunt.file.write(destCSS, cssData);
			grunt.log.writelns(('Done! [Created] -> ' + destCSS));
		}

		function spriteIterator(file, callback){
			var 
			src = file.src[0],
			fileName = path.basename(src, '.css'),
			timeNow = grunt.template.today('yyyymmddHHmmss');

			if(options.newsprite){
				fileName += '-' + timeNow;
			}

			var 
			destCSS = file.dest,
			cssData = grunt.file.read(src),
			sliceData = getSliceData(path.dirname(src), cssData),
			sliceList = sliceData.sliceList;

			// sprite 目标位置 & 时间戳
			var destImg = sliceData.destImg = fixPath(path.join(options.spritedest, fileName + '.png'));
			sliceData.destImgStamp = options.spritestamp ? '?' + timeNow : '';

			if(!sliceList || !sliceList.length){
				grunt.file.copy(src, destCSS);
				grunt.log.writelns(('Done! [Copied] -> ' + destCSS));
				return callback(null);
			}

			// 生成sprite
			createSprite(sliceList, function(err, ret){
				if(err){
					grunt.fatal(err);
					return callback(null);
				}

				// 写入图片
				grunt.file.write(destImg, ret.image, { encoding: 'binary' });
				grunt.log.writelns(('Done! [Created] -> ' + destImg));

				// 替换CSS
				cssData = replaceCSS(cssData, sliceData, ret.coordinates);

				// 处理 retina
				var destRetinaImg = sliceData.destRetinaImg = destImg.replace(/\.png$/, '@2x.png');
				sliceData = getRetinaSliceData(cssData, sliceData);
				
				if(sliceData.retinaSliceList && sliceData.retinaSliceList.length){
					createSprite(sliceData.retinaSliceList, function(err, ret){
						if(err){
							grunt.fatal(err);
							return callback(err);
						}

						// 写入Retina图片
						grunt.file.write(destRetinaImg, ret.image, { encoding: 'binary' });
						gm(destRetinaImg).size(function(err, size){
							if(err){
								grunt.fatal(err);
								return callback(err);
							}

							if(size.width % 2 > 0 || size.height % 2 > 0){
								grunt.fail.warn('警告：所有的雪碧图icon尺寸必须是偶数的！请检查！');
							}
							grunt.log.writelns(('Done! [Created] -> ' + destRetinaImg));

							sliceData.retinaSpriteSize = size;
							cssData += getRetinaCSS(cssData, sliceData, ret.coordinates);
							doneSprite(cssData, destCSS);

							callback(null);
						});
					});
				}
				else{
					doneSprite(cssData, destCSS);
					callback(null);
				}
			});
		}

		grunt.util.async.forEachSeries(this.files, spriteIterator, function(success){
			done(success);
		});
	});
};