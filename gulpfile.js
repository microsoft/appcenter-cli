// Gulpfile to build sonoma CLI

const gulp = require('gulp');
const rimraf = require('rimraf');
const ts = require('gulp-typescript');

let tsProject = ts.createProject('tsconfig.json');

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

gulp.task('default', [ 'build' ]);

