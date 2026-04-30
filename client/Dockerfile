FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY client/package*.json ./client/
RUN cd client && npm ci

COPY client/src ./client/src
COPY client/public ./client/public
COPY client/jsconfig.json ./client/ 2>/dev/null || true
COPY client/tailwind.config.js ./client/ 2>/dev/null || true
COPY client/postcss.config.js ./client/ 2>/dev/null || true

ENV REACT_APP_API_URL=/api
RUN cd client && npm run build

FROM nginx:alpine

COPY --from=builder /app/client/build /usr/share/nginx/html
COPY client/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:80 || exit 1

CMD ["nginx", "-g", "daemon off;"]
