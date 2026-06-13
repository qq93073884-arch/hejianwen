# 星辰妙漫炒币器(Star Matrix Terminal)
> 极客级纯前端加密货币智能选币监控终端 | 零后端依赖 | 直连交易所API
<img width="2054" height="1666" alt="2e5798c6-6cad-4b89-80e1-c8c7c0ac4de8" src="https://github.com/user-attachments/assets/e2a727a6-aac4-4090-b9a9-bc8998a57eef" />





星辰妙漫炒币器是一款面向专业交易者的轻量级加密货币量化看盘监控终端，基于纯前端技术栈构建，无需部署任何后端服务，数据直接对接主流交易所官方API，极致轻量化且隐私安全。
该工具几乎囊括了所有比较精华的技术型指标，并把每一项按权重进行打分，最终给每个币种标的得出一个比较科学的得分，使用方法很简单，左上方是推荐你目前大盘的方向，下面的标的得分越高就越容易按大盘方向走，另外还有一个哨兵监控功能，他能在后台不停的监控整个币圈的所有可能性，用算法去帮你从币海中及时的发现机会。

## 🚀 极速启动
如果你的系统已配置好Node.js环境，只需在终端依次执行以下4条命令，即可一键启动本地看盘环境：
```bash
git clone https://github.com/qq93073884-arch/hejianwen.git
cd hejianwen
npm install
npm run dev
```

## 📦 详细安装部署指南
### 1. 基础环境准备
- 安装 **Node.js**（强烈推荐 `v18.x` 或更高版本的LTS长期支持版，[官网下载地址](https://nodejs.org/)）
- 验证安装是否成功，在终端输入以下命令，正常输出版本号即为安装完成：
```bash
node -v
npm -v
```

### 2. 安装项目依赖
进入项目根目录，执行依赖安装命令。系统会自动根据`package-lock.json`精准还原开发环境，从根源杜绝版本冲突问题：
```bash
npm install
```

### 3. 配置环境变量（⚠️ 极其重要）
本项目直连真实交易数据流，请务必妥善保管你的个人API秘钥，**绝对禁止将`.env`文件上传至任何公开仓库**（本项目已默认将`.env`加入`.gitignore`）。

1. 在项目根目录新建一个名为`.env`的空白文件
2. 按照以下示例填入你的API秘钥信息：
```env
# Ably 实时数据流 Token
VITE_ABLY_API_KEY="你的_ABLY_API_秘钥"

# 如需添加其他交易所API，在此处追加
# VITE_BINANCE_API_KEY="你的_币安_API_KEY"
# VITE_OKX_API_KEY="你的_OKX_API_KEY"
```

### 4. 启动本地开发/看盘环境
```bash
npm run dev
```
引擎启动成功后，在浏览器中访问终端输出的本地地址（默认通常为 `http://localhost:5173`）即可开启星辰妙漫炒币器。

## 🌐 生产环境部署
如需将终端部署到公网供远程访问，支持Nginx服务器、阿里云/腾讯云、Vercel、Netlify等所有静态资源托管平台。

1. 执行打包命令，生成生产环境静态文件：
```bash
npm run build
```
2. 打包完成后，项目根目录会生成一个`dist`文件夹
3. 将`dist`文件夹内的**所有文件**上传至服务器根目录或托管平台即可

## ❌ 常见异常排查 FAQ
### 1. Windows PowerShell 提示「禁用了运行脚本」
这是Windows系统默认的安全策略拦截导致。解决方法：
- 右键点击PowerShell，选择「以管理员身份运行」
- 执行以下命令，按`Y`确认放行：
```powershell
Set-ExecutionPolicy RemoteSigned
```

### 2. 拉取不到数据、图表空白或提示CORS跨域错误
绝大多数情况是本地网络直接拦截了交易所API请求：
- 本地运行：请确保已开启全局网络代理
- 线上部署：建议将项目部署至香港、新加坡等海外服务器节点

### 3. `npm install` 安装依赖长时间卡住不动
NPM官方源在国内访问速度较慢，切换为国内淘宝镜像源后重新安装即可：
```bash
npm config set registry https://registry.npmmirror.com/
npm install
```

## 📝 注意事项
1. 本项目仅用于学习和个人交易辅助，不构成任何投资建议
2. 请勿将你的API秘钥泄露给任何人，也不要提交到任何公开代码仓库
3. 交易所API存在调用频率限制，高频请求可能会被临时限制访问

## 🤝 贡献指南
欢迎提交Issue和Pull Request来改进这个项目。如果你有新的功能想法或发现了Bug，请先创建一个Issue进行讨论。

## 📄 许可证
[MIT License](LICENSE)

---
[注意：中国地区用户节点请选用：日本地区。]
