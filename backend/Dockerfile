FROM node:22-alpine AS dependencies
WORKDIR /app/backend
COPY backend/package*.json ./
RUN npm ci

FROM dependencies AS build
COPY backend ./
RUN npx prisma generate && npm run build

FROM node:22-alpine AS runtime
WORKDIR /app/backend
ENV NODE_ENV=production

COPY backend/package*.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY --from=build /app/backend/dist ./dist
COPY --from=build /app/backend/prisma ./prisma
COPY --from=build /app/backend/node_modules/.prisma ./node_modules/.prisma
COPY --from=build /app/backend/node_modules/@prisma/client ./node_modules/@prisma/client

USER node
EXPOSE 3000
CMD ["node", "dist/src/main.js"]
