/**
 * @author Adam Meadows [@adammeadows](https://github.com/adammeadows)
 * @copyright 2015 Cyan, Inc. All rights reserved.
 */

'use strict';

var _ = require('lodash');
var fs = require('fs');
var matchdep = require('matchdep');
var path = require('path');
var rimraf = require('rimraf');
var webpack = require('webpack');

var configDir = path.join(__dirname, '../../config');
var webpackLoaders = require(path.join(configDir, 'webpack/loaders'));
var webpackResolve = require(path.join(configDir, 'webpack/resolve'));

var ns = {};

/**
 * Move all coverage data up one level (it's grouped under a directory named for the browser used)
 * i.e, coverage/PhantomJS 1.9.7 (Linux)/index.html -> coverage/index.html
 * @param {String} coverageDir - the full path to the coverage dir
 * @param {Function} logFn - the logging function to use
 */
ns.moveCoverageUp = function (coverageDir, logFn) {
    var subDir = fs.readdirSync(coverageDir)[0];
    var fullSubDir = path.join(coverageDir, subDir);

    if (logFn) {
        logFn('found coverage directory at: ' + fullSubDir);
    }

    _.each(fs.readdirSync(fullSubDir), function (file) {
        var dest = path.join(coverageDir, file);
        rimraf.sync(dest);
        fs.renameSync(path.join(fullSubDir, file), dest);
    });

    rimraf.sync(fullSubDir);

    if (logFn) {
        logFn('moved all files to: ' + coverageDir);
    }
};

/**
 * Initialize the helper module with the grunt instance
 * @param {Object} grunt - the grunt instance loaded in the Gruntfile
 */
ns.init = function (grunt) {

    // load toolkit tasks
    var gruntTasks = matchdep.filterAll('grunt-*');
    _.without(gruntTasks, 'grunt-cli').forEach(grunt.loadNpmTasks);

    // load local tasks
    matchdep.filterAll('grunt-*', path.join(process.cwd(), 'package.json')).forEach(grunt.loadNpmTasks);

    var webpackConfig = require(path.join(process.cwd(), 'webpack.config.js'));

    // initial grunt config
    grunt.initConfig({

        eslint: {
            files: [
                './Gruntfile.js',
                'src/**/*.js',
                'spec/**/*.js',
                'demo/**/*.js',
                '!demo/bundle/*.js',
            ],

            options: {
                config: '.eslintrc',
                rulesdir: ['node_modules/beaker/src/eslint-rules'],
            }
        },

        filenames: {
            src: [
                'src/**/*.*',
                'spec/**/*.*',
                'demo/**/*.*',
                '!**/Gruntfile.js',
                '!node_modules/**',
            ],

            options: {
                valid: /^_?[a-z0-9\-\.]+\.([^\.]+)$/,
            }
        },

        karma: {
            options: {
                configFile: 'node_modules/beaker/config/karma/config.js',
            },

            unit: {
                background: true,
            },

            ci: {
                singleRun: true,
            },

            coverage: {
                singleRun: true,

                reporters: ['progress', 'coverage'],

                coverageReporter: {
                    reporters: [{
                        type: 'text-summary'
                    }, {
                        type: 'html',
                        dir: path.join(process.cwd(), 'coverage'),
                    }],
                },

                webpack: {
                    module: {
                        loaders: webpackLoaders,

                        preLoaders: [{
                            test: /\.js$/,
                            loader: path.join(process.cwd(), 'node_modules/beaker/config/karma/self-loader.js'),
                        }],

                        postLoaders: [{
                            test: /\.js$/,
                            exclude: /(spec|node_modules|karma)/,
                            loader: 'istanbul-instrumenter'
                        }],
                    },

                    resolve: webpackResolve,
                },
            },
        },

        webpack: {
            options: webpackConfig,
            build: {
                plugins: webpackConfig.plugins.concat(
                    new webpack.DefinePlugin({
                        'process.env': {
                            // This has effect on the react lib size
                            'NODE_ENV': JSON.stringify('production')
                        }
                    }),
                    new webpack.optimize.DedupePlugin(),
                    new webpack.optimize.UglifyJsPlugin()
                )
            },

            'build-dev': {
                debug: true
            }
        },

        'webpack-dev-server': {
            options: {
                webpack: webpackConfig,
                publicPath: '/' + webpackConfig.output.publicPath
            },

            start: {
                contentBase: './demo',
                keepAlive: true,
                webpack: {
                    devtool: 'eval-source-map',
                    debug: true,
                }
            }
        },

        watch: {
            app: {
                files: ['src/**/*', 'demo/**/*'],
                tasks: ['webpack:build-dev'],
                options: {
                    spawn: false,
                }
            },

            karma: {
                files: ['src/**/*', 'spec/**/*'],
                tasks: ['karma:unit:run'],
            }
        },
    });

    // =======================================================================
    // Building Tasks
    // =======================================================================

    // The development server (the recommended option for development)
    grunt.registerTask('default', ['webpack-dev-server:start']);

    // Build and watch cycle (another option for development)
    // Advantage: No server required, can run app from filesystem
    // Disadvantage: Requests are not blocked until bundle is available,
    //               can serve an old app on too fast refresh
    grunt.registerTask('dev', ['webpack:build-dev', 'watch:app']);

    // Production build
    grunt.registerTask('build', ['webpack:build']);

    // =======================================================================
    // Testing Tasks
    // =======================================================================

    // Lint file contents and file names
    grunt.registerTask('lint', ['eslint', 'filenames']);

    // Single run of unit tests (suitable for continuous integration system)
    grunt.registerTask('test', ['karma:ci']);

    // register the post-coverage task
    grunt.registerTask('post-coverage', 'Move coverage report to a more browser-friendly location', function () {
        ns.moveCoverageUp(path.join(process.cwd(), 'coverage'), grunt.log.writeln);
    });

    // Single run of unit tests where code coverage is calculated
    grunt.registerTask('test-coverage', ['karma:coverage', 'post-coverage']);

};

module.exports = ns;
