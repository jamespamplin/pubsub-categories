'use strict';

module.exports = function(grunt) {

  // Project configuration.
  grunt.initConfig({
    jshint: {
      all: [
        'Gruntfile.js',
        'pubsub-categories.js',
        'spec/*.js'
      ],
      options: {
        jshintrc: '.jshintrc'
      }
    },


    mocha_phantomjs: {
      test: {
        src: [ 'spec/runner.html' ]
      }
    }

  });


  // These plugins provide necessary tasks.
  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-mocha-phantomjs');


  // Whenever the "test" task is run, first clean the "tmp" dir, then run this
  // plugin's task(s), then test the result.
  grunt.registerTask('test', ['jshint', 'mocha_phantomjs']);

  // By default, lint and run all tests.
  grunt.registerTask('default', ['test']);

};
