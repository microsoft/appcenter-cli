// Gulpfile to build sonoma CLI

const clean = require('gulp-clean');
const gulp = require('gulp');
const minimist = require('minimist');
const runSeq = require('run-sequence');
const rimraf = require('rimraf');
const sourcemaps = require('gulp-sourcemaps');
const ts = require('gulp-typescript');
const util = require('util');
const autorest = require('./scripts/autorest');
const autocompleteTree = require('./scripts/autocomplete-tree');

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

gulp.task('generate-autocomplete-tree', function () {
  autocompleteTree.generateAndSave();
});

gulp.task('build', function(done) {
  runSeq([ 'build-ts', 'copy-assets', 'copy-generated-client' ], 'generate-autocomplete-tree', done);
});

gulp.task('build-sourcemaps', function(done) {
  runSeq([ 'build-ts-sourcemaps', 'copy-assets', 'copy-generated-client' ], 'generate-autocomplete-tree', done);
});

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

const parseOpts = {
  string: 'env',
  alias: { env: 'e' },
  default: { env: 'prod' }
};

gulp.task('download-autorest-tools', function () {
  return autorest.downloadTools();
});

gulp.task('download-swagger', function() {
  const args = minimist(process.argv.slice(2), parseOpts);
  return autorest.downloadSwagger(args.env);
});

gulp.task('generate-client', function () {
  return autorest.generateCode('./swagger/bifrost.swagger.json', generatedSource, 'MobileCenterClient');
});

gulp.task('autorest', ['clean-autorest'], function (done) {
  runSeq(['download-autorest-tools', 'download-swagger'], 'fixup-swagger', 'generate-client', done);
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
