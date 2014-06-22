/**
 * for grunt-css-sprite
 */

var 
async = require('async'),
spritesmith = require('spritesmith');

function createSprite(list, options, callback) {
    //console.log(spritesmith);
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

function createBySliceData(sliceData, options, callback) {
    spritesmith.Layout.addAlgorithm('xy-wh', {
        sort: function(items) {
            return items;
        },
        placeItems: function(items) {
            var retinaImgHash = sliceData.retinaImgHash;

            items.forEach(function(item) {
                var 
                retinaImgPath = item.meta.img._filepath,
                coord = retinaImgHash[retinaImgPath];

                item.x = coord.x;
                item.y = coord.y;
            });

            return items;
        }
    });

    var _algorithm = options.algorithm;
    options.algorithm = 'xy-wh';
    createSprite(sliceData.retinaImgList, options, callback);
    options.algorithm = _algorithm;
}

module.exports = {
    createBySliceData: createBySliceData
};