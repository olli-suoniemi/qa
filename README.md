# Q&A platform with LLM 

### 🚀 [Try the app. Ask questions to AI or answer other people's questions!](https://qa.olli.codes/)

This project is about demonstrating the use of different programming techiques by creating a question & answer (Q&A) kind of platform. The platform demonstrates programming techniques such as scalability, load balancing, message queues, event-driven architechture and static site generation.

The Q&A platform is intended for different kind of questions and answers. In the platform you can select a course, ask questions on the course, and provide answers to the questions. There is also the possibility to upvote the questions and answers. Questions and answers can be posted by anyone, and anyone can upvote the questions and answers, allowing anonymous participation.

## Tech

The LLM model used in the project is gpt-4o-mini from OpenAI. This branch of the app uses distilgpt2 model but in the ```docker-stack``` I'm using the better version from OpenAI.

The answers of the LLM are updated to the user automatically using websockets. So there is no need to refresh the page. Also questions posted to the platform will automatically appear to other users without others needing to refresh the site.

The UI is built with JavaScript using Astro and Svelte. The LLM api uses Python and leverages fastapi. The QA-API is built also with JavaScript using Deno. The app also uses Redis for caching to improve performance. The database is PostgreSQL, and for migrations I'm using Flyway. There are optimization indexes in ```flyway/sql/V3__optimization_indexes.sql``` to boost search performance. Performance tests can be found in ```k6``` folder. Each service is packaged to Docker image and the app is deployed using K3s. The configurations files are in folder ```k3s```. Ingress and Traefik is used for network control. The app is hosted in a VPS using basic security protocols. Check the ```k3s``` folder for more information about deploying to VPS using K3s. For local development setup check folder ```minikube```.
