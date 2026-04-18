# Docker Swarm Bonus

## What this covers
- Docker Swarm cluster initialization
- Stack deployment with `docker stack deploy`
- Service replicas for the portfolio app

## Images to build first
`docker stack deploy` does not build images from `Dockerfile`, so build the app images first:

```powershell
docker build -f backend/Dockerfile -t portfolio-backend:swarm .
docker build -f frontend/Dockerfile -t portfolio-frontend:swarm .
```

## Initialize Swarm
On a single machine demo:

```powershell
docker swarm init
```

If Swarm is already initialized, Docker will tell you and you can continue.

## Deploy the stack
From the project root:

```powershell
docker stack deploy --compose-file docker-stack.yml --resolve-image never sre
```

## Verify the stack
Check services:

```powershell
docker stack services sre
```

Check running tasks:

```powershell
docker stack ps sre
```

You should see:
- `frontend` with `2/2` replicas
- `backend` with `1/1`
- `prometheus` with `1/1`
- `grafana` with `1/1`
- `node-exporter` running in `global` mode

## Access URLs
- App: `http://localhost:8080`
- Prometheus: `http://localhost:9090`
- Grafana: `http://localhost:3000`

## Clean up the stack
```powershell
docker stack rm sre
```

## Good screenshot ideas
- `docker stack services sre`
- application open on `http://localhost:8080`
- optional: `docker service ls` showing replicas
