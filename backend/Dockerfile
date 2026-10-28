FROM node:20-slim

WORKDIR /app

# Install OpenSSL required by Prisma
RUN apt-get update -y && apt-get install -y openssl ca-certificates && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm install --production

COPY . .
RUN npx prisma generate

RUN chmod +x start.sh

EXPOSE 5000
CMD ["./start.sh"]
