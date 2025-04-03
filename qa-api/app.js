import * as questionService from "./services/questionsService.js";
import { cacheMethodCalls } from "./util/cacheUtil.js";
import { createClient } from "npm:redis";
import { serve } from "https://deno.land/std@0.222.1/http/server.ts";

const publisherClient = createClient({
  socket: {
    host: 'redis-service.qa.svc.cluster.local',
    port: 6379,
  },
  pingInterval: 1000,
});


publisherClient.on('error', (err) => console.error('Redis Client Error', err));
await publisherClient.connect();

console.log("Connected to Redis successfully");

// set cached methods calls and set the cache to flush when one of the methods in the list is called
const cachedQuestionService = cacheMethodCalls(questionService, ["addQuestion", "addAnswer", "upvoteQuestion", "upvoteAnswer"]);

// Handle fetching available courses (main page)
const handleGetCourses = async (request) => {
  const courses = await cachedQuestionService.getAllCourses();
  return new Response(JSON.stringify(courses), { status: 200 });
};

// Handle fetching sinle course (course page)
const handleGetCourse = async (request, { pathname }) => {
  const courseID = pathname.groups.id;
  const course = await cachedQuestionService.getCourseById(courseID);
  return new Response(JSON.stringify(course), { status: 200 });
};

// Handle creating a new question on a course
const handlePostQuestion = async (request) => {
  const requestData = await request.json();
  const courseID = requestData["courseID"];
  const questionText = requestData["question"];
  const userID = requestData["user"];
  
  // Rate limit: only allow one question per user per minute
  const lastQuestionTime = await cachedQuestionService.getLastQuestionTime(userID);
  if (lastQuestionTime && Date.now() - lastQuestionTime < 60000) {
    return new Response(
      JSON.stringify({ error: "Please wait a minute before posting again." }),
      { status: 429 }
    );
  }

  // Add the new question to the database
  const createdAt = new Date();
  const lastUpdated = new Date();

  const newQuestion = {
    courseID,
    questionText,
    userID,
    createdAt: createdAt,
    lastUpdated: lastUpdated,
  };

  const result = await cachedQuestionService.addQuestion(newQuestion);

  if (result && result.id) {
    const resultCopy = JSON.parse(JSON.stringify(result)); // Deep clone
    const resultID = resultCopy.id; // Use resultCopy

    // Publish the question to the course channel
    try {
      const resultChannel = `course_${courseID}`;
      const questionResult = {
        id: resultID,
        course_id: courseID,
        content: questionText,
        user_id: userID,
        created_at: createdAt,
        last_updated: lastUpdated,
        upvote_count: 0
      }
      await publisherClient.publish(
        resultChannel, 
        JSON.stringify(questionResult)
      );
      console.log(`Question of ID ${resultID} published to channel ${resultChannel}`);

    } catch (publishError) {
      console.error("Error publishing to Redis:", publishError.message || publishError);
    }

    // Immediately respond to the user that the question was created successfully
    const userResponse = new Response(JSON.stringify(result), { status: 201 });
    
    // Asynchronously handle LLM answer generation and publishing to Redis
    (async () => {
      try {
        // Array to hold the generated answers
        const generatedAnswers = [];

        const llmUrl = "http://llm-api-service.qa.svc.cluster.local:7000/"
        
        // Call the LLM API three times to get three answers
        for (let i = 0; i < 3; i++) {
          const llmResponse = await fetch(llmUrl, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ question: questionText }),
          });


          if (llmResponse.ok) {
            const answer = await llmResponse.json(); 
            
            let generatedText = answer[0].generated_text;
            
            try {
              const createdAt = new Date();
              const lastUpdated = new Date();
              
              // Add the new LLM answer to the database
              const newAnswer = {
                questionID: resultID,
                answerText: generatedText,
                userID: 'LLM',
                createdAt: createdAt,
                lastUpdated: lastUpdated,
                isLLMGenerated: true
              };

              const answerResult = await cachedQuestionService.addAnswer(newAnswer);

              const resultCopy = JSON.parse(JSON.stringify(answerResult)); // Deep clone
              const answerID = resultCopy.id; // Use resultCopy

              // Publish generated answer to a Redis channel for further processing
              const resultChannel = `question_${resultID}`;
              const resultAnswer = {
                id: answerID,
                question_id: resultID,
                content: generatedText,
                user_id: 'LLM',
                created_at: createdAt,
                last_updated: lastUpdated,
                is_llm_generated: true,
                upvote_count: 0
              }
              await publisherClient.publish(resultChannel, JSON.stringify(resultAnswer));
              console.log(`Answer of ID ${answerID} published to channel ${resultChannel}`);
    
            } catch (error) {
              console.error(error)
            }
            
            // Push the cleaned answer into the array
            generatedAnswers.push(generatedText); 
            
          } else {
            console.error(`Failed to generate LLM answer for question ${result.id}`);
          }
        }
  
      } catch (error) {
        console.error(`Error while calling LLM API or publishing to Redis: ${error}`);
      }
    })();

    // Return the response to the user without waiting for the LLM generation
    return userResponse;
  } else {
    return new Response("Failed to create question.", { status: 500 });
  }
};


// Handle fetching questions for a specific course (with sorting & pagination)
const handleGetQuestions = async (request) => {
  const url = new URL(request.url);
  const courseID = url.searchParams.get("courseID");
  const page = parseInt(url.searchParams.get("page")) || 1;
  const limit = parseInt(url.searchParams.get("limit")) || 20;

  const questions = await cachedQuestionService.getQuestions(courseID, page, limit);
  return new Response(JSON.stringify(questions), { status: 200 });
};


