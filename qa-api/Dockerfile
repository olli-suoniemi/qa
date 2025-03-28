# Use Deno official image
FROM denoland/deno:latest

# Expose the API port
EXPOSE 7777

# Set working directory
WORKDIR /app

# Copy the dependencies file (for caching layers)
COPY deps.js .

# Cache dependencies, so we don’t re-download them on every build
RUN deno cache deps.js

# Copy the rest of the application files
COPY . .

# Start the application
CMD ["run", "--unstable", "--allow-net", "--allow-env", "app.js"]