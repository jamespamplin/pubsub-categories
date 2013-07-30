'use strict';

module.exports = function(grunt) {


  // Custom task to instrument source with istanbul, spawn mocha in phantom, then generate reports.
  grunt.registerTask('mocha_cover', 'Coverage in phantomjs.', function() {
    var fs = require('fs'),
    path = require('path'),
    exists = fs.existsSync || path.existsSync,
    istanbul = require('istanbul'),

    done = this.async(),
    phantomjs,

    // script = 'node_modules/mocha-phantomjs/lib/mocha-phantomjs.coffee',
    script = 'lib/mocha-phantomjs-coverage.coffee',
    page = 'spec/runner.coverage.html',
    reporter = 'spec',
    config = '{}',

    spawnArgs = [script, page, reporter, config],
    spawn = function(cmd) {
      grunt.util.spawn({
        cmd: cmd,
        args: spawnArgs

      }, function(error, result, code) {
        var coverageJson = grunt.file.readJSON('coverage/coverage.json');

        var collector = new istanbul.Collector();
        collector.add(coverageJson);

        var options = { dir: 'coverage'};
        istanbul.Report.create('lcov', options).writeReport(collector, true);


        done();
      });
    };

    grunt.file.mkdir('coverage/instrumented');

    function instrument(cb) {

      var instrumenter = new istanbul.Instrumenter(),
      file = 'pubsub-categories.js',
      code = grunt.file.read(file);


      instrumenter.instrument(code, file, function(err, instrumentedCode) {
        if (!err) { grunt.file.write('coverage/instrumented/' + file, instrumentedCode); }
        cb();
      });

    }


    function spawnPhantom() {
      for (var i=0; i < module.paths.length; i++) {
        var bin = path.join(module.paths[i], '.bin/phantomjs');
        if (process.platform === 'win32') {
          bin += '.cmd';
        }
        if (exists(bin)) {
          phantomjs = spawn(bin, spawnArgs);
          break;
        }
      }
      if (phantomjs === undefined) { phantomjs = spawn('phantomjs', spawnArgs); }
    }


    instrument(spawnPhantom);


  });


  // task to send coverage to coveralls.io
  grunt.registerTask('coveralls', 'Sync coverage to coveralls.io', function() {
    var done = this.async(),

    lcov = grunt.file.read('coverage/lcov.info'),

    coveralls = grunt.util.spawn({ cmd: './node_modules/coveralls/bin/coveralls.js' }, function(error, result, code) {
      if (error) {
        grunt.fail.fatal(error);
      }
      done();
    });

    coveralls.stdout.pipe(process.stdout);
    coveralls.stderr.pipe(process.stderr);

    coveralls.stdin.end(lcov);

  });


  // Project configuration.
  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),

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


    watch: {
      scripts: {
        files: ['*.js', 'spec/**/*.js'],
        tasks: ['test']
      }
    },


    mocha_phantomjs: {
      test: {
        src: [ 'spec/runner.html', 'spec/runner.require.html' ]
      }
    },


    uglify: {
      build: {
        options: {
          banner:
            '/*!\n' +
            ' * <%= pkg.name %> v<%= pkg.version %> - Copyright (c) James Pamplin <%= grunt.template.today("yyyy") %>\n' +
            ' * https://github.com/jamespamplin/pubsub-categories\n' +
            ' * MIT license\n' +
            ' */\n',
          report: 'gzip'
        },
        files: {
          'pubsub-categories.min.js': ['pubsub-categories.js']
        }
      }
    }

  });


  // These plugins provide necessary tasks.
  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-contrib-uglify');
  grunt.loadNpmTasks('grunt-contrib-watch');
  grunt.loadNpmTasks('grunt-mocha-phantomjs');


  grunt.registerTask('test', ['jshint', 'mocha_phantomjs', 'mocha_cover']);
  grunt.registerTask('cover', [ 'mocha_cover' ]);
  grunt.registerTask('ci', [ 'test', 'coveralls' ]);
  grunt.registerTask('build', [ 'uglify' ]);


  // By default, lint and run all tests.
  grunt.registerTask('default', ['test']);

};
