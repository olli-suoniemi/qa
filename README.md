# Q&A platform with LLM 

### 🚀 [Try the app](https://qa.olli.codes/)

The live demo is deployed using Docker stack and this branch contains configurations for that. To check K3s version, check the main-branch.


### Deployment

```bash
docker build -t ghcr.io/olli-suoniemi/qa-project/llm-api:latest -f llm-api/Dockerfile llm-api/
docker build -t ghcr.io/olli-suoniemi/qa-project/qa-api:latest -f qa-api/Dockerfile.prod qa-api/
docker build -t ghcr.io/olli-suoniemi/qa-project/qa-ui:latest -f qa-ui/Dockerfile.prod qa-ui/
docker build -t ghcr.io/olli-suoniemi/qa-project/websocket:latest -f websocket/Dockerfile.prod websocket/
docker build -t ghcr.io/olli-suoniemi/qa-project/flyway:latest -f flyway/Dockerfile flyway/
```

```bash
docker push ghcr.io/olli-suoniemi/qa-project/llm-api:latest 
docker push ghcr.io/olli-suoniemi/qa-project/qa-api:latest 
docker push ghcr.io/olli-suoniemi/qa-project/qa-ui:latest 
docker push ghcr.io/olli-suoniemi/qa-project/websocket:latest 
docker push ghcr.io/olli-suoniemi/qa-project/flyway:latest 
```

```bash
scp ~/Personal/QA-App/docker-stack.yml olli@olli.codes:/home/olli/qa-platform/docker-stack.yml
```

```bash
docker pull ghcr.io/olli-suoniemi/qa-project/llm-api:latest 
docker pull ghcr.io/olli-suoniemi/qa-project/qa-api:latest 
docker pull ghcr.io/olli-suoniemi/qa-project/qa-ui:latest 
docker pull ghcr.io/olli-suoniemi/qa-project/websocket:latest 
docker pull ghcr.io/olli-suoniemi/qa-project/flyway:latest 

```bash
docker stack deploy -c docker-stack.yml qa-platform
```