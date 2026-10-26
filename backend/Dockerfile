# Debian-based image: bcrypt ships prebuilt glibc binaries, no toolchain needed.
FROM node:20-slim
WORKDIR /app
COPY package*.json ./
RUN npm install --omit=dev
COPY src ./src
ENV NODE_ENV=production
EXPOSE 4000
# Apply pending migrations, then start the API.
CMD ["sh", "-c", "node src/db/migrate.js && node src/server.js"]
