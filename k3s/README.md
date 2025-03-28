# Running Instructions with K3S in a VPS

The configurations are files for applying the commands are presented in this folder.

## Starting up

Prepare VPS:

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install curl -y
```

Install [Docker](https://docs.docker.com/engine/install/ubuntu/) & [Kubectl](https://kubernetes.io/docs/tasks/tools/install-kubectl-linux/)

Install K3s:

```bash
curl -sfL https://get.k3s.io | sh -
```

Apply certmanager:

```bash
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/latest/download/cert-manager.yaml
```

You can check if K3s is running with:

```bash
sudo systemctl status k3s
```

The installation script creates a kubeconfig file for you at /etc/rancher/k3s/k3s.yaml. To use kubectl to interact with your K3s cluster, copy this file to your user’s home directory:

```bash
sudo cp /etc/rancher/k3s/k3s.yaml ~/.kube/config
sudo chown $(id -u):$(id -g) ~/.kube/config
```

Now, you can use kubectl to interact with your cluster:

```bash
kubectl get nodes
```

On local machine. Authenticate to GHCR:

```bash
echo "<YOUR_GITHUB_PERSONAL_ACCESS_TOKEN>" | docker login ghcr.io -u olli-suoniemi --password-stdin
```

Build & push images to GHCR:

```bash
docker build -t ghcr.io/olli-suoniemi/qa-project/llm-api:latest -f llm-api/Dockerfile llm-api/
docker build -t ghcr.io/olli-suoniemi/qa-project/qa-api:latest -f qa-api/Dockerfile qa-api/
docker build -t ghcr.io/olli-suoniemi/qa-project/qa-ui:latest -f qa-ui/Dockerfile qa-ui/
docker build -t ghcr.io/olli-suoniemi/qa-project/websocket:latest -f websocket/Dockerfile websocket/
docker build -t ghcr.io/olli-suoniemi/qa-project/flyway:latest -f flyway/Dockerfile flyway/
```

```bash
docker push ghcr.io/olli-suoniemi/qa-project/llm-api:latest
docker push ghcr.io/olli-suoniemi/qa-project/qa-api:latest
docker push ghcr.io/olli-suoniemi/qa-project/qa-ui:latest
docker push ghcr.io/olli-suoniemi/qa-project/websocket:latest
docker push ghcr.io/olli-suoniemi/qa-project/flyway:latest
```

Remember to set the images public in GHCR.

<br>

Copy kubernetes folder to VPS:

```bash
scp -r ~/Personal/QA-App/k3s olli@157.180.45.27:/home/olli/qa-project/kubernetes
```

<br>

In VPS, pull images:

```bash
docker pull ghcr.io/olli-suoniemi/qa-project/llm-api:latest
docker pull ghcr.io/olli-suoniemi/qa-project/qa-api:latest
docker pull ghcr.io/olli-suoniemi/qa-project/qa-ui:latest
docker pull ghcr.io/olli-suoniemi/qa-project/websocket:latest
docker pull ghcr.io/olli-suoniemi/qa-project/flyway:latest
```

Enable metrics-server addon

```bash
kubectl apply -f kubernetes/components.yaml
```

<br>

Get pods

```bash
kubectl get pods -n kube-system --watch
```

Verify that `metrics-server` is running and ready 1/1

<br>


Create `production` namespace

```bash
kubectl apply -f kubernetes/production-namespace.yaml
``` 

<br>

## Deploying

Apply database-cluster 

```bash
kubectl apply -f kubernetes/database-cluster.yaml
```

<br>

Get clusters

```bash
kubectl get cluster -n production --watch
```

Wait for the database-cluster to be in status `Cluster in healthy state`

<br>

Check database-cluster status

```bash
kubectl cnpg status database-cluster -n production
```

<br>


Apply database-migration

```bash
kubectl apply -f kubernetes/database-migration-job.yaml
```

<br>


Get production pods

```bash
kubectl get pods -n production --watch
```

Wait for the database-migration to be in status `Completed`

<br>


Check psql is accessible in database-cluster

```bash
kubectl cnpg psql database-cluster -n production

\c app

\dt

\q
```

<br>

Create env file and create configmap out of it

```bash
PUBLIC_DOMAIN=
```


```bash
kubectl create configmap qa-ui-env --from-env-file=.env -n production
```


Apply redis

```bash
kubectl apply -f kubernetes/redis-deployment.yaml
kubectl apply -f kubernetes/redis-service.yaml
```

<br>

Apply llm-api

```bash
kubectl apply -f kubernetes/llm-api-deployment.yaml
kubectl apply -f kubernetes/llm-api-service.yaml
```

<br>

Apply qa-api

```bash
kubectl apply -f kubernetes/qa-api-app.yaml
```

<br>

Apply qa-ui

```bash
kubectl apply -f kubernetes/qa-ui-deployment.yaml
kubectl apply -f kubernetes/qa-ui-service.yaml
```

<br>

Apply websocket

```bash
kubectl apply -f kubernetes/websocket-deployment.yaml
kubectl apply -f kubernetes/websocket-service.yaml
```

<br>

Apply letsencrypt

```bash
kubectl apply -f letsencrypt-prod.yaml
```

Apply Ingress

```bash
kubectl apply -f kubernetes/ingress.yaml
```

Verify ssl is working

```bash
kubectl get certificate -n production
```

Rollout traefik:

```bash
kubectl rollout restart deployment traefik -n kube-system
```

<br>

Get all in `production` namespace

```bash
kubectl get all -n production
```

<br>

# Debugging

## Redeployment

```bash
kubectl rollout restart deployment/websocket-deployment -n production
kubectl rollout restart deployment/qa-api-deployment -n production
kubectl rollout restart deployment/qa-ui-deployment -n production
kubectl rollout restart deployment/llm-api-deployment -n production
```
## Get pods

```bash
kubectl get pods -n production 
```

## Get logs

```bash
kubectl logs -n production name
```

## Deleting single deployments/services

```bash
kubectl delete -f kubernetes/components.yaml
kubectl delete -f kubernetes/database-cluster.yaml
kubectl delete -f kubernetes/database-migration-job.yaml
kubectl delete -f kubernetes/ingress.yaml
kubectl delete -f kubernetes/llm-api-deployment.yaml
kubectl delete -f kubernetes/llm-api-service.yaml
kubectl delete -f kubernetes/production-namespace.yaml
kubectl delete -f kubernetes/qa-api-app.yaml
kubectl delete -f kubernetes/qa-ui-deployment.yaml
kubectl delete -f kubernetes/qa-ui-service.yaml
kubectl delete -f kubernetes/redis-deployment.yaml
kubectl delete -f kubernetes/redis-service.yaml
kubectl delete -f kubernetes/websocket-deployment.yaml
kubectl delete -f kubernetes/websocket-service.yaml
```