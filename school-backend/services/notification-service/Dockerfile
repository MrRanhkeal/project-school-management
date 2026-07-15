FROM node:20-alpine
RUN apk add --no-cache dumb-init
WORKDIR /app
COPY shared ./shared
COPY services/notification-service ./services/notification-service
WORKDIR /app/shared
RUN npm install --omit=dev
WORKDIR /app/services/notification-service
RUN npm install --omit=dev && npm cache clean --force
ENV NODE_ENV=production
EXPOSE 4005
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
    CMD node -e "require('http').get('http://localhost:'+(process.env.PORT||4005)+'/health',r=>process.exit(r.statusCode===200?0:1)).on('error',()=>process.exit(1))"
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "src/index.js"]
