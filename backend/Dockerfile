FROM node:20-alpine
RUN apk add --no-cache openssl
WORKDIR /app/backend
COPY package.json package-lock.json* ./
# Prisma Client generate için schema install aşamasında da mevcut olsun
COPY prisma ./prisma
RUN npm install
COPY . .
# Schema değişikliklerinde cache yüzünden eski prisma client kalmasın
RUN npx prisma generate
EXPOSE 3000
CMD ["node", "src/server.js"]
