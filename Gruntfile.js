'use strict';

module.exports = function(grunt) {

  // Project configuration.
  grunt.initConfig({
    jshint: {
      all: [
        'Gruntfile.js',
        'tasks/*.js',
        '<%= nodeunit.tests %>'
      ],
      options: {
        jshintrc: '.jshintrc'
      }
    },

    // Configuration to be run (and then tested).
    mocha: {
      src: [ 'spec/runner.html' ],
      options: {
        // Bail means if a test fails, grunt will abort. False by default.
        bail: true,

        // Pipe output console.log from your JS to grunt. False by default.
        log: true,

        // mocha options
        // mocha: {
        //   ignoreLeaks: false,
        //   grep: 'food'
        // },

        // Select a Mocha reporter
        // http://visionmedia.github.com/mocha/#reporters
        reporter: 'Nyan',

        // Indicates whether 'mocha.run()' should be executed in
        // 'bridge.js'. If you include `mocha.run()` in your html spec,
        // check if environment is PhantomJS. See example/test/test2.html
        run: true,

        // Override the timeout of the test (default is 5000)
        timeout: 10000
      }

    }

  });


  // These plugins provide necessary tasks.
  // grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-mocha');


  // Whenever the "test" task is run, first clean the "tmp" dir, then run this
  // plugin's task(s), then test the result.
  grunt.registerTask('test', ['mocha']);

  // By default, lint and run all tests.
  grunt.registerTask('default', ['test']);

};
