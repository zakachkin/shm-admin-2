# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./

RUN npm ci

COPY . .

RUN npm run build

FROM node:20-alpine AS shm-admin-2

RUN apk add --no-cache nginx supervisor wget

EXPOSE 80 3001

COPY nginx.conf /etc/nginx/http.d/default.conf

COPY supervisord.conf /etc/supervisord.conf

COPY entry.sh /entry.sh
RUN chmod +x /entry.sh

COPY --from=builder /app/dist /app
COPY --from=builder /app/swagger /app/swagger

COPY --from=builder /app/server /app/server
COPY --from=builder /app/node_modules /app/node_modules
COPY --from=builder /app/package.json /app/package.json

WORKDIR /app

ENTRYPOINT ["/entry.sh"]
HEALTHCHECK --interval=30s --timeout=5s --retries=3 CMD wget --no-verbose --tries=1 --spider http://127.0.0.1/api/health || exit 1
