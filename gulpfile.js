// Gulpfile to build sonoma CLI

const clean = require('gulp-clean');
const gulp = require('gulp');
const rimraf = require('rimraf');
const sourcemaps = require('gulp-sourcemaps');
const ts = require('gulp-typescript');
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

gulp.task('generate-autocomplete-tree', function (done) {
  autocompleteTree.generateAndSave();
  done();
});

gulp.task('copy-test-templates', function () {
  return gulp.src('src/commands/test/lib/templates/**/*')
    .pipe(gulp.dest('dist/commands/test/lib/templates'));
});

gulp.task('build:raw',
  gulp.series(
    gulp.parallel('build-ts', 'copy-assets', 'copy-generated-client'),
    gulp.series('generate-autocomplete-tree', 'copy-test-templates')
  )
);

gulp.task('build-sourcemaps',
  gulp.series(
    gulp.parallel('build-ts-sourcemaps', 'copy-assets', 'copy-generated-client'),
    gulp.series('generate-autocomplete-tree', 'copy-test-templates')
  )
);

gulp.task('clean-sourcemaps', function () {
  return gulp.src('dist/**/*.js.map')
    .pipe(clean())
});

//
// Stop people from using gulp build to skip tslint
//
gulp.task('build', function () {
  throw new Error('Do not use gulp build! Run "npm run build" instead!');
});

//
// Prepublish script - set up everything before publishing to npm
//
gulp.task('prepublish',
  gulp.series(
    'clean',
    'build:raw'
  )
);

//
// Default task - build the code
//
gulp.task('default', gulp.series('build:raw'));