// Handle fetching a single question with its answers (question page)
const handleGetQuestionDetails = async (request, { pathname }) => {
  const questionID = pathname.groups.id;
  
  // Extract pagination parameters from query params
  const url = new URL(request.url);
  const page = parseInt(url.searchParams.get("page")) || 1;
  const limit = parseInt(url.searchParams.get("limit")) || 10; // Set a default limit

  const question = await cachedQuestionService.getQuestionById(questionID);
  const answers = await cachedQuestionService.getAnswersByQuestionId(questionID, page, limit); // Pass pagination parameters

  if (question) {
    return new Response(JSON.stringify({ question, answers }), { status: 200 });
  } else {
    return new Response("Question not found", { status: 404 });
  }
};


// Handle posting a new answer to a question
const handlePostAnswer = async (request) => {
  const requestData = await request.json();
  const questionID = requestData["questionID"];
  const answerText = requestData["answer"];
  const userID = requestData["user"];

  // Rate limit: only allow one answer per user per minute
  const lastAnswerTime = await cachedQuestionService.getLastAnswerTime(userID);
  if (lastAnswerTime && Date.now() - lastAnswerTime < 60000) {
    return new Response(
      JSON.stringify({ error: "Please wait a minute before posting again." }),
      { status: 429 }
    );
  }

  const createdAt = new Date();
  const lastUpdated = new Date();
  // Add the new answer to the database
  const newAnswer = {
    questionID,
    answerText,
    userID,
    createdAt: createdAt,
    lastUpdated: lastUpdated,
    isLLMGenerated: false
  };

  const result = await cachedQuestionService.addAnswer(newAnswer);
  
  if (result && result.id) {
    const resultCopy = JSON.parse(JSON.stringify(result)); // Deep clone
    const resultID = resultCopy.id; // Use resultCopy
    
    // Publish the answer to the question channel
    try {
      const resultChannel = `question_${questionID}`;
      const answerResult = {
        id: resultID,
        question_id: questionID,
        content: answerText,
        user_id: userID,
        created_at: createdAt,
        last_updated: lastUpdated,
        is_llm_generated: false,
        upvote_count: 0
      }
      const publishResult = await publisherClient.publish(
        resultChannel, 
        JSON.stringify(answerResult)
      );
      console.log(`Answer of ID ${resultID} published to channel ${resultChannel}`);

    } catch (publishError) {
      console.error("Error publishing to Redis:", publishError.message || publishError);
    }

    return new Response(JSON.stringify(result), { status: 201 })
  } else {
    return  new Response("Failed to create answer.", { status: 500 });
  }
};

// Handle upvoting a question
const handleUpvoteQuestion = async (request, { pathname }) => {
  const questionID = pathname.groups.id;
  const { user } = await request.json(); // Extract user token

  // Check if the user has already upvoted the question
  const hasUpvoted = await cachedQuestionService.hasUserUpvotedQuestion(user, questionID);
  if (hasUpvoted) {
    return new Response(JSON.stringify({ error: "You have already upvoted this question." }), { status: 403 });
  }

  // Increment the upvote count
  const upvoteResult = await cachedQuestionService.upvoteQuestion(user, questionID);

  return new Response(JSON.stringify(upvoteResult), { status: 200 });
};

// Handle upvoting an answer
const handleUpvoteAnswer = async (request, { pathname }) => {
  const answerID = pathname.groups.id;
  const { user } = await request.json(); // Extract user token

  // Check if the user has already upvoted the answer
  const hasUpvoted = await cachedQuestionService.hasUserUpvotedAnswer(user, answerID);
  if (hasUpvoted) {
    return new Response(JSON.stringify({ error: "You have already upvoted this answer." }), { status: 403 });
  }

  // Increment the upvote count
  const upvoteResult = await cachedQuestionService.upvoteAnswer(user, answerID);

  return new Response(JSON.stringify(upvoteResult), { status: 200 });
};

// URL mappings
const urlMapping = [
  { method: "GET", pattern: new URLPattern({ pathname: "/courses" }), fn: handleGetCourses },
  { method: "GET", pattern: new URLPattern({ pathname: "/courses/:id" }), fn: handleGetCourse },
  { method: "POST", pattern: new URLPattern({ pathname: "/question" }), fn: handlePostQuestion },
  { method: "GET", pattern: new URLPattern({ pathname: "/questions" }), fn: handleGetQuestions },
  { method: "GET", pattern: new URLPattern({ pathname: "/question/:id" }), fn: handleGetQuestionDetails },
  { method: "POST", pattern: new URLPattern({ pathname: "/answer" }), fn: handlePostAnswer },
  { method: "POST", pattern: new URLPattern({ pathname: "/question/upvote/:id" }), fn: handleUpvoteQuestion },
  { method: "POST", pattern: new URLPattern({ pathname: "/answer/upvote/:id" }), fn: handleUpvoteAnswer },
];

// Main request handler
const handleRequest = async (request) => {
  const mapping = urlMapping.find(
    (um) => um.method === request.method && um.pattern.test(request.url)
  );

  if (!mapping) {
    return new Response("Not found", { status: 404 });
  }

  const mappingResult = mapping.pattern.exec(request.url);
  try {
    return await mapping.fn(request, mappingResult);
  } catch (e) {
    return new Response(e.stack, { status: 500 });
  }
};

// Start the server
serve(handleRequest, { port: 7777, hostname: "0.0.0.0" });