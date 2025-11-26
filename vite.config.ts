import { defineConfig, loadEnv } from 'vite';
import reactRefresh from '@vitejs/plugin-react-refresh';
import { webUpdateNotice } from '@plugin-web-update-notification/vite';
import { md } from './plugins/md';
import { peggy } from './plugins/peggy';
import plusResolve from './plugins/plusResolve';

const reactSvgPlugin = require('./plugins/svg');

const codemirrorChunk = [
  '@codemirror/autocomplete',
  '@codemirror/lint',
  '@codemirror/language',
  '@codemirror/state',
  '@codemirror/view',
];

// https://vitejs.dev/config/
export default defineConfig((mode) => {
  const isHttps = process.env.NODE_ENV === 'production' || process.env.VITE_USE_HTTPS === 'true';
  const env = loadEnv(mode.mode, process.cwd());
  return {
    plugins: [
      md(),
      reactRefresh(),
      plusResolve(),
      reactSvgPlugin({ defaultExport: 'component' }),
      peggy(),
      webUpdateNotice({
        logVersion: true,
        injectFileBase: '/',
        checkInterval: 60000,
        notificationProps: {
          title: '检测到当前系统已更新，需要您重新加载页面才能生效',
          buttonText: '重新加载页面',
        },
      }),
    ],
    define: {},
    resolve: {
      alias: [
        {
          find: '@',
          replacement: '/src',
        },
      ],
    },
    server: {
      proxy: {
        '/api/web/proxy': {
          target: env.VITE_N9E_PROXY,
          changeOrigin: true,
        },
        '/api/web/datasource': {
          target: env.VITE_N9E_DATASOURCE,
          changeOrigin: true,
        },
        '/api/web/vector/vrl': {
          target: env.VITE_N9E,
          ws: true, // 启用 WebSocket 代理
          changeOrigin: true,
          secure: isHttps,
          pathRewrite: {
            '^/api/web/vector/vrl': '/api/web/vector/vrl',
          },
        },
        '/api/web': {
          target: env.VITE_N9E,
          changeOrigin: true,
        },
        '/logo.png': {
          target: env.VITE_N9E,
          changeOrigin: true,
        },
        '/favicon.png': {
          target: env.VITE_N9E,
          changeOrigin: true,
        },
      },
    },
    build: {
      target: 'modules',
      outDir: 'pub',
      chunkSizeWarningLimit: 650,
      sourcemap: false,
      rollupOptions: {
        output: {
          manualChunks: {
            reactChunk: ['react', 'react-router-dom', 'react-dom'],
            codemirrorChunk: codemirrorChunk,
            reactAceChunk: ['react-ace'],
            antdChunk: ['antd'],
            lodashChunk: ['lodash'],
            d3Chunk: ['d3'],
            ahooksChunk: ['ahooks'],
            momentChunk: ['moment'],
            iconChunk: ['@ant-design/icons'],
            requestChunk: ['umi-request'],
            layoutChunk: ['react-grid-layout'],
            colorChunk: ['color'],
            plotsChunk: ['@ant-design/plots'],
            antvG6Chunk: ['@antv/g6'],
            antvG2Chunk: ['@antv/g2'],
          },
        },
      },
    },
    css: {
      preprocessorOptions: {
        less: {
          additionalData: `@import "/src/global.variable.less";`,
          javascriptEnabled: true,
          modifyVars: {
            'primary-color': '#1890ff',
            'primary-background': '#F0ECF9',
            'disabled-color': 'rgba(0, 0, 0, 0.5)',
            'tabs-ink-bar-color': '#1890ff',
            'font-size-base': '12px',
            'menu-item-font-size': '14px',
            'radio-button-checked-bg': '#e6f7ff',
            'form-item-margin-bottom': '18px',
            'font-family': 'Monda-Regular,PingFangSC-Regular,microsoft yahei ui,microsoft yahei,simsun,"sans-serif"',
            'text-color': '#262626',
            'table-row-hover-bg': '#F4FAFF',
            'table-header-bg': '#f0f0f0',
            'select-selection-item-bg': '#e6f7ff',
            'select-selection-item-border-color': '#91d5ff',
            'checkbox-check-bg': '#fff',
            'checkbox-check-color': '#1890ff',
            'checkbox-color': 'fade(@checkbox-check-color, 10)',
            'btn-padding-horizontal-base': '12px',

            'menu-bg': '#1890ff',
            'menu-item-color': '#fff',
            'menu-highlight-color': '#fff',
            'menu-item-active-bg': 'transparent',

            'menu-inline-submenu-bg': '#F4FAFF',
            'menu-inline-submenu-color': 'rgba(0, 0, 0, 0.88)',
            'menu-inline-submenu-acitve-color': '#1890ff',
          },
        },
      },
    },
  };
});
