// Gulpfile to build sonoma CLI

const gulp = require('gulp');
const rimraf = require('rimraf');
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

  return tsResult.js.pipe(gulp.dest('dist'));
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

gulp.task('autorest', ['clean-autorest', 'fixup-swagger'], function () {
  return autorest.downloadTools()
    .then(() => autorest.generateCode('./swagger/bifrost.swagger.json', generatedSource, 'MobileCenterClient'));
});

//
// Default task - build the code
//

gulp.task('default', [ 'build' ]);

