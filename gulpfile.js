const gulp = require('gulp');
const ts = require('gulp-typescript');

gulp.task('compile', () => {
  var tsProject = ts.createProject('tsconfig.json');
  var tsResult = tsProject.src()
    .pipe(tsProject());

  return tsResult.js.pipe(gulp.dest('dist'));
});

gulp.task('copyAssets', () => {
  gulp.src('./src/**/*.json')
    .pipe(gulp.dest('./dist'));
});

gulp.task('build', ['compile', 'copyAssets']);
gulp.task('default', ['build']);
