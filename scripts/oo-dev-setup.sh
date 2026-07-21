#!/usr/bin/env bash
#
# oo-dev-setup.sh - Start OnlyOffice Document Server with Scribe plugin mounted
#
# Usage: Run from the repository root:
#   ./scripts/oo-dev-setup.sh
#
# This script:
#   1. Starts the OO Document Server in Docker with the Scribe plugin volume-mounted
#   2. Waits for the server to be ready
#   3. Prints the OO Document Server version
#   4. Registers the plugin
#   5. Prints instructions for next steps

set -euo pipefail

CONTAINER_NAME="oo-dev"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PLUGIN_HOST_PATH="$(cd "$(dirname "$0")/.." && pwd)/plugins/onlyoffice-scribe"
PLUGIN_CONTAINER_PATH="/var/www/onlyoffice/documentserver/sdkjs-plugins/scribe"
# OO 9.4.0.1 == documentserver build 9.4.0-129 (matches sdkjs patch tag v9.4.0.129).
# Override with OO_IMAGE=... to pin a different build.
OO_IMAGE="${OO_IMAGE:-onlyoffice/documentserver:9.4.0.1}"

echo "=== OnlyOffice Document Server - Scribe Dev Setup ==="
echo ""

# Check if container already exists
NEED_WAIT=false
if docker ps -a --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
  echo "Container '${CONTAINER_NAME}' already exists."
  if docker ps --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
    echo "Container is running."
  else
    echo "Container is stopped. Starting it..."
    docker start "${CONTAINER_NAME}"
    NEED_WAIT=true
  fi
  echo ""
else
  echo "Starting OnlyOffice Document Server..."
  echo "  Image: ${OO_IMAGE}"
  echo "  Container: ${CONTAINER_NAME}"
  echo "  Plugin mount: ${PLUGIN_HOST_PATH} -> ${PLUGIN_CONTAINER_PATH}"
  echo ""

  # Use --network=host so the container shares the host's network stack.
  # This way ALL *.localhost subdomains (alice.localhost, alice2.localhost, etc.)
  # resolve correctly without needing --add-host entries for each one.

  # Patched SDK (OO 9.4): mount ONLY sdk-all.js with the GetInlineDrawings patch.
  # On 9.4 apiBuilder.js (the builder API + our patch) lives only in sdk-all.js,
  # not sdk-all-min.js. Built from sdkjs v9.4.0.129 + the patch + the sdkjs-forms
  # addon (see ~/Dev-local/onlyoffice-sdkjs-integ [branch integration/scribe-oo-9.4.0.129]
  # and plugins/onlyoffice-scribe/oo-api-proposal.md).
  # NB: mounting the file is NOT enough to have it served — the image also ships a
  # sdk-all.js.gz that nginx prefers for every gzip-capable client. See the
  # "Refreshing the patched SDK .gz" section below, which re-derives it on every run.
  SDKJS_PATCHED_94="$(cd "$(dirname "$0")/.." && pwd)/../onlyoffice-sdkjs-integ/dist/sdkjs-patch-9.4.0.129/sdk-all.js"
  SDKJS_CONTAINER_DIR="/var/www/onlyoffice/documentserver/sdkjs/word"
  SDKJS_VOLUMES=""
  if [ -f "${SDKJS_PATCHED_94}" ]; then
    echo "  Patched SDK (9.4): mounting sdk-all.js (GetInlineDrawings + GetSelectionScreenRect)"
    SDKJS_VOLUMES="-v ${SDKJS_PATCHED_94}:${SDKJS_CONTAINER_DIR}/sdk-all.js:ro"
  else
    echo "  WARNING: 9.4 patched sdk-all.js not found at ${SDKJS_PATCHED_94}"
    echo "           Starting WITHOUT the SDK patch — inline-image extraction will fall back."
  fi

  docker run -itd \
    --network=host \
    --name "${CONTAINER_NAME}" \
    -e JWT_ENABLED=false \
    -e DS_EXAMPLE_ENABLE=true \
    -e ALLOW_PRIVATE_IP_ADDRESS=true \
    -v "${PLUGIN_HOST_PATH}:${PLUGIN_CONTAINER_PATH}" \
    ${SDKJS_VOLUMES} \
    "${OO_IMAGE}"

  echo "Container started."
  NEED_WAIT=true
fi

if [ "$NEED_WAIT" = "false" ]; then
  # Container was already running — skip wait, jump straight to JWT config
  echo "Skipping wait (container already running)."
  echo ""
