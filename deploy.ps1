# Sube maIAs al VPS y lo sirve en http://IP:8080 sin tocar los otros sitios de nginx.
# Uso (PowerShell, dentro de la carpeta del proyecto):   .\deploy.ps1
#   Otro puerto:  .\deploy.ps1 -Port 8090
#   Solo probar el empaquetado, sin conectarse:  .\deploy.ps1 -SoloEmpaquetar
# Pide la contrasena de root una sola vez (la escribes tu; este script no la guarda).
# Si PowerShell bloquea el script:  powershell -ExecutionPolicy Bypass -File .\deploy.ps1
param(
  [string]$Servidor = "45.85.147.135",
  [string]$Usuario = "root",
  [int]$Port = 80,
  [switch]$SoloEmpaquetar
)
$ErrorActionPreference = "Stop"
$proj = Split-Path -Parent $MyInvocation.MyCommand.Path
$dir = "/var/www/maias"
$tmp = Join-Path $env:TEMP "maias_deploy"
New-Item -ItemType Directory -Force $tmp | Out-Null

foreach ($c in "ssh", "tar") {
  if (-not (Get-Command $c -ErrorAction SilentlyContinue)) { throw "No encuentro '$c'. Activa 'Cliente OpenSSH' en Caracteristicas opcionales de Windows." }
}

# --- script que se ejecuta en el servidor (viaja dentro del paquete) ---
$setup = @'
set -e
PORT=__PORT__
DIR=__DIR__
if ss -ltn | grep -q ":$PORT " && [ ! -f /etc/nginx/sites-enabled/maias ]; then
  echo "ERROR: el puerto $PORT ya lo usa otro servicio. Corre de nuevo con -Port <otro>." >&2
  exit 1
fi
mkdir -p $DIR
find $DIR -mindepth 1 -delete
cp -a /tmp/maias_up/. $DIR/
rm -f $DIR/_setup.sh
rm -rf /tmp/maias_up
chown -R www-data:www-data $DIR
cat > /etc/nginx/sites-available/maias <<NGINX
server {
    listen $PORT;
    listen [::]:$PORT;
    server_name maias.org www.maias.org;
    return 301 https://\$host\$request_uri;
}
NGINX
if [ -f /etc/letsencrypt/live/maias.org/fullchain.pem ]; then
  cat >> /etc/nginx/sites-available/maias <<SSLBLOCK

server {
    listen 443 ssl;
    listen [::]:443 ssl;
    server_name maias.org www.maias.org;
    root $DIR;
    index index.html;

    ssl_certificate /etc/letsencrypt/live/maias.org/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/maias.org/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    gzip on;
    gzip_types text/css application/javascript image/svg+xml application/json;

    location / { try_files \$uri \$uri/ =404; }
    location ~* \.(png|jpe?g|webp|svg|woff2?|ttf)\$ { expires 7d; add_header Cache-Control "public"; }
    location ~* \.(css|js)\$ { expires 1h; add_header Cache-Control "public"; }
}
SSLBLOCK
fi
ln -sf /etc/nginx/sites-available/maias /etc/nginx/sites-enabled/maias
nginx -t
systemctl reload nginx
if command -v ufw >/dev/null && ufw status | grep -q "Status: active"; then ufw allow $PORT/tcp; ufw allow 443/tcp; fi
echo -n "Respuesta local: "; curl -sI http://127.0.0.1:$PORT | head -1
'@
$setup = $setup.Replace("__PORT__", "$Port").Replace("__DIR__", $dir).Replace("`r`n", "`n")
[IO.File]::WriteAllText((Join-Path $tmp "_setup.sh"), $setup, (New-Object Text.UTF8Encoding($false)))

# --- empaquetar (el script de servidor va dentro) ---
$tgz = Join-Path $tmp "maias.tgz"
if (Test-Path $tgz) { Remove-Item $tgz -Force }
tar -czf $tgz --exclude deploy.sh --exclude deploy.ps1 --exclude .git --exclude .claude --exclude node_modules -C $proj . -C $tmp _setup.sh
if ($LASTEXITCODE -ne 0) { throw "Fallo al empaquetar." }
"Paquete listo: {0:N1} MB" -f ((Get-Item $tgz).Length / 1MB)
if ($SoloEmpaquetar) { "(-SoloEmpaquetar: no me conecte al servidor)"; return }

# --- subir y configurar con UNA sola conexion ssh (la entrada se lee del archivo, en binario) ---
$remoto = "rm -rf /tmp/maias_up; mkdir -p /tmp/maias_up; tar xzf - -C /tmp/maias_up; bash /tmp/maias_up/_setup.sh"
$bat = Join-Path $tmp "run.cmd"
"@echo off`r`nssh -o StrictHostKeyChecking=accept-new $Usuario@$Servidor `"$remoto`" < `"$tgz`"`r`nexit /b %errorlevel%" |
  Set-Content -Encoding ASCII $bat
"Subiendo a $Usuario@$Servidor (te pedira la contrasena) ..."
cmd /c $bat
if ($LASTEXITCODE -ne 0) { throw "Fallo el despliegue (codigo $LASTEXITCODE). Revisa el mensaje de arriba." }
""
"Listo: http://${Servidor}:$Port"
