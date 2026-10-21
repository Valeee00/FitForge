const path = require('node:path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const webpack = require('webpack');
const { ModuleFederationPlugin } = webpack.container;
const versions = require('../package.json').dependencies;

// Each app is compiled separately. Federation resolves remote components at runtime.
module.exports = ({ name, directory, port, exposes = {}, host = false }) => (_, argv) => {
  const production = argv.mode === 'production';
  const remote = (container, folder, port) => {
    if (!production) return `${container}@http://localhost:${port}/remoteEntry.js`;
    // Resolve against the site root (also supports deploying inside a subdirectory).
    return `promise new Promise((resolve, reject) => {
      const base = new URL(document.baseURI);
      const url = new URL('${folder}/remoteEntry.js', base).href;
      const script = document.createElement('script');
      const timer = setTimeout(() => { script.remove(); reject(new Error('Tempo esgotado ao carregar ${folder}')); }, 15000);
      script.src = url;
      script.onload = () => { clearTimeout(timer); const container = window['${container}']; if (!container) { reject(new Error('Container ${container} ausente')); return; } resolve({ get: (request) => container.get(request), init: (scope) => container.init(scope) }); };
      script.onerror = () => { clearTimeout(timer); reject(new Error('Não foi possível carregar ${folder}')); };
      document.head.appendChild(script);
    })`;
  };
  return {
    context: directory,
    entry: './src/index.jsx',
    output: { path: path.join(directory, 'dist'), filename: production ? '[name].[contenthash:8].js' : '[name].js', chunkFilename: '[name].[contenthash:8].js', publicPath: 'auto', uniqueName: name, clean: true },
    devtool: production ? false : 'source-map',
    resolve: { extensions: ['.jsx', '.js'] },
    module: { rules: [
      { test: /\.[jt]sx?$/, exclude: /node_modules/, use: { loader: 'babel-loader', options: { presets: [['@babel/preset-env', { targets: 'defaults' }], ['@babel/preset-react', { runtime: 'automatic' }]] } } },
      { test: /\.css$/, use: ['style-loader', 'css-loader'] }
    ] },
    plugins: [
      // URL do API Gateway (Atividade 16). Vazia = dados só no navegador (localStorage).
      new webpack.DefinePlugin({ __FITFORGE_API_URL__: JSON.stringify(process.env.FITFORGE_API_URL || '') }),
      new ModuleFederationPlugin({ name, filename: 'remoteEntry.js', exposes,
        remotes: host ? { workouts: remote('fitforge_workouts', 'mfe-workouts', 5001), progress: remote('fitforge_progress', 'mfe-progress', 5002) } : {},
        shared: { react: { singleton: true, requiredVersion: versions.react, strictVersion: true }, 'react-dom': { singleton: true, requiredVersion: versions['react-dom'], strictVersion: true } }
      }),
      new HtmlWebpackPlugin({ template: path.resolve(__dirname, '../template.html'), title: host ? 'FitForge · Seu próximo nível' : `FitForge · ${name === 'fitforge_workouts' ? 'Treinos' : 'Progresso'}` })
    ],
    devServer: { port, host: '0.0.0.0', allowedHosts: ['localhost', '127.0.0.1'], headers: { 'Access-Control-Allow-Origin': '*' }, historyApiFallback: false, hot: true, client: { overlay: true }, static: { directory: path.join(directory, 'dist') } },
    // Federation must retain separate runtimes/chunks; do not combine all entries.
    optimization: { runtimeChunk: false },
    performance: { hints: false }
  };
};
