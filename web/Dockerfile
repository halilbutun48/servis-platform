FROM node:20-alpine AS build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

ARG SOURCE_REVISION=unknown
ARG SOURCE_TREE_SHA256=unknown
ARG BUILD_TIMESTAMP=unknown
ENV VITE_PUBLIC_BASE_URL=/
RUN npm run build

FROM nginx:1.27-alpine

ARG SOURCE_REVISION=unknown
ARG SOURCE_TREE_SHA256=unknown
ARG SOURCE_MANIFEST_SHA256=unknown
ARG BUILD_TIMESTAMP=unknown
LABEL org.opencontainers.image.title="SeferPakt frontend" \
      org.opencontainers.image.revision="$SOURCE_REVISION" \
      org.opencontainers.image.source-sha256="$SOURCE_TREE_SHA256" \
      org.opencontainers.image.source-manifest-sha256="$SOURCE_MANIFEST_SHA256" \
      org.opencontainers.image.created="$BUILD_TIMESTAMP"

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=10s --timeout=5s --start-period=10s --retries=12 \
  CMD wget -qO- http://127.0.0.1/health | grep -q '"ok":true' || exit 1
