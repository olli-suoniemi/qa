<script>
  import { onMount, onDestroy } from 'svelte';
  import { userUuid } from '../stores/stores.js'

  export let courseId;

  // const apiDomain = "https://api.localhost";
  // const wsDomain = "wss://ws.localhost/ws";

  const apiDomain = "https://qa.olli.codes/api";
  const wsDomain = "wss://qa.olli.codes/ws";

  let course = null;
  let questions = [];
  let errorMessage = '';
  let loading = true;
  let newQuestion = '';
  let currentPage = 1; // Track the current page
  const limit = 10; // Max questions per page

  // WebSocket connections
  let ws;
  let reconnectInterval = 1000; // Start with 1 second
  let reconnectAttempts = 0;
  let maxReconnectAttempts = 5;
  let manualClose = false; // Track if the WebSocket was closed manually
  
  const setupWebSocket = () => {
    const wsUrl = `${wsDomain}?course=${courseId}`;
    ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      console.log("WebSocket connection opened for course", courseId);
      reconnectInterval = 1000; // Reset the interval on successful connection
      reconnectAttempts = 0; // Reset attempts count
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      questions = [data, ...questions];  // Add the new question to the top
    };

    ws.onclose = () => {
    if (!manualClose && reconnectAttempts < maxReconnectAttempts) {
      console.log("WebSocket connection closed. Attempting to reconnect...");
      reconnectAttempts++;
      setTimeout(() => {
        reconnectWebSocket();
      }, reconnectInterval);
      reconnectInterval = Math.min(reconnectInterval * 2, 30000); // Exponential backoff, max 30 seconds
    } else {
      console.log("WebSocket closed manually or max reconnection attempts reached.");
    }
  };

    ws.onerror = (err) => {
      console.error("WebSocket error:", err);
      ws.close(); // Close on error to trigger reconnect
    };
  };

  const reconnectWebSocket = () => {
    console.log(`Reconnecting websocket... Attempt ${reconnectAttempts}/${maxReconnectAttempts}`);
    setupWebSocket();
  };

  // Function to fetch course details and related questions
  const fetchCourseDetails = async () => {
    try {
      const courseResponse = await fetch(`${apiDomain}/courses/${courseId}`);
      if (!courseResponse.ok) throw new Error('Course not found');

      const courseData = await courseResponse.json();
      course = courseData[0];

      // Fetch questions for the course
      await fetchQuestions(currentPage);
    } catch (error) {
      errorMessage = error.message;
    } finally {
      loading = false;
    }
  };


  // Function to fetch questions with pagination
  const fetchQuestions = async (page) => {
    try {
      const questionsResponse = await fetch(`${apiDomain}/questions?courseID=${courseId}&page=${page}&limit=${limit}`);
      if (!questionsResponse.ok) throw new Error('Failed to fetch questions');

      const fetchedQuestions = await questionsResponse.json();
      questions = [...questions, ...fetchedQuestions]; // Append new questions
    } catch (error) {
      errorMessage = error.message;
    }
  };


  // Function to handle scroll event
  const handleScroll = () => {
    const scrollPosition = window.innerHeight + window.scrollY;
    const bottomPosition = document.documentElement.offsetHeight;

    if (scrollPosition >= bottomPosition - 100) {
      currentPage += 1; // Increase page number
      fetchQuestions(currentPage); // Fetch next set of questions
    }
  };


  // Function to handle question submission
  const submitQuestion = async () => {
    if (!newQuestion.trim()) {
      alert('Please enter a question.');
      return;
    }

    const questionData = {
      courseID: courseId,
      question: newQuestion,
      user: $userUuid 
    };

    try {
      const response = await fetch(`${apiDomain}/question`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(questionData),
      });

      if (!response.ok) {
        const errorResponse = await response.json();
        throw new Error(errorResponse.error || 'Failed to submit question');
      }

      newQuestion = ''; // Reset the question input
      currentPage = 1; // Reset to page 1 to fetch new questions
      questions = []; // Clear existing questions
      await fetchQuestions(currentPage); // Refetch questions
    } catch (error) {
      errorMessage = error.message;
    }
  };


  // Function to handle upvote
  const upvoteQuestion = async (questionID) => {
    try {
      const response = await fetch(`${apiDomain}/question/upvote/${questionID}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ user: $userUuid }),
      });

      if (!response.ok) {
        const errorResponse = await response.json();
        throw new Error(errorResponse.error || 'Failed to upvote question');
      }

      // Find the question that was upvoted and update its upvote count
      const questionIndex = questions.findIndex(q => q.id === questionID);
      if (questionIndex !== -1) {
        // Convert upvote_count to a number and increment it
        questions[questionIndex].upvote_count = Number(questions[questionIndex].upvote_count) + 1;
        
        // Update the last_updated field to the current time
        questions[questionIndex].last_updated = new Date().toISOString();
      }
    } catch (error) {
      errorMessage = error.message; // Set error message if upvote fails
    }
  };


  // Fetch course details and questions on component mount
  onMount(() => {
    setupWebSocket(); 
    fetchCourseDetails();
    window.addEventListener('scroll', handleScroll); // Add scroll event listener
    return () => window.removeEventListener('scroll', handleScroll); // Cleanup
  });


  // Cleanup WebSocket connection on component destroy
  onDestroy(() => {
    if (ws) {
      manualClose = true; // Mark as manually closed to avoid auto-reconnect
      ws.close();
    }
  });


</script>

{#if loading}
  <div class="p-4">
    <h1 class="text-2xl font-bold">Loading...</h1>
  </div>
{:else if errorMessage}
  <div class="p-4">
    <h1 class="text-2xl font-bold">Error</h1>
    <p class="mt-2 text-gray-700">{errorMessage}</p>
    <button 
      on:click={() => errorMessage = ''} 
      class="mt-4 bg-blue-500 text-white rounded px-4 py-2 hover:bg-blue-600">
      Back to Course
    </button>
  </div>
{:else if course}
  <div class="p-4">
    <h1 class="text-2xl font-bold mb-4">{course.name}</h1>
    <p class="text-gray-700">{course.description}</p>

    <h2 class="text-xl font-semibold mt-6">Ask a Question:</h2>
    <div class="mb-4">
      <textarea 
        bind:value={newQuestion} 
        placeholder="Type your question here..." 
        class="border rounded p-2 w-full" 
        rows="3"></textarea>
      <button 
        on:click={submitQuestion} 
        class="mt-2 bg-blue-500 text-white rounded px-4 py-2 hover:bg-blue-600">
        Submit Question
      </button>
    </div>

    <h2 class="text-xl font-semibold mt-6">Questions:</h2>
    {#if questions.length === 0}
      <p>No questions available for this course.</p>
    {:else}
      <ul class="mt-2">
        {#each questions as question}
          <li class="mb-4 border-b pb-2">
            <a href={`/question/${question.id}`} class="font-bold text-blue-500 hover:underline">
              {question.content}
            </a>
            <p class="text-gray-600">Posted by User ID: {question.user_id}</p>
            <p class="text-gray-500">Created at: {new Date(question.created_at).toLocaleString()}</p>
            <p class="text-gray-500">Last updated: {new Date(question.last_updated).toLocaleString()}</p>
            <p class="text-gray-500">Upvotes: {question.upvote_count}</p>
            <button 
              on:click={() => upvoteQuestion(question.id)} 
              class="mt-2 bg-green-500 text-white rounded px-4 py-2 hover:bg-green-600">
              Upvote
            </button>
          </li>
        {/each}
      </ul>
    {/if}
  </div>
{/if}





