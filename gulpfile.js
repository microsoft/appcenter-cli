// Gulpfile to build sonoma CLI

const clean = require('gulp-clean');
const gulp = require('gulp');
const runSeq = require('run-sequence');
const rimraf = require('rimraf');
const sourcemaps = require('gulp-sourcemaps');
const ts = require('gulp-typescript');
const autorest = require('./scripts/autorest');

let tsProject = ts.createProject('tsconfig.json');

//
// General compile
//

gulp.task('clean', function (done) {
  rimraf('dist', done);
});

gulp.task('build-ts', function () {
  let tsResult = gulp.src(['src/**/*.ts', 'typings/**/*.d.ts'])
    .pipe(tsProject());

  return tsResult.js
    .pipe(gulp.dest('dist'));
});

gulp.task('build-ts-sourcemaps', function () {
  let tsResult = gulp.src(['src/**/*.ts', 'typings/**/*.d.ts'])
    .pipe(sourcemaps.init())
    .pipe(tsProject());

  return tsResult.js
    .pipe(sourcemaps.write('.', { includeContent:false, sourceRoot: '.' }))
    .pipe(gulp.dest('dist'));
});

gulp.task('copy-assets', function () {
  return gulp.src('src/**/*.txt')
    .pipe(gulp.dest('dist'));
});

gulp.task('copy-generated-client', function () {
  return gulp.src('src/util/apis/generated/**/*.[tj]s')
    .pipe(gulp.dest('dist/util/apis/generated'));
});

gulp.task('build', [ 'build-ts', 'copy-assets', 'copy-generated-client' ]);

gulp.task('build-sourcemaps', [ 'build-ts-sourcemaps', 'copy-assets', 'copy-generated-client' ]);

gulp.task('clean-sourcemaps', function (cb) {
  return gulp.src('dist/**/*.js.map')
    .pipe(clean())
});

//
// Client code generation. Requires mono to be installed on the machine
// on a mac or linux machine
//
const generatedSource = './src/util/apis/generated';

gulp.task('clean-autorest', function (done) {
  rimraf(generatedSource, done);
});

gulp.task('fixup-swagger', function () {
  autorest.fixupRawSwagger('./swagger/bifrost.swagger.before.json', './swagger/bifrost.swagger.json');
});

gulp.task('autorest', ['fixup-swagger'], function () {
  return autorest.downloadTools()
    .then(() => autorest.generateCode('./swagger/bifrost.swagger.json', generatedSource, 'MobileCenterClient'));
});

//
// Prepublish script - set up everything before publishing to npm
//
gulp.task('prepublish', function(done) {
  runSeq('clean', 'build', done);
});

//
// Default task - build the code
//

gulp.task('default', [ 'build' ]);
