#!/usr/bin/env bash
# Sube maIAs al VPS y lo sirve en http://IP:8080 sin tocar los otros sitios de nginx.
# Uso (desde Git Bash, dentro de la carpeta del proyecto):   bash deploy.sh
# Pide la contraseña de root una sola vez (la escribes tú; este script no la guarda).
set -euo pipefail

HOST="${HOST:-45.85.147.135}"
USER_SSH="${USER_SSH:-root}"
PORT="${PORT:-8080}"
DIR="/var/www/maias"

cd "$(dirname "$0")"

REMOTE=$(cat <<R
set -e
if ss -ltn | grep -q ':$PORT ' && [ ! -f /etc/nginx/sites-enabled/maias ]; then
  echo "ERROR: el puerto $PORT ya lo usa otro servicio. Cambia PORT y vuelve a correr." >&2
  exit 1
fi
mkdir -p $DIR
find $DIR -mindepth 1 -delete
tar xzf - -C $DIR
chown -R www-data:www-data $DIR
cat > /etc/nginx/sites-available/maias <<'NGINX'
server {
    listen $PORT;
    listen [::]:$PORT;
    server_name _;
    root $DIR;
    index index.html;

    gzip on;
    gzip_types text/css application/javascript image/svg+xml application/json;

    location / { try_files \$uri \$uri/ =404; }
    location ~* \.(png|jpe?g|webp|svg|woff2?|ttf)\$ { expires 7d; add_header Cache-Control "public"; }
    location ~* \.(css|js)\$ { expires 1h; add_header Cache-Control "public"; }
}
NGINX
ln -sf /etc/nginx/sites-available/maias /etc/nginx/sites-enabled/maias
nginx -t
systemctl reload nginx
if command -v ufw >/dev/null && ufw status | grep -q "Status: active"; then ufw allow $PORT/tcp; fi
echo -n "Respuesta local: "; curl -sI http://127.0.0.1:$PORT | head -1
R
)

echo "Empaquetando y subiendo a $USER_SSH@$HOST ..."
tar czf - \
  --exclude='./deploy.sh' --exclude='./.git' --exclude='./.claude' --exclude='./node_modules' \
  . | ssh "$USER_SSH@$HOST" "$REMOTE"

echo
echo "Listo: http://$HOST:$PORT"
