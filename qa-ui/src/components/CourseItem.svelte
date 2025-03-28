<script>
  export let course;
</script>

<a href={`/course/${course.id}`} class="block p-4 bg-white rounded shadow-md hover:shadow-lg">
  <h3 class="text-lg font-semibold">{course.name}</h3>
  <p class="text-gray-700">{course.description}</p>
</a>
