import { createClient } from "npm:redis"
import { serve } from "https://deno.land/std@0.222.1/http/server.ts";


const redisClient = createClient({
  socket: {
    host: 'redis-service.qa.svc.cluster.local',
    port: 6379,
  },
  pingInterval: 1000,
});


await redisClient.connect();

// Map to track active WebSocket connections by channel
const channelSubscriptions = new Map(); // { channelName: Set of WebSockets }

// Function to handle WebSocket requests
const handleRequest = async (request) => {
  const { socket, response } = Deno.upgradeWebSocket(request);

  const url = new URL(request.url);
  const course = url.searchParams.get("course");
  const question = url.searchParams.get("question");
  let channel = "";

  if (course) {
    channel = `course_${course}`;
  } else if (question) {
    channel = `question_${question}`;
  }

  if (!channel) {
    console.error("Invalid request: No course or question specified");
    socket.close();
    return response;
  }

  console.log("WebSocket connection on", channel);

  // Add the socket to the channel's subscribers set
  if (!channelSubscriptions.has(channel)) {
    channelSubscriptions.set(channel, new Set());
  }
  const subscribers = channelSubscriptions.get(channel);
  subscribers.add(socket);

  // Subscribe to Redis channel if it's the first WebSocket connection
  if (subscribers.size === 1) {
    redisClient.subscribe(channel, (message) => {
      const parsedMessage = JSON.parse(message);
      console.log(`Received message from Redis channel ${channel}. ID: ${parsedMessage.id}.`);

      // Send the message only to the subscribers of this channel
      channelSubscriptions.get(channel).forEach((ws) => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(message);
        }
      });
    });
  }

  // Handle WebSocket close event
  socket.onclose = () => {
    console.log(`WebSocket closed for channel: ${channel}`);
    subscribers.delete(socket);

    // Unsubscribe from Redis if no more subscribers for this channel
    if (subscribers.size === 0) {
      redisClient.unsubscribe(channel);
      channelSubscriptions.delete(channel);
      console.log(`Unsubscribed from Redis channel ${channel}`);
    }
  };

  // Handle WebSocket errors
  socket.onerror = (err) => {
    console.error("WebSocket error:", err);
  };

  return response;
};

// Start the server
serve(handleRequest, { port: 7788, hostname: "0.0.0.0" });