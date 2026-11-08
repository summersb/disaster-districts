#!/usr/bin/env sh
# Builds the production images (dd-backend, dd-web) on this machine and runs
# them on the droplet. The droplet never builds.
#
#   deploy/deploy.sh
#
# HTTPS comes from the shared edge proxy (~/projects/edge-proxy), deployed
# separately; it routes dd.lazys.net to the "web" service over the "edge"
# network.
#
# Settings come from the environment, or else from .env.production (copy
# .env.production.example). The whole of .env.production also becomes the
# droplet's .env (readable by root only), plus the image names deployed.
#
# DEPLOY_HOST    ssh target for the droplet, e.g. root@203.0.113.10 (required)
# DEPLOY_DIR     folder on the droplet (default: /opt/dd)
# DOCR_REGISTRY  registry to push through, e.g. registry.digitalocean.com/<registry>.
#                Leave it unset to copy the images over SSH instead.
#
# A value given on the command line wins over .env.production, e.g.
# DEPLOY_HOST=root@other deploy/deploy.sh
set -eu
cd "$(dirname "$0")/.."

ENV_FILE=${ENV_FILE:-.env.production}
[ -f "$ENV_FILE" ] || { echo "missing $ENV_FILE (copy .env.production.example)" >&2; exit 1; }

# Reads KEY=value from $ENV_FILE unless KEY is already set. Only these keys; nothing in it is executed.
from_env_file() {
  eval "current=\${$1:-}"
  [ -n "$current" ] && return 0
  value=$(sed -n "s/^[[:space:]]*\(export[[:space:]]\{1,\}\)\{0,1\}$1=//p" "$ENV_FILE" | tail -n 1 | sed 's/[[:space:]]*$//; s/^"\(.*\)"$/\1/; s/^'"'"'\(.*\)'"'"'$/\1/')
  [ -n "$value" ] && export "$1=$value"
  return 0
}
for key in DEPLOY_HOST DEPLOY_DIR DOCR_REGISTRY; do from_env_file "$key"; done

: "${DEPLOY_HOST:?set DEPLOY_HOST in $ENV_FILE or the environment, e.g. root@203.0.113.10}"
dir=${DEPLOY_DIR:-/opt/dd}
tag=$(git rev-parse --short HEAD)
git diff --quiet HEAD || tag="$tag-dirty-$(date +%Y%m%d%H%M%S)"
prefix=${DOCR_REGISTRY:+$DOCR_REGISTRY/}
BACKEND_IMAGE="${prefix}dd-backend:$tag"
WEB_IMAGE="${prefix}dd-web:$tag"
export BACKEND_IMAGE WEB_IMAGE

# Authenticate once, up front, and reuse that connection for every ssh/scp below.
ctl_dir=$(mktemp -d)
ssh_opts="-o ControlMaster=auto -o ControlPath=$ctl_dir/ssh -o ControlPersist=yes"
trap 'ssh -o ControlPath="$ctl_dir/ssh" -O exit "$DEPLOY_HOST" 2>/dev/null; rm -rf "$ctl_dir"' EXIT
trap 'exit 130' INT TERM
echo "Connecting to $DEPLOY_HOST"
# shellcheck disable=SC2086
ssh $ssh_opts -fN "$DEPLOY_HOST"

echo "Building $BACKEND_IMAGE and $WEB_IMAGE"
docker compose -f docker-compose.prod.yml -f docker-compose.build.yml --env-file "$ENV_FILE" build backend web

if [ -n "${DOCR_REGISTRY:-}" ]; then
  echo "Pushing to $DOCR_REGISTRY"
  case "$DOCR_REGISTRY" in
    registry.digitalocean.com/*) command -v doctl >/dev/null && doctl registry login --expiry-seconds 3600 ;;
  esac
  docker push "$BACKEND_IMAGE"
  docker push "$WEB_IMAGE"
else
  echo "Copying images to $DEPLOY_HOST"
  # shellcheck disable=SC2086
  docker save "$BACKEND_IMAGE" "$WEB_IMAGE" | gzip | ssh $ssh_opts "$DEPLOY_HOST" 'gunzip | docker load'
fi

echo "Updating $DEPLOY_HOST:$dir"
# The web service joins the "edge" network that the edge proxy routes from.
# Create it if the proxy hasn't been deployed yet, so this works in either
# order; the site is reachable once the proxy runs.
# shellcheck disable=SC2086
ssh $ssh_opts "$DEPLOY_HOST" "set -e
mkdir -p '$dir'
if ! docker network inspect edge >/dev/null 2>&1; then
  docker network create edge >/dev/null
  echo 'Created the edge network. Deploy the edge proxy (~/projects/edge-proxy: ./deploy.sh) to make the site reachable.' >&2
fi"
# shellcheck disable=SC2086
scp -q $ssh_opts docker-compose.prod.yml "$DEPLOY_HOST:$dir/docker-compose.yml"
# Settings, plus the images being deployed, so a plain "docker compose up -d"
# on the droplet keeps running this version.
# shellcheck disable=SC2086
{ grep -v -E '^[[:space:]]*(export[[:space:]]+)?(BACKEND_IMAGE|WEB_IMAGE|IMAGE_TAG)=' "$ENV_FILE"; echo; echo "BACKEND_IMAGE=$BACKEND_IMAGE"; echo "WEB_IMAGE=$WEB_IMAGE"; } \
  | ssh $ssh_opts "$DEPLOY_HOST" "umask 077; cat > '$dir/.env'"

# shellcheck disable=SC2086
ssh $ssh_opts "$DEPLOY_HOST" "set -e
cd '$dir'
docker compose up -d --remove-orphans
docker image prune -f >/dev/null
docker compose ps"

echo "Deployed $tag: https://dd.lazys.net"
