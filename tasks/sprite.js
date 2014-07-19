var 
spritesmith = require('spritesmith'),
async = require('async'),
path = require('path');

module.exports = function (grunt) {
    "use strict";

    var SLICE_PLACE = '{{$slice_{id}$}}';
    var R_SLICE_PLACE = /\{\{\$slice_(\d+)\$\}\}/g;
    var IMAGE_SET_PLACE = '/*image-set-place*/';
    var IMAGE_SET_CSS_TMPL = 'background-image: -webkit-image-set(url({spriteImg}) 1x, url({retinaSpriteImg}) 2x); background-image: -moz-image-set(url({spriteImg}) 1x, url({retinaSpriteImg}) 2x); background-image: -ms-image-set(url({spriteImg}) 1x, url({retinaSpriteImg}) 2x); background-image: image-set(url({spriteImg}) 1x, url({retinaSpriteImg}) 2x);';
    var IMAGE_SET_PLACE_FILE_BEFORE = '__@__css_sprite_place_before.png';
    var IMAGE_SET_PLACE_FILE_END = '__@__css_sprite_place_end.png';
    var IMAGE_SET_PLACE_FILE = './lib/place.png';
    var MEDIA_QUERY_CSS_TMPL = '\n\n/* {imgDest} */\n@media only screen and (-o-min-device-pixel-ratio: 3/2), only screen and (min--moz-device-pixel-ratio: 1.5), only screen and (-webkit-min-device-pixel-ratio: 1.5), only screen and (min-resolution: 240dpi), only screen and (min-resolution: 2dppx) {\n  {cssText}\n}\n';

    function fixPath(path) {
        return String(path).replace(/\\/g, '/').replace(/\/$/, '');
    }

    function getSliceData(src, options) {
        var 
        cssPath = path.dirname(src),
        cssData = grunt.file.read(src),
        rabsUrl = /^(\/|https?:|file:)/i,
        rbgs = /background(?:-image)?\s*:[^;]*?url\((["\']?)([^\)]+)\1\)[^};]*;?/ig,
        slicePath = fixPath(options.imagepath),
        slicePathMap = options.imagepath_map,
        _slicePathMap = slicePathMap;

        // map imagepath
        if(Array.isArray(slicePathMap)) {
            slicePathMap = function(uri) {
                return String(uri).replace(_slicePathMap[0], _slicePathMap[1]);
            };
        }

        var cssList = [], cssHash = {}, cssInx = 0;
        var imgList = [], imgHash = {}, imgInx = 0;

        cssData = cssData.replace(rbgs, function(css, b, uri) {
            var imgUri = uri;
            if(typeof slicePathMap === 'function') {
                imgUri = slicePathMap(imgUri);
            }

            // absolute path
            if(rabsUrl.test(imgUri)) {
                return css;
            }

            var imgFullPath = fixPath(path.join(cssPath, imgUri));

            if(
                // low call grunt.file.exists
                !imgHash[imgFullPath] && 
                // match path
                (imgFullPath.indexOf(slicePath) !== 0 || !grunt.file.exists(imgFullPath))
            ) {
                return css;
            }

            var currCssInx = cssHash[css];
            if(currCssInx === void 0) {
                currCssInx = cssHash[css] = cssInx;

                cssList[cssInx++] = {
                    imgFullPath: imgFullPath,
                    imgPath: uri,
                    css: css
                };
            }

            if(!imgHash[imgFullPath]) {
                imgList[imgInx++] = imgFullPath;
                imgHash[imgFullPath] = true;
            }

            return SLICE_PLACE.replace('{id}', currCssInx);
        });

        return {
            cssData: cssData,
            cssList: cssList,
            cssHash: cssHash,
            imgList: imgList,
            imgHash: imgHash
        };
    }

    function createSprite(list, options, callback) {
        spritesmith({
            algorithm: options.algorithm,
            padding: options.padding,
            engine: options.engine,
            src: list
        }, function(err, ret) {
            if(err) {
                return callback(err);
            }

            callback(null, ret);
        });
    }


    grunt.registerMultiTask('sprite', 'Create sprite image with slices and update the CSS file.', function () {
        var done = this.async();

        var options = this.options({
            // sprite背景图源文件夹，只有匹配此路径才会处理，默认 images/slice/
            imagepath: 'images/slice/',
            // 映射CSS中背景路径，支持函数和数组，默认为 null
            imagepath_map: null,
            // 雪碧图输出目录，注意，会覆盖之前文件！默认 images/
            spritedest: 'images/',
            // 替换后的背景路径，默认 ../images/
            spritepath: '../images/',
            // 各图片间间距，如果设置为奇数，会强制+1以保证生成的2x图片为偶数宽高，默认 0
            padding: 0,
            // 是否使用 image-set 作为2x图片实现，默认不使用
            useimageset: false,
            // 是否以时间戳为文件名生成新的雪碧图文件，如果启用请注意清理之前生成的文件，默认不生成新文件
            newsprite: false,
            // 给雪碧图追加时间戳，默认不追加
            spritestamp: false,
            // 在CSS文件末尾追加时间戳，默认不追加
            cssstamp: false,
            // 默认使用二叉树最优排列算法
            algorithm: 'binary-tree',
            // 默认使用`pngsmith`图像处理引擎
            engine: 'pngsmith',

            // 扩展参数，不建议修改，image-set 模板，占位文件
            IMAGE_SET_CSS_TMPL: IMAGE_SET_CSS_TMPL,
            IMAGE_SET_PLACE_FILE_BEFORE: IMAGE_SET_PLACE_FILE_BEFORE,
            IMAGE_SET_PLACE_FILE_END: IMAGE_SET_PLACE_FILE_END,
            IMAGE_SET_PLACE_FILE: IMAGE_SET_PLACE_FILE,
            // 扩展参数，不建议修改， media query 模板
            MEDIA_QUERY_CSS_TMPL: MEDIA_QUERY_CSS_TMPL
        });

        // `padding` must be even
        if(options.padding % 2 !== 0){
            options.padding += 1;
        }

        async.each(this.files, function(file, callback) {
            var 
            src = file.src[0],
            cssDest = file.dest,
            sliceData = getSliceData(src, options),
            cssList = sliceData.cssList;

            if(!cssList || cssList.length <= 0) {
                grunt.file.copy(src, cssDest);
                grunt.log.writelns(('Done! [Copied] -> ' + cssDest));
                return callback(null);
            }

            async.waterfall([
                // base config
                function baseConfig(cb) {
                    var 
                    cssFilename = path.basename(src, '.css'),
                    timeNow = grunt.template.today('yyyymmddHHmmss');

                    if(options.newsprite) {
                        cssFilename += '-' + timeNow;
                    }

                    sliceData.timestamp = options.spritestamp ? ('?'+timeNow) : '';
                    sliceData.imgDest = fixPath(path.join(options.spritedest, cssFilename + '.png'));
                    sliceData.spriteImg = fixPath(path.join(options.spritepath, cssFilename + '.png')) + 
                        sliceData.timestamp;

                    sliceData.retinaImgDest = fixPath(sliceData.imgDest.replace(/\.png$/, '@2x.png'));
                    sliceData.retinaSpriteImg = fixPath(path.join(options.spritepath, cssFilename + '@2x.png')) +  sliceData.timestamp;

                    cb(null);
                },
                // create sprite image
                function createSpriteImg(cb) {
                    createSprite(sliceData.imgList, options, cb);
                },
                // write sprite image file
                function writeSrpiteFile(spriteImgData, cb) {
                    // write file
                    grunt.file.write(sliceData.imgDest, spriteImgData.image, { encoding: 'binary' });
                    grunt.log.writelns(('Done! [Created] -> ' + sliceData.imgDest));

                    sliceData.spriteImgData = spriteImgData;
                    cb(null, spriteImgData.coordinates);
                },
                // set slice position
                function setSlicePosition(coordinates, cb) {
                    var rsemicolon = /;\s*$/;

                    sliceData.cssList.forEach(function(cssItem) {
                        var 
                        css = cssItem.css,
                        coords = coordinates[cssItem.imgFullPath];

                        css = css.replace(cssItem.imgPath, sliceData.spriteImg);

                        // Add a semicolon if needed
                        if(!rsemicolon.test(css)) {
                            css += ';';
                        }
                        css += IMAGE_SET_PLACE;

                        var bgPos = ['-'+ coords.x +'px', '-'+ coords.y +'px'];
                        if(coords.x === 0) {
                            bgPos[0] = 0;
                        }
                        if(coords.y === 0) {
                            bgPos[1] = 0;
                        }

                        css += 'background-position: '+ bgPos.join(' ') +';';

                        cssItem.newCss = css;
                        cssItem.height = coords.height;
                        cssItem.width = coords.width;
                        cssItem.x = coords.x;
                        cssItem.y = coords.y;
                    });

                    cb(null);
                },
                // get retina image & add image-set css
                function getRetinaImg(cb) {
                    var 
                    useimageset = options.useimageset,
                    retinaImgList = sliceData.retinaImgList = [],
                    retinaImgHash = sliceData.retinaImgHash = {};

                    sliceData.cssList.forEach(function(cssItem, id) {
                        var 
                        extName = path.extname(cssItem.imgFullPath),
                        filename = path.basename(cssItem.imgFullPath, extName),
                        retinaImgFullPath = path.join(path.dirname(cssItem.imgFullPath), filename + '@2x' + extName);

                        if(!retinaImgHash[retinaImgFullPath] && grunt.file.exists(retinaImgFullPath)) {
                            cssItem.retinaImgFullPath = retinaImgFullPath;
                            retinaImgHash[retinaImgFullPath] = {
                                id: id,
                                height: 2 * cssItem.height,
                                width: 2 * cssItem.width,
                                x: 2 * cssItem.x,
                                y: 2 * cssItem.y
                            };

                            retinaImgList.push(retinaImgFullPath);
                        }

                        // add image-set css, only when file exists
                        var imageSetCSS = useimageset && retinaImgHash[retinaImgFullPath] ? 
                            options.IMAGE_SET_CSS_TMPL.replace(/\{spriteImg\}/g, sliceData.spriteImg)
                                .replace(/\{retinaSpriteImg\}/g, sliceData.retinaSpriteImg) :
                            '';
                        cssItem.newCss = cssItem.newCss.replace(IMAGE_SET_PLACE, imageSetCSS);
                    });

                    if(retinaImgList.length > 0) {
                        if(!useimageset) {
                            return createSprite(retinaImgList, options, cb);
                        }

                        var retinaImageCreater = require('../lib/retinaImageCreater');

                        return retinaImageCreater.createBySliceData(sliceData, options, grunt.file, cb);
                    }

                    cb(null, null);
                },
                // write retina sprite image file
                function writeRetinaeImgFile(retinaSpriteImgData, cb) {
                    if(retinaSpriteImgData) {
                        sliceData.retinaSpriteImgData = retinaSpriteImgData;

                        var retinaImgDest = sliceData.retinaImgDest;

                        grunt.file.write(retinaImgDest, retinaSpriteImgData.image, { encoding: 'binary' });
                        grunt.log.writelns(('Done! [Created] -> ' + retinaImgDest));
                    }

                    cb(null);
                },
                // replace css
                function replaceCss(cb) {
                    var 
                    cssList = sliceData.cssList,
                    useimageset = options.useimageset,
                    retinaSpriteImgData = sliceData.retinaSpriteImgData,
                    coordinates = retinaSpriteImgData ? retinaSpriteImgData.coordinates : {};

                    var 
                    cssData = sliceData.cssData,
                    // a[href*='}{']::after{ content:'}{';} 规避此类奇葩CSS
                    tmpCss = cssData.replace(/[:=]\s*([\'\"]).*?\1/g, function(a){
                        return a.replace(/\}/g, '');
                    });

                    var 
                    rreEscape = /[-\/\\^$*+?.()|[\]{}]/g,
                    cssSelectorHash = {},
                    cssSelectors = [],
                    cssProps = [],
                    lastInx = -1;

                    sliceData.cssData = cssData.replace(R_SLICE_PLACE, function(a, id) {
                        var 
                        cssItem = cssList[parseInt(id, 10)],
                        ret = cssItem ? cssItem.newCss : '';

                        if(!cssItem || useimageset) {
                            return ret;
                        }

                        var coords = coordinates[cssItem.retinaImgFullPath];
                        if(!coords) {
                            return ret;
                        }

                        // media query retina css
                        var 
                        selector,
                        place = SLICE_PLACE.replace('{id}', id),
                        rselector = new RegExp('([^}\\n\\/]+)\\{[^\\}]*?' + place.replace(rreEscape, '\\$&'));
                        tmpCss = tmpCss.replace(rselector, function(a, b) {
                            selector = b;
                            return b + '{';
                        });

                        if(!selector) {
                            return ret;
                        }

                        var selectorInx = ++lastInx;
                        cssSelectors[selectorInx] = selector;

                        var bgPos = ['-'+ (coords.x/2) +'px', '-'+ (coords.y/2) +'px'];
                        if(coords.x === 0) {
                            bgPos[0] = 0;
                        }
                        if(coords.y === 0) {
                            bgPos[1] = 0;
                        }

                        cssProps[selectorInx] = selector + ' { background-position: '+ bgPos.join(' ') + ';}';

                        // unique selector, and keep selector order
                        selectorInx = cssSelectorHash[selector];
                        if(isFinite(selectorInx)) {
                            cssSelectorHash[selector] = --lastInx;
                            cssSelectors.splice(selectorInx, 1);
                            cssProps.splice(selectorInx, 1);
                        }
                        else {
                            cssSelectorHash[selector] = lastInx;
                        }

                        return ret;
                    });

                    if(retinaSpriteImgData && !useimageset) {
                        var 
                        retinaSpriteImg = sliceData.retinaSpriteImg,
                        bgWidth = Math.floor(retinaSpriteImgData.properties.width / 2);

                        var retinaCss = cssSelectors.join(',\n  ');
                        retinaCss += ' { background-image:url('+ retinaSpriteImg +'); background-size:' + bgWidth + 'px auto;}';
                        retinaCss += '\n  ';
                        retinaCss += cssProps.join('\n  ');

                        retinaCss = options.MEDIA_QUERY_CSS_TMPL.replace(/\{cssText\}/g, retinaCss)
                            .replace(/\{imgDest\}/g, retinaSpriteImg);

                        sliceData.cssData += retinaCss;
                    }

                    cb(null);
                },
                // write css file
                function writeCssFile(cb) {
                    // timestamp
                    if(options.cssstamp) {
                        sliceData.cssData += '\n.css_stamp{ content:"'+ sliceData.timestamp.slice(1) +'";}';
                    }

                    grunt.file.write(cssDest, sliceData.cssData);
                    grunt.log.writelns(('Done! [Created] -> ' + cssDest));

                    cb(null);
                }
            ], callback);
        }, function(ret) {
            done(ret);
        });
    });
};