else
  echo "(This may take 1-2 minutes on first start)"

  # Wait for the server to respond (up to 120 seconds)
  TIMEOUT=120
  ELAPSED=0
  while [ $ELAPSED -lt $TIMEOUT ]; do
    if curl -s -o /dev/null -w "%{http_code}" http://localhost 2>/dev/null | grep -q "200\|302"; then
      echo "Server is ready."
      break
    fi
    sleep 5
    ELAPSED=$((ELAPSED + 5))
    echo "  Still waiting... (${ELAPSED}s)"
  done

  if [ $ELAPSED -ge $TIMEOUT ]; then
    echo "WARNING: Server did not respond within ${TIMEOUT}s."
    echo "Check logs with: docker logs ${CONTAINER_NAME}"
    echo "The server may still be starting up. Wait a bit and try http://localhost"
  fi
fi

echo ""
echo "=== OO Document Server Version ==="
docker exec "${CONTAINER_NAME}" dpkg -l onlyoffice-documentserver 2>/dev/null \
  | grep onlyoffice-documentserver \
  || echo "Could not determine version. Container may still be initializing."

echo ""
echo "=== Configuring JWT ==="
# OO 9.x validates JWT even when token.enable flags are false (checkJwt runs
# regardless). The secret must match the one in cozy-stack's cozy.yml.
# We also disable token.enable flags to avoid additional validation checks
# (callbackUrl requirement, payload mismatch with editorConfig).
OO_SECRET="1Ji0VcWaWi7CPslwPtYLDf9yDDkNcF62"
docker exec "${CONTAINER_NAME}" python3 -c "
import json
SECRET = '${OO_SECRET}'
with open('/etc/onlyoffice/documentserver/local.json') as f:
    d = json.load(f)
d['services']['CoAuthoring']['token']['enable']['browser'] = False
d['services']['CoAuthoring']['token']['enable']['request']['inbox'] = False
# outbox must stay True so OO signs callbacks to cozy-stack
d['services']['CoAuthoring']['token']['enable']['request']['outbox'] = True
d['services']['CoAuthoring']['secret']['inbox']['string'] = SECRET
d['services']['CoAuthoring']['secret']['outbox']['string'] = SECRET
d['services']['CoAuthoring']['secret']['session']['string'] = SECRET
d['services']['CoAuthoring']['secret']['browser']['string'] = SECRET
with open('/etc/onlyoffice/documentserver/local.json', 'w') as f:
    json.dump(d, f, indent=2)
" 2>/dev/null && echo "JWT configured (secret: ${OO_SECRET:0:8}...)." \
  || echo "WARNING: Could not configure JWT. You may see 'security token' errors."

echo ""
echo "=== Restarting Document Service ==="
# Restart docservice to pick up the JWT config change.
docker exec "${CONTAINER_NAME}" supervisorctl restart ds:docservice 2>/dev/null \
  && echo "Document service restarted." \
  || echo "WARNING: Could not restart docservice."
sleep 3

echo ""
echo "=== Starting Example Service ==="
docker exec "${CONTAINER_NAME}" supervisorctl start ds:example 2>/dev/null \
  && echo "Example service started." \
  || echo "Could not start example service. Try: docker exec ${CONTAINER_NAME} supervisorctl start ds:example"

echo ""
echo "=== Registering Scribe Plugin ==="
docker exec "${CONTAINER_NAME}" bash -c \
  '/usr/bin/documentserver-pluginsmanager.sh --directory="/var/www/onlyoffice/documentserver/sdkjs-plugins" --update="/var/www/onlyoffice/documentserver/sdkjs-plugins/plugin-list-default.json"' \
  2>/dev/null \
  || echo "Plugin registration command failed. The plugin may still load -- try opening a document."

echo ""
echo "=== Fixing Plugin File Ownership ==="
# Docker/OO changes ownership of mounted files to container's internal user.
# Fix ownership AND permissions so the host user can always edit plugin files.
# Runs AFTER plugin registration since OO may create/modify files during registration.
docker exec "${CONTAINER_NAME}" bash -c "chown -R $(id -u):$(id -g) '${PLUGIN_CONTAINER_PATH}' && chmod -R a+rw '${PLUGIN_CONTAINER_PATH}'" 2>/dev/null \
  && echo "File ownership and permissions fixed." \
  || echo "Could not fix permissions. Run: sudo chown -R \$(whoami):\$(whoami) plugins/onlyoffice-scribe/"
