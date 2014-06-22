/**
 * for grunt-css-sprite
 */

var 
path = require('path'),
async = require('async'),
spritesmith = require('spritesmith');

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

function createBySliceData(sliceData, options, gruntFileApi, callback) {
    var 
    imgSize = sliceData.spriteImgData.properties,
    retinaImgSize = [2 * imgSize.width, 2 * imgSize.height];

    spritesmith.Layout.addAlgorithm('xy-wh', {
        sort: function(items) {
            return items;
        },
        placeItems: function(items) {
            var retinaImgHash = sliceData.retinaImgHash;

            items.forEach(function(item) {
                var 
                retinaImgPath = item.meta.img._filepath,
                filename = path.basename(retinaImgPath),
                coord = retinaImgHash[retinaImgPath];

                // 前面占位
                if(filename === options.IMAGE_SET_PLACE_FILE_BEFORE) {
                    item.x = item.y = 0;
                    return;
                }
                // 后面占位
                else if(filename === options.IMAGE_SET_PLACE_FILE_END) {
                    item.y = retinaImgSize[1] - item.height + options.padding;
                    item.x = retinaImgSize[0] - item.width + options.padding;
                    return;
                }

                item.x = coord.x;
                item.y = coord.y;
            });

            return items;
        }
    });

    // 添加头尾占位图片，防止 Layout 掐头去尾
    var 
    beforePlace = path.join(options.spritedest, options.IMAGE_SET_PLACE_FILE_BEFORE),
    endPlace = path.join(options.spritedest, options.IMAGE_SET_PLACE_FILE_END);

    if(!gruntFileApi.exists(beforePlace)) {
        gruntFileApi.copy(options.IMAGE_SET_PLACE_FILE, beforePlace);
    }
    if(!gruntFileApi.exists(endPlace)) {
        gruntFileApi.copy(options.IMAGE_SET_PLACE_FILE, endPlace);
    }

    var retinaImgList = sliceData.retinaImgList.slice();
    retinaImgList.push(beforePlace);
    retinaImgList.push(endPlace);

    // 按照已生成图片，排序 retina 图片
    var _algorithm = options.algorithm;
    options.algorithm = 'xy-wh';
    createSprite(retinaImgList, options, function(err, ret) {
        gruntFileApi.delete(beforePlace);
        gruntFileApi.delete(endPlace);

        callback(err, ret);
    });
    options.algorithm = _algorithm;
}

module.exports = {
    createBySliceData: createBySliceData
};