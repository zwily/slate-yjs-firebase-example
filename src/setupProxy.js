const proxy = require("http-proxy-middleware");

module.exports = function (app) {
  app.use(
    "/__",
    proxy({
      target: "https://slate-yjs-firebase-demo.web.app/",
      changeOrigin: true,
    })
  );
};
