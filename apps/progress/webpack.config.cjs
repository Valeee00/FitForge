module.exports = require('../../scripts/webpack.common.cjs')({ name: 'fitforge_progress', directory: __dirname, port: 5002, exposes: { './App': './src/App.jsx', './api': './src/api.js' } });
