FROM node:20-alpine
# docker-cli: the judge starts sandbox containers through the host's Docker daemon.
RUN apk add --no-cache docker-cli openssl
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npx prisma generate
ENV NODE_ENV=production PORT=3001
EXPOSE 3001
CMD ["sh", "-c", "npx prisma migrate deploy && node index.js"]
