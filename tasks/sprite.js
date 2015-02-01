var path = require('path');
var async = require('async');

var cssSpriteSmith = require('css-spritesmith');

module.exports = function(grunt) {
    "use strict";

    grunt.registerMultiTask('sprite', 'Create sprite image with slices and update the CSS file.', function() {
        var done = this.async();

        var defaultOptions = cssSpriteSmith.defaultOptions;
        defaultOptions.spritepath = null;

        var options = this.options(defaultOptions);

        // auto compete spritepath
        var autoSpritePath = options.spritepath === null;

        async.eachLimit(this.files, 10, function(file, callback) {
            var cssDest = path.dirname(file.dest);

            if(autoSpritePath) {
                var cssDestPath = path.resolve(cssDest);
                var spriteDestPath = path.resolve(options.spritedest);

                options.spritepath = path.relative(cssDestPath, spriteDestPath);
            }

            options.cssfile = file.src[0];

            cssSpriteSmith(options, function(err, data) {
                if(err) {
                    return callback(err);
                }

                if(data.cssData === null) {
                    grunt.file.copy(options.cssfile, cssDest);
                    grunt.log.writelns('Done! [Copied] -> ' + cssDest);

                    return callback(null);
                }

                callback(null);
            });
        }, done);
    });
};