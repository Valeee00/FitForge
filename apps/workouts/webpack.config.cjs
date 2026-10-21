module.exports = require('../../scripts/webpack.common.cjs')({ name: 'fitforge_workouts', directory: __dirname, port: 5001, exposes: { './App': './src/App.jsx', './api': './src/api.js' } });
