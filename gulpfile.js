var gulp = require('gulp');
var sourcemaps = require('gulp-sourcemaps');
var source = require('vinyl-source-stream');
var buffer = require('vinyl-buffer');
var browserify = require('browserify');
var watchify = require('watchify');
var babel = require('babelify');
var reactify = require('reactify');
var gls = require('gulp-live-server');
var spawn = require('child_process').spawn;
var node;
function compile(watch, target, filename) {
  var bundler = watchify(browserify(target, { debug: true })
    .transform(babel, {presets: ["env", "react"]}));

  function rebundle() {
    bundler.bundle()
      .on('error', function(err) { console.error(err); this.emit('end'); })
      .pipe(source(filename))
      .pipe(buffer())
      .pipe(sourcemaps.init({ loadMaps: true }))
      .pipe(sourcemaps.write('./'))
      .pipe(gulp.dest('./dist'));
  }

  if (watch) {
    bundler.on('update', function() {
      console.log('-> bundling...');
      rebundle();
    });
  }

  rebundle();
}

function watch(target, filename) {
  return compile(true, target, filename);
};

gulp.task('server', function() {
  if (node) node.kill()
  node = spawn('npm', ['start'], {stdio: 'inherit'})
  node.on('close', function (code) {
    if (code === 8) {
      gulp.log('Error detected, waiting for changes...');
    }
  });
});

gulp.task('build:client', function() { return compile('./src/client/main.js', './src/client/main.js'); });
gulp.task('watch:client', function() { return watch('./src/client/main.js', './src/client/main.js'); });

gulp.task('default', ['watch:client'], () => {
  gulp.run('server');
  gulp.watch('./src/**.js', () => {
    gulp.run('server');
  });
});
process.on('exit', function() {
    if (node) node.kill()
})
