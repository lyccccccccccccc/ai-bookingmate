FROM node:22-alpine AS build
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend ./
RUN npm run build

FROM nginxinc/nginx-unprivileged:1.27-alpine AS runtime
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf
COPY --chown=nginx:nginx --chmod=755 frontend/docker-entrypoint.d/40-runtime-config.sh /docker-entrypoint.d/40-runtime-config.sh
COPY --from=build --chown=nginx:nginx /app/frontend/dist /usr/share/nginx/html

EXPOSE 8080
