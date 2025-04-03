# Use an official Deno image as the base
FROM denoland/deno:latest

# Set the working directory
WORKDIR /app

# Copy the Deno source code
COPY . .

# Expose the WebSocket port
EXPOSE 7788

# Run the WebSocket server
CMD [ "run", "--allow-net", "--allow-env", "app.js" ]
