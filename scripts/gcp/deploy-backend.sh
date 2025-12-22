#!/usr/bin/env bash

set -euo pipefail

PROJECT_ID="${PROJECT_ID:-$(gcloud config get-value project 2>/dev/null)}"
REGION="${REGION:-us-central1}"
AR_REPO="${AR_REPO:-txai-support}"
IMAGE_NAME="${IMAGE_NAME:-txai-backend}"
SERVICE_NAME="${SERVICE_NAME:-txai-backend}"
SERVICE_ACCOUNT="${SERVICE_ACCOUNT:-}"
CORS_ORIGINS="${CORS_ORIGINS:-}"
FIREBASE_PROJECT_ID="${FIREBASE_PROJECT_ID:-}"
TIMEOUT_SECONDS="${TIMEOUT_SECONDS:-300}"
MAX_INSTANCES="${MAX_INSTANCES:-}"

IMAGE_URI="${REGION}-docker.pkg.dev/${PROJECT_ID}/${AR_REPO}/${IMAGE_NAME}:latest"

echo "==> Build/push: ${IMAGE_URI}"
gcloud builds submit --tag "${IMAGE_URI}" ./backend

echo "==> Update Cloud Run image: ${SERVICE_NAME}"
CMD=(gcloud run services update "${SERVICE_NAME}"
  --image "${IMAGE_URI}"
  --region "${REGION}"
  --timeout "${TIMEOUT_SECONDS}")

if [ -n "${MAX_INSTANCES}" ]; then
  CMD+=(--max-instances "${MAX_INSTANCES}")
fi

if [ -n "${SERVICE_ACCOUNT}" ]; then
  CMD+=(--service-account "${SERVICE_ACCOUNT}")
fi

# Env var precedence for CORS:
# 1) CORS_ORIGINS (explicit input from caller/pipeline)
# 2) FIREBASE_PROJECT_ID (derive Firebase Hosting URLs)
# 3) (no change)
cors_to_set=""
if [ -n "${CORS_ORIGINS}" ]; then
  cors_to_set="${CORS_ORIGINS}"
elif [ -n "${FIREBASE_PROJECT_ID}" ]; then
  cors_to_set="https://${FIREBASE_PROJECT_ID}.web.app,https://${FIREBASE_PROJECT_ID}.firebaseapp.com"
fi

if [ -n "${cors_to_set}" ]; then
  echo "==> Updating CORS_ORIGINS: ${cors_to_set}"
  # IMPORTANT:
  # - Use update-env-vars so we do NOT replace other env vars (e.g. DATABASE_URL).
  # - Use a custom delimiter (;) so commas inside the value are safe.
  CMD+=(--update-env-vars="^;^CORS_ORIGINS=${cors_to_set}")
else
  echo "==> Not updating CORS_ORIGINS (no CORS_ORIGINS or FIREBASE_PROJECT_ID provided)."
fi

"${CMD[@]}"

echo "==> Configure additional env vars with:"
echo "gcloud run services update ${SERVICE_NAME} --region ${REGION} --update-env-vars KEY=VALUE"
