FROM node:20-alpine
RUN apk add --no-cache openssl
WORKDIR /app/backend
COPY package.json package-lock.json* ./
# Prisma Client generate için schema install aşamasında da mevcut olsun
COPY prisma ./prisma
RUN npm ci
COPY . .
# Schema değişikliklerinde cache yüzünden eski prisma client kalmasın. Prisma's
# canonical generator replaces the client directory; remove the npm-ci copy in
# this image layer so overlayfs does not report EXDEV during the replacement.
RUN rm -rf node_modules/.prisma/client
RUN npm run prisma:generate
EXPOSE 3000
CMD ["node", "src/server.js"]
