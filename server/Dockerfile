FROM node:18-alpine
WORKDIR /app
# Copy manifest first for cache-friendly installs
COPY package*.json ./
RUN npm ci --production
COPY . .
EXPOSE 5001 1883
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD wget -qO- http://localhost:5001/api/status || exit 1
CMD ["node", "server.js"]
