# ARM-friendly Node image
FROM node:18-bullseye

WORKDIR /app

# Copy package files first (for layer caching)
COPY package*.json ./

# Install only production dependencies
RUN npm ci --omit=dev

# Copy compiled JS from dist/
COPY dist ./dist

# Set environment to production
ENV NODE_ENV=production

# Run the bot
CMD ["node", "dist/bot.js"]