FROM node:20-alpine
# docker-cli: the judge starts sandbox containers through the host's Docker daemon.
RUN apk add --no-cache docker-cli openssl
WORKDIR /app
COPY package*.json ./
COPY prisma/schema.prisma prisma/schema.prisma
RUN npm ci
COPY . .
ENV NODE_ENV=production PORT=3001
EXPOSE 3001
CMD ["sh", "-c", "npx prisma migrate deploy && node index.js"]
