#!/usr/bin/env bash
set -euo pipefail

# Reusable seed script for local users in MongoDB via Docker containers.
# - Reads USER_CREDENTIALS from playwright/.env (username|password;...)
# - Hashes passwords with bcryptjs (salt rounds 12) in backend container
# - Upserts users into auth_db.users in mongodb container

MONGO_CONTAINER="mongodb-prod"
BACKEND_CONTAINER="backend-prod"
MONGO_USER="admin"
MONGO_PASS="admin123"
MONGO_DB="auth_db"
MONGO_AUTH_DB="admin"
ENV_FILE="playwright/.env"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Error: $ENV_FILE not found"
  exit 1
fi

USER_CREDENTIALS_LINE=$(grep -E '^USER_CREDENTIALS=' "$ENV_FILE" || true)
if [[ -z "$USER_CREDENTIALS_LINE" ]]; then
  echo "Error: USER_CREDENTIALS not found in $ENV_FILE"
  exit 1
fi

USER_CREDENTIALS=${USER_CREDENTIALS_LINE#USER_CREDENTIALS=}
IFS=';' read -r -a CREDENTIAL_PAIRS <<< "$USER_CREDENTIALS"

if [[ ${#CREDENTIAL_PAIRS[@]} -ne 10 ]]; then
  echo "Error: expected 10 credentials, found ${#CREDENTIAL_PAIRS[@]}"
  exit 1
fi

DOCS_JSON="["
IDX=0

for pair in "${CREDENTIAL_PAIRS[@]}"; do
  IFS='|' read -r username password <<< "$pair"

  if [[ -z "${username:-}" || -z "${password:-}" ]]; then
    echo "Error: invalid credential pair: $pair"
    exit 1
  fi

  HASH=$(docker exec "$BACKEND_CONTAINER" node -e "const b=require('bcryptjs'); b.hash(process.argv[1],12).then(h=>process.stdout.write(h));" "$password")

  email="${username}@example.com"
  firstName="Seed"
  lastName="User$((IDX + 1))"

  if [[ $IDX -gt 0 ]]; then
    DOCS_JSON+=","
  fi

  DOCS_JSON+="{\"email\":\"${email}\",\"username\":\"${username}\",\"firstName\":\"${firstName}\",\"lastName\":\"${lastName}\",\"authMethod\":\"local\",\"password\":\"${HASH}\",\"role\":\"user\",\"isActive\":true,\"isEmailVerified\":true,\"isActivated\":true}"
  IDX=$((IDX + 1))
done

DOCS_JSON+="]"

docker exec "$MONGO_CONTAINER" mongosh \
  --quiet \
  --username "$MONGO_USER" \
  --password "$MONGO_PASS" \
  --authenticationDatabase "$MONGO_AUTH_DB" \
  "$MONGO_DB" \
  --eval "
    const now = new Date();
    const docs = $DOCS_JSON;
    const usernames = docs.map(d => d.username);
    const emails = docs.map(d => d.email);

    db.users.deleteMany({ username: { \$in: usernames } });
    db.users.deleteMany({ email: { \$in: emails } });

    for (const d of docs) {
      d.createdAt = now;
      d.updatedAt = now;
      db.users.insertOne(d);
    }

    printjson({
      ok: 1,
      message: 'Sample users inserted after cleanup',
      count: docs.length,
      usernames: docs.map(d => d.username)
    });
  "

printf '\nSeed complete. Deleted existing matches and inserted %s users from %s\n' "${#CREDENTIAL_PAIRS[@]}" "$ENV_FILE"
