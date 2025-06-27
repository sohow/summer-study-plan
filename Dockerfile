# Stage 1: Build the frontend assets and install backend dependencies
# 使用 Node.js 22 的 Alpine 版本作为构建阶段的基础镜像，Alpine 版本更小
FROM node:22-alpine AS builder

# 设置工作目录
WORKDIR /app

# 复制 package.json 和 package-lock.json（如果存在）
# 这一步是为了利用 Docker 缓存，如果依赖未变，则不会重新安装
COPY package*.json ./

# 安装所有依赖（包括 devDependencies），以便运行构建脚本
RUN npm install

# 复制所有项目文件
COPY . .

# 构建前端资产（Webpack 会将 public/ 中的文件打包到 dist/）
RUN npm run build

# Stage 2: Create the final production image
# 使用相同的 Node.js 22 Alpine 版本作为最终生产镜像的基础镜像
FROM node:22-alpine

# 设置工作目录
WORKDIR /app

# 为了更小的生产镜像，我们只安装生产依赖
COPY package*.json ./
RUN npm install --production

# 从构建阶段复制已构建的前端资源和后端服务器文件
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server.js ./server.js
COPY --from=builder /app/public/tasks.js ./public/tasks.js

# 暴露应用运行的端口
EXPOSE 3000

# 设置 NODE_ENV 环境变量为 production
ENV NODE_ENV=production

# 定义容器启动时运行的命令
CMD ["node", "server.js"]
