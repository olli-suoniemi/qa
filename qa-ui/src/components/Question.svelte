<script>
  import { onMount, onDestroy } from 'svelte';
  import { userUuid } from '../stores/stores.js';

  export let questionId; // Question ID passed as a prop

  // const apiDomain = "https://api.localhost";
  // const wsDomain = "wss://ws.localhost/ws";

  const apiDomain = "https://qa.olli.codes/api";
  const wsDomain = "wss://qa.olli.codes/ws";

  let question = null; // To hold the question details
  let answers = []; // To hold answers for the question
  let errorMessage = ''; // To hold error messages
  let loading = true;
  let newAnswer = '';
  let currentPage = 1; // Track the current page
  const limit = 10; // Max questions per page

  // WebSocket connection
  let ws;
  let reconnectInterval = 1000; // Start with 1 second
  let reconnectAttempts = 0;
  let maxReconnectAttempts = 5;
  let manualClose = false; // Track if the WebSocket was closed manually
  
  const setupWebSocket = () => {
    const wsUrl = `${wsDomain}?question=${questionId}`;
    ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      console.log("WebSocket connection opened for question", questionId);
      reconnectInterval = 1000; // Reset the interval on successful connection
      reconnectAttempts = 0; // Reset attempts count
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      // Check if the answer is already in the array
      if (!answers.some(answer => answer.id === data.id)) {
        answers = [data, ...answers];  // Add the new answer only if it doesn't already exist
      }
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


  // Function to fetch the question details and its answers
  const fetchQuestionDetailsInitial = async () => {
    loading = true; // Set loading to true while fetching

    try {
      const response = await fetch(`${apiDomain}/question/${questionId}?page=${1}&limit=${limit}`);
      if (!response.ok) throw new Error('Question not found'); 

      const questionData = await response.json();
      question = questionData.question; // The main question object

      answers = questionData.answers; // Initialize answers for the first page
      
    } catch (error) {
      errorMessage = error.message; // Set error message if fetching fails
    } finally {
      loading = false
    }
  };


  // Function to fetch the question details and its answers when in need of loading more answers (bottom of the page)
  const fetchQuestionDetails = async (page = 1) => {
    try {
      const response = await fetch(`${apiDomain}/question/${questionId}?page=${page}&limit=${limit}`);
      if (!response.ok) throw new Error('Question not found'); 

      const questionData = await response.json();
      question = questionData.question; // The main question object

      // Append new answers for subsequent pages without duplicating
      answers = [
        ...answers,
        ...questionData.answers.filter(newAnswer => !answers.some(answer => answer.id === newAnswer.id))
      ];
    } catch (error) {
      errorMessage = error.message; // Set error message if fetching fails
    } 
  };


  // Function to handle scroll event
  const handleScroll = () => {
    const scrollPosition = window.innerHeight + window.scrollY;
    const bottomPosition = document.documentElement.offsetHeight;

    if (scrollPosition >= bottomPosition - 100) {
      currentPage += 1; // Increase page number
      fetchQuestionDetails(currentPage); // Fetch next set of questions
    }
  };


  // Function to handle answer submission
  const submitAnswer = async () => {
    if (!newAnswer.trim()) {
      alert('Please enter an answer.');
      return;
    }

    const answerData = {
      questionID: questionId,
      answer: newAnswer,
      user: $userUuid 
    };

    try {
      const response = await fetch(`${apiDomain}/answer`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(answerData),
      });

      if (!response.ok) {
        const errorResponse = await response.json();
        throw new Error(errorResponse.error || 'Failed to submit answer');
      }

      // Reset the answer input
      newAnswer = '';
      currentPage = 1; // Reset to page 1 

      // Refetch answers to update the list after submission
      await fetchQuestionDetails(currentPage); // Refetch answers after submission
    } catch (error) {
      errorMessage = error.message; // Set error message if submission fails
    }
  };


  // Function to handle upvoting an answer
  const upvoteAnswer = async (answerId) => {
    try {
      const response = await fetch(`${apiDomain}/answer/upvote/${answerId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ user: $userUuid }),
      });

      if (!response.ok) {
        const errorResponse = await response.json();
        throw new Error(errorResponse.error || 'Failed to upvote answer');
      }

      // Find the answer that was upvoted and update its upvote count
      const answerIndex = answers.findIndex(a => a.id === answerId);
      if (answerIndex !== -1) {
        
        // Convert upvote_count to a number and increment it
        answers[answerIndex].upvote_count = Number(answers[answerIndex].upvote_count) + 1;
        
        // Update the last_updated field to the current time
        answers[answerIndex].last_updated = new Date().toISOString();
      }
    } catch (error) {
      errorMessage = error.message; // Set error message if upvoting fails
    }
  };


  // Fetch question details and answers on component mount
  onMount(() => {
    setupWebSocket(); 
    fetchQuestionDetailsInitial(); // Initial fetch
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
      Back to Question
    </button>
  </div>
{:else if question}
  <div class="p-4">
    <h1 class="text-2xl font-bold mb-4">{question.content}</h1>
    <p class="text-gray-600">Posted by User ID: {question.user_id}</p>
    <p class="text-gray-500">Created at: {new Date(question.created_at).toLocaleString()}</p>
    <p class="text-gray-500">Last updated: {new Date(question.last_updated).toLocaleString()}</p>

    <h2 class="text-xl font-semibold mt-6">Submit an Answer:</h2>
    <div class="mb-4">
      <textarea 
        bind:value={newAnswer} 
        placeholder="Type your answer here..." 
        class="border rounded p-2 w-full" 
        rows="3"></textarea>
      <button 
        on:click={submitAnswer} 
        class="mt-2 bg-blue-500 text-white rounded px-4 py-2 hover:bg-blue-600">
        Submit Answer
      </button>
    </div>

    <h2 class="text-xl font-semibold mt-6">Answers:</h2>
    {#if answers.length === 0}
      <p>No answers available for this question.</p>
    {:else}
      <ul class="mt-2">
        {#each answers as answer}
          <li class="mb-4 border-b pb-2">
            <p class="font-bold">{answer.content}</p>
            <p class="text-gray-600">Posted by User ID: {answer.user_id}</p>
            <p class="text-gray-500">Created at: {new Date(answer.created_at).toLocaleString()}</p>
            <p class="text-gray-500">Last updated: {new Date(answer.last_updated).toLocaleString()}</p>
            <p class="text-gray-500">Upvotes: {answer.upvote_count || 0}</p>
            {#if answer.is_llm_generated}
              <p class="text-gray-500 italic">This answer was generated by an LLM.</p>
            {/if}
            <button 
              on:click={() => upvoteAnswer(answer.id)} 
              class="mt-2 bg-green-500 text-white rounded px-4 py-2 hover:bg-green-600">
              Upvote
            </button>
          </li>
        {/each}
      </ul>
    {/if}
  </div>
{:else}
  <div class="p-4">
    <h1 class="text-2xl font-bold">No question found.</h1>
  </div>
{/if}
