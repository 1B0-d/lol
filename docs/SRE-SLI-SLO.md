# SRE Midterm: SLI/SLO Definitions and Error Budget

## Service Level Indicators (SLIs)

### 1. Request Latency
**Definition**: The time it takes for the application to respond to HTTP requests.

**Measurement**:
- Metric: `histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))`
- Query: 95th percentile of request duration over 5-minute windows
- Unit: seconds

### 2. Request Success Rate
**Definition**: The percentage of HTTP requests that return successful status codes (2xx).

**Measurement**:
- Metric: `rate(http_requests_total{status=~"2.."}[5m]) / rate(http_requests_total[5m])`
- Query: Ratio of successful requests to total requests over 5-minute windows
- Unit: percentage (0-1)

## Service Level Objectives (SLOs)

### 1. Latency SLO
**Target**: 95% of requests should complete within 500ms over a 30-day period.

**SLO Expression**:
```
histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[30d])) <= 0.5
```

**Error Budget**: 5% of requests can exceed 500ms latency.

### 2. Availability SLO
**Target**: 99% of requests should return successful status codes (2xx) over a 30-day period.

**SLO Expression**:
```
rate(http_requests_total{status=~"2.."}[30d]) / rate(http_requests_total[30d]) >= 0.99
```

**Error Budget**: 1% of requests can fail.

## Error Budget Calculations

### Monthly Error Budget (30 days)

**Latency Error Budget**:
- Total requests allowed to exceed 500ms: 5% of all requests
- If app receives 1,000 requests/day = 30,000 requests/month
- Error budget: 1,500 requests can be slow

**Availability Error Budget**:
- Total failed requests allowed: 1% of all requests
- If app receives 1,000 requests/day = 30,000 requests/month
- Error budget: 300 requests can fail

## Alerting Strategy

### Warning Level Alerts
- Latency: 90% of requests < 500ms (burning error budget at 2x normal rate)
- Availability: 95% success rate (burning error budget at 2x normal rate)

### Critical Level Alerts
- Latency: 80% of requests < 500ms (burning error budget at 10x normal rate)
- Availability: 90% success rate (burning error budget at 10x normal rate)

## Burn Rate Calculations

**Latency Burn Rate**:
- Normal consumption: 5% per month
- Warning threshold: 10% per month (2x normal)
- Critical threshold: 50% per month (10x normal)

**Availability Burn Rate**:
- Normal consumption: 1% per month
- Warning threshold: 2% per month (2x normal)
- Critical threshold: 10% per month (10x normal)