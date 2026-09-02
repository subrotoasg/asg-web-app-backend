#!/usr/bin/env bash

set -Eeuo pipefail
umask 027

readonly APP_DIR="/var/www/asg-web-app-backend"
readonly DEPLOY_BRANCH="main"
readonly DEPLOY_MARKER="/etc/asg-web-app-backend/deploy-enabled"
readonly LOCK_FILE="/var/lock/asg-web-app-backend-deploy.lock"
readonly HEALTH_URL="http://127.0.0.1:3000/health"

log() {
  printf '[%s] %s\n' "$(date -u +'%Y-%m-%dT%H:%M:%SZ')" "$*"
}

fail() {
  log "ERROR: $*"
  exit 1
}

[[ "${EUID}" -eq 0 ]] || fail "deploy.sh must run as root"
[[ -f "${DEPLOY_MARKER}" ]] || fail \
  "deployment is disabled; create ${DEPLOY_MARKER} only when this server is ready"

for command_name in git node npm npx pm2 curl flock; do
  command -v "${command_name}" >/dev/null 2>&1 || fail \
    "required command is missing: ${command_name}"
done

exec 9>"${LOCK_FILE}"
flock -n 9 || fail "another deployment is already running"

cd "${APP_DIR}"

[[ -f .env ]] || fail "${APP_DIR}/.env is missing"
[[ "$(stat -c '%a' .env)" == "600" ]] || fail ".env must have mode 600"
[[ "$(git branch --show-current)" == "${DEPLOY_BRANCH}" ]] || fail \
  "the checked-out branch must be ${DEPLOY_BRANCH}"

if [[ -n "$(git status --porcelain --untracked-files=no)" ]]; then
  fail "tracked server-side changes exist; commit or remove them before deploying"
fi

log "fetching origin/${DEPLOY_BRANCH}"
git fetch --prune origin "${DEPLOY_BRANCH}"
git merge --ff-only "origin/${DEPLOY_BRANCH}"

log "installing locked dependencies"
npm ci

log "generating Prisma Client"
npx prisma generate

log "applying committed Prisma migrations"
npx prisma migrate deploy

log "starting or reloading PM2 processes"
pm2 startOrReload ecosystem.config.cjs --env production --update-env

log "waiting for API health check"
healthy=0
for attempt in $(seq 1 30); do
  if curl --fail --silent --show-error --max-time 5 "${HEALTH_URL}" >/dev/null; then
    healthy=1
    break
  fi
  sleep 2
done

if [[ "${healthy}" -ne 1 ]]; then
  pm2 status || true
  pm2 logs webapp-backend --lines 80 --nostream || true
  fail "health check failed: ${HEALTH_URL}"
fi

pm2 save --force

log "deployment completed at commit $(git rev-parse --short HEAD)"
