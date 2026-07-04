# syntax=docker/dockerfile:1

# ---- Deps stage: install production dependencies with a clean cache ------
FROM node:20-alpine AS deps

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# ---- Runtime stage: only what the API needs to run ------------------------
FROM node:20-alpine

WORKDIR /app
ENV NODE_ENV=production

COPY --from=deps /app/node_modules ./node_modules
COPY package.json ./
COPY src ./src

# Resume uploads are written here; a compose volume mounts over it for
# persistence. Create it owned by the unprivileged runtime user.
RUN mkdir -p /app/uploads && chown -R node:node /app/uploads

# Run as the unprivileged user that ships with the node image.
USER node

EXPOSE 5000
CMD ["node", "src/index.js"]
