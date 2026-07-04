# syntax=docker/dockerfile:1
FROM node:20-alpine

WORKDIR /app
ENV NODE_ENV=production

# Install production dependencies first so Docker layer caching kicks in
# when only source code changes.
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY src ./src

# Run as the unprivileged user that ships with the node image.
USER node

EXPOSE 5000
CMD ["node", "src/index.js"]
