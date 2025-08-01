## Set global build ENV
ARG NODEJS_VERSION="18"

FROM mcr.microsoft.com/playwright:v1.54.1 AS base

# 使用 root用户安装
USER root

ENV NODE_ENV=production

# 开启 pnpm
RUN corepack enable && corepack prepare pnpm@10.10.0 --activate


########################
# 构建阶段
########################
FROM base AS builder
# 可用 tag 查询：https://hub.docker.com/_/microsoft-playwright

# Genspark Account
ENV GENSPARK_EMAIL="email" \
    GENSPARK_PASSWORD="pasword"

# Node
ENV NODE_OPTIONS="--max-old-space-size=4096"

WORKDIR /app

# 拷贝并安装依赖（含 playwright）
COPY package.json pnpm-lock.yaml ./

# 使用构建缓存挂载 pnpm store
# RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
#     pnpm install --frozen-lockfile --store-dir=/pnpm/store
RUN pnpm install

# 拷贝源代码
COPY . .

# 构建 Next.js
RUN pnpm build:docker

########################
# 运行阶段（仍保留浏览器）
########################
FROM base AS runner


ENV NODE_ENV="production" \
    NODE_OPTIONS="--dns-result-order=ipv4first --use-openssl-ca" \
    NODE_EXTRA_CA_CERTS="" \
    NODE_TLS_REJECT_UNAUTHORIZED="" \
    SSL_CERT_DIR="/etc/ssl/certs/ca-certificates.crt"

# set hostname to localhost
ENV HOSTNAME="0.0.0.0" \
    PORT="3456"

# General Variables
ENV APP_URL="" \
    TRYON_UPLOAD_DIR="/tmp/tryon_upload"

# Genspark Account
ENV GENSPARK_EMAIL="" \
    GENSPARK_PASSWORD=""

# Database
ENV KEY_VAULTS_SECRET="" \
    DATABASE_DRIVER="node" \
    DATABASE_URL=""

WORKDIR /app
ARG USE_CN_MIRROR

RUN if [ "${USE_CN_MIRROR:-false}" = "true" ]; then \
      npm config set registry "https://registry.npmmirror.com"; \
      echo 'canvas_binary_host_mirror=https://npmmirror.com/mirrors/canvas' >> .npmrc; \
    fi \
    && corepack enable && corepack prepare pnpm@10.10.0 --activate

# Automatically leverage output traces to reduce image size
# https://nextjs.org/docs/advanced-features/output-file-tracing
COPY --from=builder /app/.next/standalone /app/

# 安装仅生产依赖（含 playwright）
# RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
#     pnpm install --prod --store-dir=/pnpm/store
RUN pnpm install --prod

# RUN \
#     # Add nextjs:nodejs to run the app
#     addgroup -S -g 1001 nodejs \
#     && adduser -D -G nodejs -H -S -h /app -u 1001 nextjs \
#     # Set permission for nextjs:nodejs
#     && chown -R nextjs:nodejs /app

# USER nextjs

EXPOSE 3456/tcp

ENTRYPOINT ["/bin/node"]

CMD ["/app/server.js"]
