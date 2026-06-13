import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import obfuscatorPlugin from 'vite-plugin-javascript-obfuscator'

export default defineConfig({
  plugins: [
    react(),
    obfuscatorPlugin({
      include: ['src/**/*.jsx', 'src/**/*.js'],
      exclude: [/node_modules/],
      apply: 'build',
      options: {
        compact: true, // 极致压缩
        controlFlowFlattening: true, // 打乱代码执行顺序（防盗神技）
        controlFlowFlatteningThreshold: 0.7, 
        deadCodeInjection: true, // 注入废代码干扰视线
        deadCodeInjectionThreshold: 0.4,
        stringArray: true, // 字符串加密
        stringArrayEncoding: ['base64'], 
        stringArrayThreshold: 0.75,
        unicodeEscapeSequence: false
      }
    })
  ],
})