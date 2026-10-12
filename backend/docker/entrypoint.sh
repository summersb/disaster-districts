#!/bin/sh
# Starts the API, first making sure it has a key pair to sign login tokens
# with.
#
# The pair is generated here, on the server, the first time the container
# starts - it is never built into the image or kept in the repository. It is
# written to $JWT_KEY_DIR, which should be a volume: as long as the files are
# there, tokens issued before a restart keep working. To sign everyone out and
# rotate the key, delete the two files and restart the container.
set -eu

KEY_DIR="${JWT_KEY_DIR:-/keys}"
PRIVATE_KEY="$KEY_DIR/privateKey.pem"
PUBLIC_KEY="$KEY_DIR/publicKey.pem"

if [ ! -s "$PRIVATE_KEY" ] || [ ! -s "$PUBLIC_KEY" ]; then
    echo "entrypoint: no token signing key in $KEY_DIR - generating one"
    mkdir -p "$KEY_DIR"
    umask 077
    # PKCS#8 private key and its public half, the formats SmallRye JWT reads.
    openssl genpkey -algorithm RSA -pkeyopt rsa_keygen_bits:2048 -out "$PRIVATE_KEY.tmp" 2>/dev/null
    openssl pkey -in "$PRIVATE_KEY.tmp" -pubout -out "$PUBLIC_KEY.tmp" 2>/dev/null
    # Renamed into place only once both exist, so a crash can't leave half a pair.
    mv "$PRIVATE_KEY.tmp" "$PRIVATE_KEY"
    mv "$PUBLIC_KEY.tmp" "$PUBLIC_KEY"
fi

exec java ${JAVA_OPTS:-} -jar /app/quarkus-run.jar
