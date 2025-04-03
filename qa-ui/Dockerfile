# Stage 1: Build the app
FROM node:lts AS build

WORKDIR /app

# Install dependencies
COPY package.json package-lock.json ./
RUN npm install

# Copy the app files and build the app
COPY . .
RUN npm run build

# Stage 2: Serve the app with Node.js
FROM node:lts AS server

WORKDIR /app

# Copy the built app from the build stage
COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package*.json ./

# Install qa dependencies
RUN npm install --omit=dev

# Set environment variables for Node.js
ENV HOST=0.0.0.0
ENV PORT=3000
EXPOSE 3000

# Start the Node.js server
CMD ["node", "./dist/server/entry.mjs"]