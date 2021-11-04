const { src, dest, parallel, series, watch } = require("gulp");

const loadPlugin = require("gulp-load-plugins");

const cwd = process.cwd();
let config = {
  // default config
  build: {
    src: "src",
    dist: "dist",
    temp: "temp",
    public: "public",
    paths: {
      styles: "assets/styles/*.scss",
      scripts: "assets/scripts/*.js",
      pages: "*.html",
      images: "assets/images/**",
      fonts: "assets/fonts/**",
    },
  },
};
try {
  const loadConfig = require(`${cwd}/pages.config.js`);
  config = Object.assign({}, config, loadConfig);
} catch (error) {}

const plugins = loadPlugin();
const sass = require("gulp-sass")(require("sass"));
const del = require("del");

const bs = require("browser-sync");

const clean = () => {
  return del([config.build.dist, config.build.temp]);
};

const style = () => {
  return src(config.build.paths.styles, {
    base: config.build.src,
    cwd: config.build.src,
  })
    .pipe(sass({ outputStyle: "expanded" }))
    .pipe(dest(config.build.temp))
    .pipe(bs.reload({ stream: true }));
};

const script = () => {
  return (
    src(config.build.paths.scripts, {
      base: config.build.src,
      cwd: config.build.src,
    })
      // babel需要传入配置项, presets决定需要转换的特性. 不传时, 默认不转换
      .pipe(
        plugins.babel({
          presets: [require("@babel/preset-env")],
        })
      )
      .pipe(dest(config.build.temp))
      .pipe(
        bs.reload({
          stream: true,
        })
      )
  );
};

const page = () => {
  return (
    src(config.build.paths.pages, {
      base: config.build.src,
      cwd: config.build.src,
    })
      // swig可以传入模板内变量对象集合, 在编译时填充至模板
      .pipe(
        plugins.swig({
          data: config.data,
          cache: false,
        })
      )
      .pipe(dest(config.build.temp))
      .pipe(
        bs.reload({
          stream: true,
        })
      )
  );
};

const image = () => {
  return src(config.build.paths.images, {
    base: config.build.src,
    cwd: config.build.src,
  })
    .pipe(plugins.imagemin())
    .pipe(dest(config.build.dist));
};

const font = () => {
  return src(config.build.paths.fonts, {
    base: config.build.src,
    cwd: config.build.src,
  })
    .pipe(plugins.imagemin())
    .pipe(dest(config.build.dist));
};

const extra = () => {
  return src("**", {
    base: config.build.public,
    cwd: config.build.public,
  }).pipe(dest(config.build.dist));
};

const server = () => {
  watch(
    config.build.paths.styles,
    {
      cwd: config.build.src,
    },
    style
  );
  watch(
    config.build.paths.scripts,
    {
      cwd: config.build.src,
    },
    script
  );
  watch(
    config.build.paths.pages,
    {
      cwd: config.build.src,
    },
    page
  );

  watch(
    [config.build.paths.images, config.build.paths.fonts],
    {
      cwd: config.build.src,
    },
    bs.reload
  );
  watch(
    "**",
    {
      cwd: config.build.public,
    },
    bs.reload
  );

  bs.init({
    // 是否显示提醒
    notify: false,
    // 端口号
    port: 8080,
    // 是否自动打开页面
    open: false,
    // 监听文件路径. 当其发生变化时, 页面也随之刷新
    // files: 'dist/**',
    server: {
      baseDir: [config.build.temp, config.build.src, config.build.public],
      // 自定义路径规则, 优先于baseDir
      routes: {
        "/node_modules": "node_modules",
      },
    },
  });
};

const useref = () => {
  return (
    src(config.build.paths.pages, {
      base: config.build.temp,
      cwd: config.build.temp,
    })
      .pipe(plugins.useref({ searchPath: [config.build.temp, "."] }))
      // html js css
      .pipe(plugins.if(/\.js$/, plugins.uglify()))
      .pipe(plugins.if(/\.css$/, plugins.cleanCss()))
      .pipe(
        plugins.if(
          /\.html$/,
          plugins.htmlmin({
            collapseWhitespace: true,
            minifyCSS: true,
            minifyJS: true,
          })
        )
      )
      .pipe(dest(config.build.dist))
  );
};

const compile = parallel(style, script, page);

const build = series(
  clean,
  parallel(series(compile, useref), image, font, extra)
);

const develop = series(compile, server);

module.exports = {
  clean,
  build,
  develop,
};
