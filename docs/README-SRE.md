# SRE Midterm Project - Portfolio Application Monitoring

## Overview
This project implements a complete SRE monitoring stack for a portfolio/contact form web application built with Go, Firebase, and containerized with Docker.

## Architecture
- **Frontend**: Static HTML/CSS/JS served by Go backend
- **Backend**: Go application with Firebase Auth and Firestore
- **Database**: Firebase/Firestore (external)
- **Monitoring Stack**:
  - Prometheus (metrics collection)
  - Grafana (visualization)
  - Node Exporter (system metrics)
  - Prometheus alert rules (alerting)

## Service Level Indicators (SLIs) & Objectives (SLOs)

### SLIs
1. **Request Latency**: 95th percentile response time
2. **Request Success Rate**: Percentage of successful HTTP responses

### SLOs
1. **Latency**: 95% of requests < 500ms over 30 days
2. **Availability**: 99% success rate over 30 days

### Error Budgets
- **Latency**: 5% of requests can exceed 500ms (1,500 out of 30,000 monthly requests)
- **Availability**: 1% of requests can fail (300 out of 30,000 monthly requests)

## Setup Instructions

### 1. Start the Stack
```bash
docker-compose up -d
```

### 2. Access Services
- **Application**: http://localhost:8080
- **Prometheus**: http://localhost:9090
- **Grafana**: http://localhost:3000 (admin/admin)
- **Node Exporter**: http://localhost:9100

### 3. Import Grafana Dashboard
1. Open Grafana at http://localhost:3000
2. Login with admin/admin
3. Go to Dashboards → Import
4. The dashboard is provisioned automatically from `observability/grafana/dashboards/grafana-dashboard-fixed.json`
5. Select Prometheus as data source

### 4. Configure Alertmanager (Optional)
```yaml
# alertmanager.yml
global:
  smtp_smarthost: 'smtp.gmail.com:587'
  smtp_from: 'your-email@gmail.com'

route:
  group_by: ['alertname']
  group_wait: 10s
  group_interval: 10s
  repeat_interval: 1h
  receiver: 'email'

receivers:
- name: 'email'
  email_configs:
  - to: 'your-email@gmail.com'
```

## Alerting Strategy

### Warning Level (2x error budget burn rate)
- **Latency**: P95 > 500ms for 5+ minutes
- **Availability**: Success rate < 95% for 5+ minutes

### Critical Level (10x error budget burn rate)
- **Latency**: P95 > 1 second for 5+ minutes
- **Availability**: Success rate < 90% for 5+ minutes

## Manual Alert Testing

### Trigger Latency Alert
1. Add artificial delay to Go handlers:
```go
// In main.go, temporarily add this to any handler:
time.Sleep(2 * time.Second) // This will trigger critical latency alert
```

2. Make requests to the app while delay is active
3. Check Prometheus alerts page: http://localhost:9090/alerts
4. Take screenshot of alert in FIRING state

### Trigger Availability Alert
1. Temporarily change response status to 500 in handlers
2. Make several requests
3. Check alerts page for availability alerts

## Deliverables Checklist

### ✅ Completed
- [x] Real web application (portfolio with Firebase)
- [x] Complete Docker Compose stack with Node Exporter
- [x] Application metrics (Prometheus client in Go)
- [x] 2 app-specific SLIs defined
- [x] Realistic SLOs with error budget calculations
- [x] SLO-based alerting (Warning/Critical levels)
- [x] Enhanced Grafana dashboard with Golden Signals
- [x] SLO compliance panels

### 📋 For Submission
- [ ] PDF Report (architecture, SLIs/SLOs, error budgets, dashboard screenshots)
- [ ] 5-7 slide presentation
- [ ] Live demo with alert triggering
- [ ] Screenshot of alert in FIRING state

## Key Metrics Queries

### Golden Signals
```promql
# Traffic
rate(http_requests_total[5m])

# Latency (P95)
histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))

# Errors
rate(http_requests_total{status!~"2.."}[5m]) / rate(http_requests_total[5m])

# Saturation
100 - (avg by (instance) (rate(node_cpu_seconds_total{mode="idle"}[5m])) * 100)
```

### SLO Compliance
```promql
# Latency SLO (95% < 500ms)
histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[30d])) <= 0.5

# Availability SLO (99% success)
rate(http_requests_total{status=~"2.."}[30d]) / rate(http_requests_total[30d]) >= 0.99
```

## Troubleshooting

### Common Issues
1. **Metrics not appearing**: Check if `/metrics` endpoint is accessible
2. **Host saturation panels empty**: Ensure `node-exporter` is running and being scraped by Prometheus
3. **Grafana panels empty**: Verify Prometheus data source configuration
4. **Alerts not firing**: Check alert expressions in Prometheus UI

### Useful Commands
```bash
# View running containers
docker-compose ps

# Check container logs
docker-compose logs prometheus
docker-compose logs app

# Restart services
docker-compose restart

# Clean restart
docker-compose down && docker-compose up -d
```