# Remove .gz files created by OO (may contain stale cached versions)
rm -f "${PLUGIN_HOST_PATH}"/*.gz "${PLUGIN_HOST_PATH}"/scripts/*.gz 2>/dev/null

echo ""
echo "=== Disabling service-worker caching of patched assets ==="
# OO's editor service worker caches with a CACHE-FIRST strategy in the Cache API and
# intercepts the fetch BEFORE the network, so it serves stale files even when nginx
# says no-store. Its gate (matchesCacheablePath) runs before the cache lookup, so
# dropping a prefix from g_cacheablePrefixes is enough to make those URLs bypass the
# SW entirely — the already-cached entries simply stop being consulted.
# We drop BOTH prefixes we patch at runtime:
#   "sdkjs-plugins/"  the Scribe plugin (code.js)
#   "sdkjs/"          the patched sdk-all.js  <- added 2026-07-21
# "sdkjs/" was the third stale copy of the SDK, after the image's .gz and the browser
# HTTP cache: a coordinate patch could be correct in the container AND correct on the
# wire and STILL not run, because the SW answered from its own cache with
# transferSize 0. Cost: web-apps/fonts/dictionaries stay SW-cached, but sdkjs assets
# (AllFonts.js, sdk-all.js) now hit the network each load — slower, and correct.
# Idempotent, re-applied every run: the SW file is static in the image, so a fresh
# container ships it pristine and this re-patches it.
SW_FILE="/var/www/onlyoffice/documentserver/sdkjs/common/serviceworker/document_editor_service_worker.js"
if docker exec "${CONTAINER_NAME}" sh -c '
      SW="'"${SW_FILE}"'"
      [ -f "$SW" ] || exit 1
      # Delete each prefix entry from the g_cacheablePrefixes array literal.
      sed -i "/^[[:space:]]*\"sdkjs-plugins\/\",[[:space:]]*\$/d" "$SW"
      sed -i "/^[[:space:]]*\"sdkjs\/\",[[:space:]]*\$/d" "$SW"
      # confirm both are gone
      ! grep -q "\"sdkjs-plugins/\"," "$SW" && ! grep -q "\"sdkjs/\"," "$SW"
    ' 2>/dev/null; then
  echo "Service worker no longer caches sdkjs-plugins nor sdkjs (plugin + SDK edits reach the network)."
else
  echo "WARNING: could not patch the editor service worker — a browser 'Clear site data' may be needed to drop the old plugin code.js / sdk-all.js."
fi

echo ""
echo "=== Applying plugin no-cache nginx override ==="
# Make plugin assets always revalidate so a plain browser hard-refresh (Ctrl+Shift+R)
# picks up code.js edits — no fresh browser context needed. Re-applied on EVERY run
# because the fix lives in the image's static ds-docservice.conf: a `docker start`
# keeps it, but `docker rm` + `docker run` (fresh container) resets it to immutable.
# Idempotent via the OO-DEV-CACHE-FIX BEGIN/END markers.
DS_CONF="/etc/onlyoffice/documentserver/nginx/includes/ds-docservice.conf"
NOCACHE_SNIPPET="${SCRIPT_DIR}/oo-dev-plugins-nocache.nginx"
if [ -f "${NOCACHE_SNIPPET}" ] \
   && docker cp "${NOCACHE_SNIPPET}" "${CONTAINER_NAME}:/tmp/oo-dev-plugins-nocache.nginx" 2>/dev/null \
   && docker exec "${CONTAINER_NAME}" sh -c '
        CONF="'"${DS_CONF}"'"
        [ -f "$CONF" ] || exit 1
        cp "$CONF" "$CONF.bak"
        # drop any previous managed block, then prepend a fresh one (first-match wins)
        sed -i "/# OO-DEV-CACHE-FIX BEGIN/,/# OO-DEV-CACHE-FIX END/d" "$CONF"
        cat /tmp/oo-dev-plugins-nocache.nginx "$CONF" > "$CONF.new" && mv "$CONF.new" "$CONF"
        if nginx -t >/dev/null 2>&1; then
          nginx -s reload >/dev/null 2>&1; rm -f "$CONF.bak"
        else
          mv "$CONF.bak" "$CONF"; exit 1   # rollback a broken config, never leave it live
        fi
      ' 2>/dev/null; then
  echo "Plugins served no-store (hard refresh picks up code.js); nginx reloaded."
else
  echo "WARNING: could not apply plugin no-cache override — a hard refresh may serve a stale plugin."
  echo "  Fallback: open the editor in a fresh browser context/incognito to load new code.js."
fi

echo ""
echo "=== Refreshing the patched SDK .gz ==="
# The image ships /var/www/.../sdkjs/word/sdk-all.js.gz, and nginx's gzip_static
# serves THAT to every gzip-capable client — i.e. every browser. Bind-mounting the
# patched sdk-all.js therefore changes NOTHING on its own: the browser keeps getting
# the stale .gz, silently, with a 200 and no warning anywhere. (This cost a full UAT
# cycle on 2026-07-21: a coordinate fix was rebuilt, installed, verified byte-for-byte
# inside the container — and the browser still ran the old code.)
# So re-derive the .gz from the mounted file on EVERY run. Cheap (~2 s) and idempotent.
# Verify by hand with:
#   curl -sH 'Accept-Encoding: gzip' http://localhost/<ver>/sdkjs/word/sdk-all.js \
#     | gunzip | sha256sum      # must equal the host dist sha256
SDKJS_WORD_DIR="/var/www/onlyoffice/documentserver/sdkjs/word"
if docker exec -u root "${CONTAINER_NAME}" sh -c '
      D="'"${SDKJS_WORD_DIR}"'"
      [ -f "$D/sdk-all.js" ] || exit 1
      # Nothing to do when no .gz shadows the file (e.g. a future image without one).
      [ -f "$D/sdk-all.js.gz" ] || exit 0
      # Already in sync? compare the .gz payload against the live file.
      if gunzip -c "$D/sdk-all.js.gz" 2>/dev/null | cmp -s - "$D/sdk-all.js"; then exit 0; fi
      gzip -9 -c "$D/sdk-all.js" > "$D/sdk-all.js.gz.new" \
        && mv "$D/sdk-all.js.gz.new" "$D/sdk-all.js.gz"
    ' 2>/dev/null; then
  echo "Patched sdk-all.js.gz is in sync with the mounted sdk-all.js."
else
  echo "WARNING: could not refresh sdk-all.js.gz — the browser may still run the OLD SDK."
  echo "  The mount alone is not enough: nginx gzip_static prefers the .gz."
  echo "  Fix by hand: docker exec -u root ${CONTAINER_NAME} sh -c \\"
  echo "    'cd ${SDKJS_WORD_DIR} && gzip -9 -c sdk-all.js > sdk-all.js.gz'"
fi
# Reminder: the SDK is served `immutable` under an UNCHANGED url, so even a correct
# .gz will not reach a browser that already cached it — use a fresh context for UAT.

echo ""
echo "=== Setup Complete ==="
echo ""
echo "Cozy stack setup (required for Scribe testing via Cozy Drive):"
echo ""
echo "  1. Ensure ~/.cozy/cozy.yml has:"
echo "       host: 0.0.0.0"
echo "       office:"
echo "         default:"
echo "           onlyoffice_url: http://localhost"
echo "           onlyoffice_inbox_secret: <secret from: docker exec ${CONTAINER_NAME} python3 -c \"import json; print(json.load(open('/etc/onlyoffice/documentserver/local.json'))['services']['CoAuthoring']['secret']['inbox']['string'])\">"
echo "           onlyoffice_outbox_secret: <same secret>"
echo ""
echo "  2. Start the stack:"
echo "       cozy-stack serve --appdir drive:./build/ --disable-csp"
echo ""
echo "  3. Open http://alice.localhost:8080/ and open a .docx file"
echo ""
echo "Quick test (OO only, no Cozy stack):"
echo "  1. Open http://localhost/example/ in your browser"
echo "  2. Create a new document"
echo "  3. Open DevTools console (F12)"
echo "  4. Look for '[Scribe] Plugin loaded' message"
echo ""
echo "Dev iteration:"
echo "  - Edit files in plugins/onlyoffice-scribe/"
echo "  - Hard refresh browser (Ctrl+Shift+R)"
echo "  - Check console for [Scribe] messages"
echo ""
echo "Useful commands:"
echo "  docker logs ${CONTAINER_NAME}          # View server logs"
echo "  ./scripts/oo-dev-setup.sh             # Restart (re-applies JWT config)"
echo "  docker rm -f ${CONTAINER_NAME}         # Remove container"
echo ""
echo "WARNING: Do NOT use 'docker restart ${CONTAINER_NAME}' directly."
echo "  OO regenerates its JWT config on restart, breaking Cozy Stack auth."
echo "  Always use ./scripts/oo-dev-setup.sh to restart."
