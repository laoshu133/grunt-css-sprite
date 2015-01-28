var path = require('path');
var async = require('async');
var spritesmith = require('spritesmith');
var imageSetSpriteCreator = require('../lib/imageSetSpriteCreator');

module.exports = function(grunt) {
    "use strict";

    var CSS_DATA_TMPL = '\n\n/* {imgDest} */\n{selectors}{\n{cssProps}\n}\n';
    var MEDIA_QUERY_CSS_TMPL = '\n\n/* {imgDest} */\n@media only screen and (-o-min-device-pixel-ratio: 3/2), only screen and (min--moz-device-pixel-ratio: 1.5), only screen and (-webkit-min-device-pixel-ratio: 1.5), only screen and (min-resolution: 240dpi), only screen and (min-resolution: 2dppx) {\n{cssText} \n}\n';
    var IMAGE_SET_CSS_TMPL = 'background-image: -webkit-image-set(url({spriteImg}) 1x, url({retinaSpriteImg}) 2x); background-image: -moz-image-set(url({spriteImg}) 1x, url({retinaSpriteImg}) 2x); background-image: -ms-image-set(url({spriteImg}) 1x, url({retinaSpriteImg}) 2x); background-image: image-set(url({spriteImg}) 1x, url({retinaSpriteImg}) 2x);';

    function filterNullFn(v) {
        return !!v;
    }

    function fixPath(path) {
        return String(path).replace(/\\/g, '/').replace(/\/$/, '');
    }

    function fill(tmpl, data) {
        for(var k in data) {
            tmpl = tmpl.replace(new RegExp('\\{'+ k +'\\}', 'g'), data[k]);
        }

        return tmpl;
    }

    function escapeRegExp(str) {
        var rreEscape = /[-\/\\^$*+?.()|[\]{}]/g;

        return str.replace(rreEscape, '\\$&');
    }

    function createPlace() {
        if(!createPlace.id) {
            createPlace.id = 0;
        }

        var id = createPlace.id++;
        id = '@$sprite_place_'+ id +'$@';

        var pattern = new RegExp(escapeRegExp(id), 'g');
        return {
            id: id,
            pattern: pattern
        };
    }

    function getBgPosCss(x, y, ratio) {
        if(ratio && ratio > 1) {
            x /= ratio;
            y /= ratio;
        }

        var bgPos = ['-'+ x +'px', '-'+ y +'px'];
        if(x === 0) {
            bgPos[0] = 0;
        }
        if(y === 0) {
            bgPos[1] = 0;
        }

        return 'background-position: '+ bgPos.join(' ') +';';
    }

    function getSliceData(src, options) {
        var cssPath = path.dirname(src);
        var cssData = grunt.file.read(src);
        var slicePathMap = options.imagepath_map;
        var slicePath = path.normalize(fixPath(options.imagepath));

        var rurlParams = /\?.*$/;
        var rabsUrl = /^(?:\/|https?:|file:)/i;
        var rbgs = /\bbackground(?:-image)?\s*:[^;]*?url\((["\']?)([^\)]+)\1\)[^};]*;?/ig;

        // ignore comments
        var commentsData = {};
        var commentRe = /\/\*[\s\S]*?\*\//g;
        cssData = cssData.replace(commentRe, function(a) {
            var place = createPlace();

            commentsData[place.id] = {
                place: place,
                data: a
            };

            return place.id;
        });

        // parse css data
        var cssList = [], cssHash = {}, cssInx = -1;
        var imgList = [], imgHash = {}, imgInx = -1;

        cssData = cssData.replace(rbgs, function(css, b, uri) {
            var imgUri = uri;
            if(typeof slicePathMap === 'function') {
                imgUri = slicePathMap(imgUri);
            }

            // absolute path
            if(rabsUrl.test(imgUri)) {
                return css;
            }

            var imgFullPath = imgUri.replace(rurlParams, '');
            imgFullPath = fixPath(path.join(cssPath, imgFullPath));
            imgFullPath = path.normalize(imgFullPath);

            if(
                // low call grunt.file.exists
                !imgHash[imgFullPath] &&
                // match path
                (imgFullPath.indexOf(slicePath) !== 0 || !grunt.file.exists(imgFullPath))
            ) {
                return css;
            }

            var place = createPlace();
            // place.cssInx = ++cssInx;

            cssList[++cssInx] = {
                place: place,
                imgFullPath: imgFullPath,
                imgPath: uri,
                css: css
            };

            if(!imgHash[imgFullPath]) {
                imgList[++imgInx] = imgFullPath;
                imgHash[imgFullPath] = true;
            }

            return place.id;
        });

        return {
            commentsData: commentsData,
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
        }, callback);
    }

    grunt.registerMultiTask('sprite', 'Create sprite image with slices and update the CSS file.', function() {
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
            // 默认使用`pixelsmith`图像处理引擎
            engine: 'pixelsmith',

            // 扩展参数，不建议修改，image-set 模板，占位文件
            IMAGE_SET_CSS_TMPL: IMAGE_SET_CSS_TMPL,

            // 扩展参数，不建议修改， 配置模板
            MEDIA_QUERY_CSS_TMPL: MEDIA_QUERY_CSS_TMPL,
            CSS_DATA_TMPL: CSS_DATA_TMPL
        });

        // `padding` must be even
        if(options.padding % 2 !== 0){
            options.padding += 1;
        }

        // imagepath map
        var _imagepath_map = options.imagepath_map;
        if(Array.isArray(options.imagepath_map)) {
            options.imagepath_map = function(uri) {
                return String(uri).replace(_imagepath_map[0], _imagepath_map[1]);
            };
        }

        async.each(this.files, function(file, callback) {
            var src = file.src[0];
            var sliceData = getSliceData(src, options);
            var cssList = sliceData.cssList;
            var cssDest = file.dest;

            if(!cssList || cssList.length <= 0) {
                grunt.file.copy(src, cssDest);
                grunt.log.writelns('Done! [Copied] -> ' + cssDest);

                return callback(null);
            }

            async.waterfall([
                // base config
                function baseConfig(cb) {
                    var cssFilename = path.basename(src, '.css');
                    var timeNow = grunt.template.today('yyyymmddHHMMss');

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
                    grunt.log.writelns('Done! [Created] -> ' + sliceData.imgDest);

                    sliceData.spriteImgData = spriteImgData;
                    cb(null, spriteImgData.coordinates);
                },
                // set slice position
                function setSlicePosition(coordinates, cb) {
                    var rspaces = /\s+/;
                    var rsemicolon = /;\s*$/;
                    var rbgUrl = /url\([^\)]+\)/i;
                    var rbgEmpty = /background(?:-image)?\s*:\s*;/;

                    sliceData.cssList.forEach(function(cssItem) {
                        var coords = coordinates[cssItem.imgFullPath];

                        var css = cssItem.css.replace(rbgUrl, '');

                        // Add a semicolon if needed
                        if(!rsemicolon.test(css)) {
                            css += ';';
                        }

                        if(!rbgEmpty.test(css)) {
                            css = css.replace(rspaces, ' ');
                        }
                        else {
                            css = '';
                        }

                        css += getBgPosCss(coords.x, coords.y);

                        cssItem.newCss = css;
                    });

                    cb(null);
                },
                // get retina image & add image-set, css
                function getRetinaImg(cb) {
                    var useimageset = options.useimageset;
                    var retinaImgList = sliceData.retinaImgList = [];
                    var retinaImgHash = sliceData.retinaImgHash = {};

                    sliceData.cssList.forEach(function(cssItem, id) {
                        var extName = path.extname(cssItem.imgFullPath);
                        var filename = path.basename(cssItem.imgFullPath, extName);
                        var retinaImgFullPath = path.join(path.dirname(cssItem.imgFullPath), filename + '@2x' + extName);

                        if(grunt.file.exists(retinaImgFullPath)) {
                            cssItem.retinaImgFullPath = retinaImgFullPath;

                            if(!retinaImgHash[retinaImgFullPath]) {
                                retinaImgList.push(retinaImgFullPath);
                            }
                            retinaImgHash[retinaImgFullPath] = true;
                        }
                    });

                    if(!retinaImgList.length) {
                        cb(null, null);

                        return;
                    }

                    var oldAlgorithm = options.algorithm;
                    if(useimageset) {
                        var spriteImgData = sliceData.spriteImgData;
                        var coordinates = spriteImgData.coordinates;

                        imageSetSpriteCreator.set2xData({
                            height: spriteImgData.properties.height,
                            width: spriteImgData.properties.width,
                            coordinates: coordinates,
                            list: retinaImgList
                        });

                        options.algorithm = 'xy-2x';
                    }

                    createSprite(retinaImgList, options, function() {
                        options.algorithm = oldAlgorithm;

                        cb.apply(null, arguments);
                    });
                },
                // write retina sprite image file
                function writeRetinaeImgFile(retinaSpriteImgData, cb) {
                    if(!retinaSpriteImgData) {
                        cb(null);
                        return;
                    }

                    sliceData.retinaSpriteImgData = retinaSpriteImgData;

                    var retinaImgDest = sliceData.retinaImgDest;

                    grunt.file.write(retinaImgDest, retinaSpriteImgData.image, { encoding: 'binary' });
                    grunt.log.writelns('Done! [Created] -> ' + retinaImgDest);

                    cb(null);
                },
                // get selectors
                function getSelectors(cb) {
                    var cssData = sliceData.cssData;

                    // a[href*='}{']::after{ content:'}{';} 规避此类奇葩CSS
                    var tmpCss = cssData.replace(/[:=]\s*([\'\"]).*?\1/g, function(a){
                        return a.replace(/\}/g, '');
                    });

                    sliceData.cssList.forEach(function(cssItem) {
                        var place = cssItem.place;
                        var placeEscapeId = escapeRegExp(place.id);
                        var rselector = new RegExp('([^}\\n\\/]+)\\{[^\\}]*?' + placeEscapeId);

                        var selector;
                        tmpCss = tmpCss.replace(rselector, function(a, b) {
                            selector = b;

                            return b + '{';
                        });

                        if(!selector) {
                            return;
                        }

                        cssItem.selector = selector;
                    });

                    cb(null);
                },
                // processCss
                function processCss(cb) {
                    var cssData = sliceData.cssData;
                    var useImageSet = options.useimageset;
                    var retinaSpriteImgData = sliceData.retinaSpriteImgData;
                    var retinaCoordinates = retinaSpriteImgData ? retinaSpriteImgData.coordinates : {};

                    var lastIndex = -1;
                    var cssSelectors = [];
                    var cssSelectorsHash = {};

                    var retinaIndex = -1;
                    var retinaCssProps = [];
                    var retinaSelectors = [];
                    var retinaSelectorsHash = {};

                    sliceData.cssList.forEach(function(cssItem) {
                        var place = cssItem.place;
                        var selector = cssItem.selector;

                        cssData = cssData.replace(place.pattern, cssItem.newCss);

                        var inx = cssSelectorsHash[selector];
                        if(inx !== undefined) {
                            cssSelectors[inx] = null;
                        }

                        inx = ++lastIndex;
                        cssSelectors[inx] = selector;
                        cssSelectorsHash[selector] = inx;

                        // for media query
                        var retinaCoords;
                        var retinaImgFullPath = cssItem.retinaImgFullPath;
                        if(!useImageSet && retinaImgFullPath) {
                            retinaCoords = retinaCoordinates[retinaImgFullPath];
                        }

                        if(!retinaCoords) {
                            return;
                        }

                        inx = retinaSelectorsHash[selector];
                        if(inx !== undefined) {
                            retinaSelectors[inx] = null;
                            retinaCssProps[inx] = null;
                        }

                        inx = ++retinaIndex;
                        retinaSelectors[inx] = selector;
                        retinaSelectorsHash[selector] = inx;

                        var css = selector + '{\n'+ getBgPosCss(retinaCoords.x, retinaCoords.y, 2) +'\n}';
                        retinaCssProps[inx] = css;
                    });

                    cssSelectors = cssSelectors.filter(filterNullFn);

                    var spriteImg = sliceData.spriteImg;
                    var retinaSpriteImg = sliceData.retinaSpriteImg;

                    var css = 'background-image: url('+ spriteImg +');';
                    if(useImageSet) {
                        css += '\n';
                        css += fill(options.IMAGE_SET_CSS_TMPL, {
                            retinaSpriteImg: retinaSpriteImg,
                            spriteImg: spriteImg
                        });
                    }

                    cssData += fill(options.CSS_DATA_TMPL, {
                        selectors: cssSelectors.join(',\n'),
                        imgDest: spriteImg,
                        cssProps: css
                    });

                    // media query css
                    if(!useImageSet && retinaSelectors.length) {
                        retinaCssProps = retinaCssProps.filter(filterNullFn);
                        retinaSelectors = retinaSelectors.filter(filterNullFn);

                        var retinaBgWidth = Math.floor(retinaSpriteImgData.properties.width / 2);

                        css = retinaSelectors.join(',\n') + '{\n';
                        css += 'background-image: url('+ retinaSpriteImg +');\n';
                        css += 'background-size: '+ retinaBgWidth +'px auto;';
                        css += '\n}\n';

                        css += retinaCssProps.join('\n');

                        cssData += fill(options.MEDIA_QUERY_CSS_TMPL, {
                            imgDest: retinaSpriteImg,
                            cssText: css
                        });
                    }

                    cb(null, cssData);
                },
                // restore comments
                function restoreComments(cssData, cb) {
                    var commentsData = sliceData.commentsData;

                    Object.keys(commentsData).forEach(function(k) {
                        var commentsItem = commentsData[k];
                        var place = commentsItem.place;

                        cssData = cssData.replace(place.pattern, commentsItem.data);
                    });

                    cb(null, cssData);
                },
                // write css file
                function writeCssFile(cssData, cb) {
                    // timestamp
                    if(options.cssstamp) {
                        cssData += '\n.css_stamp{ content:"'+ sliceData.timestamp.slice(1) +'";}';
                    }

                    grunt.file.write(cssDest, cssData);
                    grunt.log.writelns('Done! [Created] -> ' + cssDest);

                    cb(null);
                }
            ], callback);
        }, done);
    });
};