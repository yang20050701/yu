FROM node:16-alpine

WORKDIR /app

# 安装依赖
RUN npm install express cors axios dotenv

# 创建后端代理服务
COPY proxy-server.js .
COPY .env .

EXPOSE 3000

CMD ["node", "proxy-server.js"]

FROM node:16 as builder

WORKDIR /app
COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

FROM nginx:alpine

COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

HEALTHCHECK --interval=30s --timeout=3s \
    CMD wget -q --spider http://localhost/ || exit 1 