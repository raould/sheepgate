const path = require('path');

module.exports = {
  mode: "development",
  devtool: "inline-source-map",
  entry: {
      main: "./src/onering.ts",
  },
  output: {
    path: path.resolve(__dirname, './build'),
    filename: "sheepgate.js"
  },
  resolve: {
      extensions: [".ts", ".tsx", ".js"],
      alias: {
	  "@server": path.resolve(__dirname, 'OLD/server/src'),
	  "@client": path.resolve(__dirname, 'OLD/client/src'),
	  "@resources": path.resolve(__dirname, 'OLD/client/resources'),
      },
  },
  module: {
    rules: [
      { 
        test: /\.tsx?$/,
        loader: "ts-loader"
      }
    ]
  }
};
