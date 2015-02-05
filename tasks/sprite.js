var path = require('path');
var async = require('async');
var assert = require('assert');
var cssSpriteSmith = require('css-spritesmith');

module.exports = function(grunt) {
    "use strict";

    grunt.registerMultiTask('sprite', 'Create sprite image with slices and update the CSS file.', function() {
        var done = this.async();

        var defaultOptions = cssSpriteSmith.defaultOptions;
        defaultOptions.spritepath = null;

        var options = this.options(defaultOptions);

        assert(options.imagepath, 'An `imagepath` parameter was not provided');
        assert(options.spritedest, 'An `spritedest` parameter was not provided');

        // auto compete spritepath
        var autoSpritePath = options.spritepath === null;

        async.eachLimit(this.files, 10, function(file, callback) {
            var cssDest = file.dest;

            if(autoSpritePath) {
                var cssDestPath = path.resolve(path.dirname(cssDest));
                var spriteDestPath = path.resolve(options.spritedest);

                options.spritepath = path.relative(cssDestPath, spriteDestPath);
            }

            options.cssfile = file.src[0];

            cssSpriteSmith(options, function(err, data) {
                if(err) {
                    return callback(err);
                }

                if(data.cssData === null) {
                    console.log(options.cssfile, cssDest);
                    grunt.file.copy(options.cssfile, cssDest);
                    grunt.log.writelns('Done! [Copied] -> ' + cssDest);

                    return callback(null);
                }

                // write css
                grunt.file.write(cssDest, data.cssData);
                grunt.log.writelns('Done! [Created] -> ' + cssDest);

                // write sprite
                var spriteData = data.spriteData;
                grunt.file.write(spriteData.imagePath, data.spriteData.image, {
                    encoding: 'binary'
                });
                grunt.log.writelns('Done! [Created] -> ' + spriteData.imagePath);

                // write retina sprite
                var retinaSpriteData = data.retinaSpriteData;
                if(retinaSpriteData) {
                    grunt.file.write(retinaSpriteData.imagePath, data.retinaSpriteData.image, {
                        encoding: 'binary'
                    });
                    grunt.log.writelns('Done! [Created] -> ' + retinaSpriteData.imagePath);
                }

                callback(null);
            });
        }, done);
    });
};