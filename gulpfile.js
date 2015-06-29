var gulp = require('gulp')
var babel = require('gulp-babel')
var print = require('gulp-print')
var watch = require('gulp-watch')

gulp.task('default', function() {
    gulp.src('assets/js/**/*.js')
        .pipe(print())
        .pipe(babel({
            stage: 1,
            optional: [ 'runtime' ]
        }))
        .pipe(gulp.dest('build/js'))
})

gulp.task('watch', function() {
    gulp.src('assets/js/**/*.js')
        .pipe(watch('assets/js/**/*.js'))
        .pipe(print())
        .pipe(babel({
            stage: 1,
            optional: [ 'runtime' ]
        }))
        .pipe(gulp.dest('build/js'))
})
