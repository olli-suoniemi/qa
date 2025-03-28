<script>
  import { onMount } from 'svelte';
  import CourseItem from '../components/CourseItem.svelte';

  let courses = [];
  
  let loading = true; // Track the loading state
  const apiUrl = '/api'

  // Fetch available courses from the API when the component mounts
  onMount(async () => {
    try {
      const response = await fetch(`${apiUrl}/courses`, { method: 'GET' });
      if (!response.ok) {
        throw new Error('Failed to fetch courses');
      }
      courses = await response.json();
    } catch (error) {
      console.error(error);
    } finally {
      loading = false; // Set loading to false regardless of success or failure
    }
  });
</script>

<h1 class="text-2xl font-bold mb-4">Available Courses</h1>

{#if loading}
  <p>Loading courses...</p>
{:else}
  <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
    {#each courses as course (course.id)}
      <CourseItem course={course} />
    {/each}
  </div>
{/if}
