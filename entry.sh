#!/bin/sh

[ -z "$SHM_URL" ] || sed -i "s|http://shm.local|$SHM_URL|g" /etc/nginx/http.d/default.conf
[ -z "$SHM_HOST" ] || sed -i "s|http://shm.local|$SHM_HOST|g" /etc/nginx/http.d/default.conf
[ -z "$RESOLVER" ] || sed -i "s|resolver 127.0.0.11|resolver $RESOLVER|g" /etc/nginx/http.d/default.conf

echo "Starting nginx + backend with configuration:"
echo "  SHM_HOST: ${SHM_HOST:-http://shm.local}"
echo "  MYSQL_HOST: ${MYSQL_HOST:-localhost}"
echo "  REDIS_HOST: ${REDIS_HOST:-localhost}"

exec /usr/bin/supervisord -c /etc/supervisord.conf