# syntax=docker/dockerfile:1
FROM node:20-alpine

WORKDIR /app
ENV NODE_ENV=production

# Install production dependencies first so Docker layer caching kicks in
# when only source code changes.
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY src ./src

# Resume uploads are written here; a compose volume mounts over it for
# persistence. Create it owned by the unprivileged runtime user.
RUN mkdir -p /app/uploads && chown -R node:node /app/uploads

# Run as the unprivileged user that ships with the node image.
USER node

EXPOSE 5000
CMD ["node", "src/index.js"]
