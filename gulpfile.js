var gulp = require('gulp')
var babel = require('gulp-babel')
var print = require('gulp-print')
var rimraf = require('rimraf')

gulp.task('default', function() {
    gulp.src('src/**/*.js')
        .pipe(print())
        .pipe(babel({
            stage: 1,
            optional: [ 'runtime' ]
        }))
        .pipe(gulp.dest('build/'))
})

gulp.task('watch', function() {
    gulp.watch('src/**/*.js', [ 'default' ])
})

gulp.task('clean', function(cb) {
    rimraf.sync('./build')
    cb()
})
