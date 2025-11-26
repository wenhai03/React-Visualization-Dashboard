FROM harbor.devops.cndinfo.com/proxy/library/node:16-alpine as builder

WORKDIR /work

COPY package.json package-lock.json ./
RUN npm config set registry https://registry.npmmirror.com \
    && npm install

COPY . .
RUN npm run build

FROM harbor.devops.cndinfo.com/proxy/library/nginx:1.25.3-alpine3.18-slim

COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /work/pub /usr/share/nginx/html
