# Build stage
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY packages/ui/package*.json ./packages/ui/

# Install dependencies
RUN npm install

# Copy source code
COPY packages/ui ./packages/ui

# Build Next.js app
WORKDIR /app/packages/ui
RUN npm run build

# Production stage
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY packages/ui/package*.json ./packages/ui/

# Install production dependencies
RUN npm install --production

# Copy built files
COPY --from=builder /app/packages/ui/.next ./packages/ui/.next
COPY --from=builder /app/packages/ui/public ./packages/ui/public
COPY packages/ui/next.config.js ./packages/ui/

WORKDIR /app/packages/ui

# Expose port
EXPOSE 3000

# Start the application
CMD ["npm", "start"]
