# Custom WPPConnect image built from upstream wppconnect-server repository.
# The upstream ref is resolved by deploy scripts and passed via build arg.
FROM node:22.22.1-alpine AS source

ARG WPPCONNECT_REPO_URL="https://github.com/wppconnect-team/wppconnect-server.git"
ARG WPPCONNECT_REF="main"

WORKDIR /src
RUN apk add --no-cache git
RUN git clone "${WPPCONNECT_REPO_URL}" wppconnect-server
WORKDIR /src/wppconnect-server
RUN git checkout "${WPPCONNECT_REF}"

FROM source AS prep
WORKDIR /src/wppconnect-server
COPY server-entry.ts /tmp/server-entry.ts
RUN cp /tmp/server-entry.ts ./src/server.ts

FROM node:22.22.1-alpine AS build-base
WORKDIR /usr/src/wpp-server
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true

# Build dependencies required by native modules during yarn install/build.
RUN apk add --no-cache \
  vips-dev \
  fftw-dev \
  gcc \
  g++ \
  make \
  libc6-compat \
  pkgconfig \
  python3 \
  libc6-compat

COPY --from=prep /src/wppconnect-server/.yarnrc.yml ./
COPY --from=prep /src/wppconnect-server/package.json ./
COPY --from=prep /src/wppconnect-server/yarn.lock ./

RUN corepack enable && \
  corepack prepare yarn@4.12.0 --activate

RUN yarn install --immutable

FROM build-base AS build
WORKDIR /usr/src/wpp-server
COPY --from=prep /src/wppconnect-server/ ./
RUN yarn build

FROM node:22.22.1-alpine AS runtime
WORKDIR /usr/src/wpp-server
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true

RUN apk add --no-cache \
  chromium \
  vips \
  fftw \
  libc6-compat

COPY --from=build /usr/src/wpp-server/ ./
RUN rm -rf .git

EXPOSE 21465
ENTRYPOINT ["node", "dist/server.js"]
