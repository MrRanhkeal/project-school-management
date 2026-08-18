FROM node:20-alpine
RUN apk add --no-cache dumb-init

WORKDIR /app

# Copy shared lib first (better layer caching)
COPY shared ./shared
COPY services/record-service ./services/record-service

WORKDIR /app/shared
RUN npm install --omit=dev
WORKDIR /app/services/record-service
RUN npm install --omit=dev && npm cache clean --force

ENV NODE_ENV=production
EXPOSE 4003

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
    CMD node -e "require('http').get('http://localhost:'+(process.env.PORT||4003)+'/health',r=>process.exit(r.statusCode===200?0:1)).on('error',()=>process.exit(1))"

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "src/index.js"]