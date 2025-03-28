# Running Instructions for Local Environment with Kubernetes (Minikube)

This folder contains instructions for local development setup using Minikube

## Starting up and setting configurations

Starting Minikube

```bash
minikube start --cpus 4 --memory 8192
```

<br>

Enable Ingress addon

```bash
minikube addons enable ingress
```

<br>

Enable Clounative postgress addon

```bash
kubectl apply -f https://raw.githubusercontent.com/cloudnative-pg/cloudnative-pg/release-1.19/releases/cnpg-1.19.1.yaml
```

<br>

Enable metrics-server addon

```bash
kubectl apply -f kubernetes/components.yaml
```

<br>

Listing all addons

```bash
minikube addons list
```

Verify that `ingress` is enabled  

<br>

Get pods

```bash
kubectl get pods -n kube-system
```

Verify that `metrics-server` is running

<br>


Create `production` namespace

```bash
kubectl create namespace production
```

<br>

Get minikube IP and set it to the hosts file

```bash
minikube ip
```

<br>

Add new host `local.production` specifying it with the minikube IP. In Linux/Mac the hosts file is in `/etc/hosts`

### Modify files in qa-ui:

Edit the ```domain``` to be ```local.production```

### Building images:

Build image in flyway folder

```bash
cd flyway

minikube image build -t database-migrations -f ./Dockerfile .

cd ..
```

<br>

Build image  in qa-api folder

```bash
cd qa-api

minikube image build -t qa-api -f ./Dockerfile.kubernetes.prod .

cd ..
```

<br>

Build image in llm-api folder

```bash
cd llm-api

minikube image build -t llm-api -f ./Dockerfile .

cd ..
```

<br>

Build image in qa-ui folder

```bash
cd qa-ui

minikube image build -t qa-ui -f ./Dockerfile.kubernetes.prod .

cd ..
```

<br>

Build image in websocket folder

```bash
cd websocket

minikube image build -t websocket -f ./Dockerfile.kubernetes.prod .

cd ..
```

### Deploying

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

Apply Ingress

```bash
kubectl apply -f kubernetes/ingress.yaml
```

<br>

Get all in `production` namespace

```bash
kubectl get all -n production
```

<br>

Access app in `http://local.production/`

### Redeployment

```bash
kubectl rollout restart deployment/websocket-deployment -n production
kubectl rollout restart deployment/qa-api-deployment -n production
kubectl rollout restart deployment/qa-ui-deployment -n production
```

### Get logs

```bash
kubectl logs <id> -n production
```

### Deleting everything

```bash
minikube delete --all
```

### Deleting single deployments/services

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

## Adding Prometheus and Grafana to monitor application

Install `Helm` from [here](https://helm.sh/docs/intro/install/)

Add repos

```bash
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo add stable https://kubernetes-charts.storage.googleapis.com/
helm repo update
```

Install chart

```bash
helm install prometheus prometheus-community/kube-prometheus-stack
```

Port-forward grafana deployment to port 3000

```bash
kubectl port-forward deployment/prometheus-grafana 3000
```

Access Grafana UI in `http://localhost:3000/`. Admin credentials are username:`admin` and password:`prom-operator`

<br>

Get pods

```bash
kubectl get pod
```

Port-forward prometheus deployment to port 9090

```bash
kubectl port-forward prometheus-prometheus-kube-prometheus-prometheus-0 9090
```

Access Prometheus UI in `http://localhost:9090/`.