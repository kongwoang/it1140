FROM node:24-alpine AS build
WORKDIR /app
COPY commerce/package*.json ./commerce/
RUN npm ci --prefix commerce --omit=dev --ignore-scripts --no-audit --no-fund
COPY commerce/vm ./commerce/vm
COPY commerce/public ./commerce/public
COPY commerce/payments.mjs ./commerce/payments.mjs
COPY assets ./assets
COPY index.html ./index.html
RUN node commerce/vm/build.mjs

FROM node:24-alpine
ENV NODE_ENV=production HOST=0.0.0.0 PORT=4180
WORKDIR /app
COPY --from=build --chown=node:node /app /app
USER node
EXPOSE 4180
CMD ["node","commerce/vm/server.mjs"]
