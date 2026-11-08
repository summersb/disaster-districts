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
# Settings come from the environment, or else from this repo's local .env:
#
# DEPLOY_HOST            ssh target for the droplet, e.g. root@203.0.113.10 (required)
# DEPLOY_DIR             folder on the droplet (default: /opt/dd)
# IMAGE_REGISTRY         registry to push through, e.g. registry.digitalocean.com/<registry>;
#                        the images go to $IMAGE_REGISTRY/dd-backend and $IMAGE_REGISTRY/dd-web.
#                        Leave it unset to copy the images over SSH instead.
# VITE_GOOGLE_CLIENT_ID  built into the frontend; empty hides Google sign-in.
#
# The droplet keeps its own settings in $DEPLOY_DIR/.env (see .env.example);
# this script only records the deployed images there.
#
# A value given on the command line wins over .env, e.g.
# DEPLOY_HOST=root@other deploy/deploy.sh
set -eu
cd "$(dirname "$0")/.."

# Reads KEY=value from .env unless KEY is already set. Only these keys; nothing in .env is executed.
from_env_file() {
  eval "current=\${$1:-}"
  [ -n "$current" ] || [ ! -f .env ] && return 0
  value=$(sed -n "s/^[[:space:]]*\(export[[:space:]]\{1,\}\)\{0,1\}$1=//p" .env | tail -n 1 | sed 's/[[:space:]]*$//; s/^"\(.*\)"$/\1/; s/^'"'"'\(.*\)'"'"'$/\1/')
  [ -n "$value" ] && export "$1=$value"
  return 0
}
for key in DEPLOY_HOST DEPLOY_DIR IMAGE_REGISTRY VITE_GOOGLE_CLIENT_ID; do from_env_file "$key"; done

: "${DEPLOY_HOST:?set DEPLOY_HOST in .env or the environment, e.g. root@203.0.113.10}"
dir=${DEPLOY_DIR:-/opt/dd}
tag=$(git rev-parse --short HEAD)
git diff --quiet HEAD || tag="$tag-dirty-$(date +%Y%m%d%H%M%S)"
prefix=${IMAGE_REGISTRY:+${IMAGE_REGISTRY%/}/}
backend_image="${prefix}dd-backend:$tag"
web_image="${prefix}dd-web:$tag"

# Authenticate once, up front, and reuse that connection for every ssh/scp below.
ctl_dir=$(mktemp -d)
ssh_opts="-o ControlMaster=auto -o ControlPath=$ctl_dir/ssh -o ControlPersist=yes"
trap 'ssh -o ControlPath="$ctl_dir/ssh" -O exit "$DEPLOY_HOST" 2>/dev/null; rm -rf "$ctl_dir"' EXIT
trap 'exit 130' INT TERM
echo "Connecting to $DEPLOY_HOST"
# shellcheck disable=SC2086
ssh $ssh_opts -fN "$DEPLOY_HOST"

# Fail before building if the droplet hasn't been set up yet.
# shellcheck disable=SC2086
if ! ssh $ssh_opts "$DEPLOY_HOST" "test -f '$dir/.env'"; then
  echo "No .env on the droplet. Copy .env.example there as $dir/.env, fill it in, and run this again." >&2
  exit 1
fi

echo "Building $backend_image"
docker build --platform linux/amd64 -f backend/Dockerfile.prod -t "$backend_image" backend
echo "Building $web_image"
docker build --platform linux/amd64 -f frontend/Dockerfile.prod \
  --build-arg VITE_GOOGLE_CLIENT_ID="${VITE_GOOGLE_CLIENT_ID:-}" \
  -t "$web_image" .

if [ -n "${IMAGE_REGISTRY:-}" ]; then
  echo "Pushing to $IMAGE_REGISTRY"
  case "$IMAGE_REGISTRY" in
    registry.digitalocean.com/*) if command -v doctl >/dev/null; then doctl registry login --expiry-seconds 3600; fi ;;
  esac
  docker push "$backend_image"
  docker push "$web_image"
else
  echo "Copying images to $DEPLOY_HOST"
  # shellcheck disable=SC2086
  docker save "$backend_image" "$web_image" | gzip | ssh $ssh_opts "$DEPLOY_HOST" 'gunzip | docker load'
fi

echo "Updating $DEPLOY_HOST:$dir"
# The web service joins the "edge" network that the edge proxy routes from.
# Create it if the proxy hasn't been deployed yet, so this works in either
# order; the site is reachable once the proxy runs.
# shellcheck disable=SC2086
ssh $ssh_opts "$DEPLOY_HOST" "set -e
if ! docker network inspect edge >/dev/null 2>&1; then
  docker network create edge >/dev/null
  echo 'Created the edge network. Deploy the edge proxy (~/projects/edge-proxy: ./deploy.sh) to make the site reachable.' >&2
fi"
# shellcheck disable=SC2086
scp -q $ssh_opts docker-compose.prod.yml "$DEPLOY_HOST:$dir/docker-compose.yml"

# Record the images in the droplet's .env, so a plain "docker compose up -d"
# there keeps running this version, then start it. Older dd images are removed
# (the ones still in use are skipped); only their own small layers are freed.
# shellcheck disable=SC2086
ssh $ssh_opts "$DEPLOY_HOST" "set -e
cd '$dir'
sed -i '/^[[:space:]]*\(export[[:space:]]\{1,\}\)\{0,1\}\(BACKEND_IMAGE\|WEB_IMAGE\)=/d' .env
[ -z \"\$(tail -c 1 .env)\" ] || echo >> .env
printf '%s\n' 'BACKEND_IMAGE=$backend_image' 'WEB_IMAGE=$web_image' >> .env
docker compose up -d --remove-orphans
docker images --format '{{.Repository}}:{{.Tag}}' \
  | grep -E '(^|/)dd-(backend|web):' \
  | grep -v -x -e '$backend_image' -e '$web_image' \
  | xargs -r docker rmi >/dev/null 2>&1 || true
docker image prune -f >/dev/null
docker compose ps"

echo "Deployed $tag: https://dd.lazys.net"
