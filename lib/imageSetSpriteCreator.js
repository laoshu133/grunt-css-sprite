/**
 * for grunt-css-sprite
 */

var path = require('path');
var spritesmith = require('spritesmith');
var Layout = spritesmith.Layout;

var PLACE_IMAGE_BEFORE = path.join(__dirname, 'place_before.png');
var PLACE_IMAGE_AFTER = path.join(__dirname, 'place_after.png');

function convertPath(p) {
    return p.replace('@2x', '');
}

Layout.addAlgorithm('xy-2x', {
    sort: function(items) {
        return items;
    },
    placeItems: function(items) {
        var data = Layout.curr2xData;
        if(!data) {
            return items;
        }
        delete Layout.curr2xData;

        var coordinates = data.coordinates;
        var height = 2 * data.height;
        var width = 2 * data.width;

        items.forEach(function(item) {
            var retinaImgPath = convertPath(item.meta.img._filepath);
            var coords = coordinates[retinaImgPath];

            // 前面占位
            if(retinaImgPath === PLACE_IMAGE_BEFORE) {
                item.x = item.y = 0;

                return;
            }

            // 后面占位
            if(retinaImgPath === PLACE_IMAGE_AFTER) {
                item.y = height - item.meta.actualHeight;
                item.x = width - item.meta.actualWidth;

                return;
            }

            item.x = 2 * coords.x;
            item.y = 2 * coords.y;
        });

        return items;
    }
});

module.exports = {
    set2xData: function(data) {
        Layout.curr2xData = data;

        // 占位
        var list = data.list;
        list.push(PLACE_IMAGE_BEFORE);
        list.push(PLACE_IMAGE_AFTER);
    }
};