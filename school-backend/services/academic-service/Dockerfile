FROM node:20-alpine

# dumb-init for correct PID 1 signal handling -> graceful shutdown
RUN apk add --no-cache dumb-init

WORKDIR /app

# Copy shared lib first (better layer caching)
COPY shared ./shared
COPY services/academic-service ./services/academic-service

WORKDIR /app/shared
RUN npm install --omit=dev
WORKDIR /app/services/academic-service
RUN npm install --omit=dev && npm cache clean --force

ENV NODE_ENV=production
EXPOSE 4002

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
    CMD node -e "require('http').get('http://localhost:'+(process.env.PORT||4002)+'/health',r=>process.exit(r.statusCode===200?0:1)).on('error',()=>process.exit(1))"

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "src/index.js"]