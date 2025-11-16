# ⚡ Quick Start Commands

Fast reference for common commands and tasks.

---

## 🚀 Initial Setup (First Time Only)

```bash
# 1. Install dependencies
cd functions
npm install prom-client
npm install --save-dev @types/node

# 2. Create monitoring directories
mkdir -p monitoring/grafana/provisioning/datasources
mkdir -p monitoring/grafana/dashboards

# 3. Start monitoring stack
docker-compose up -d

# 4. Verify all services are running
docker-compose ps
```

---

## 🏃 Daily Development Commands

### Start Everything
```bash
# Start monitoring stack
docker-compose up -d

# Start Firebase Functions locally
cd functions
npm run serve
```

### Stop Everything
```bash
# Stop monitoring stack
docker-compose down

# Stop Firebase Functions
# Press Ctrl+C in the terminal
```

### Restart Services
```bash
# Restart all monitoring services
docker-compose restart

# Restart specific service
docker-compose restart grafana
docker-compose restart prometheus
docker-compose restart loki
```

---

## 📊 Access Services

| Service | URL | Purpose |
|---------|-----|---------|
| **Grafana** | http://localhost:3000 | Dashboards & visualization |
| **Prometheus** | http://localhost:9090 | Query metrics directly |
| **Push Gateway** | http://localhost:9091 | View pushed metrics |
| **Loki** | http://localhost:3100 | Log API (not web UI) |
| **Firebase Functions** | http://localhost:5001 | Your API endpoint |

**Grafana Login:**
- Username: `admin`
- Password: `admin123`

---

## 🔍 View Logs

### Docker Compose Logs
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f grafana
docker-compose logs -f prometheus
docker-compose logs -f loki

# Last 100 lines
docker-compose logs --tail=100 grafana
```

### Firebase Functions Logs
```bash
# Local emulator logs
cd functions
npm run serve
# Logs appear in the terminal

# Production logs
firebase functions:log

# Specific function
firebase functions:log --only processWorkflow1HTTP

# Follow logs in real-time
firebase functions:log --tail
```

---

## 🧪 Testing Commands

### Test Firebase Function
```bash
# Simple test request
curl -X POST http://localhost:5001/YOUR-PROJECT-ID/us-central1/processWorkflow1HTTP \
  -H "Content-Type: application/json" \
  -H "Origin: http://localhost:4000" \
  -d '{
    "topic": "test topic",
    "followUpAnswers": ["answer 1", "answer 2"]
  }'
```

### Check Metrics in Push Gateway
```bash
# View all metrics
curl http://localhost:9091/metrics

# Search for specific metrics
curl http://localhost:9091/metrics | grep http_requests_total
curl http://localhost:9091/metrics | grep workflow_executions
```

### Query Prometheus Directly
```bash
# Instant query
curl 'http://localhost:9090/api/v1/query?query=http_requests_total'

# Range query (last hour)
curl 'http://localhost:9090/api/v1/query_range?query=rate(http_requests_total[5m])&start=2024-01-01T00:00:00Z&end=2024-01-01T01:00:00Z&step=15s'
```

### Query Loki Directly
```bash
# Query logs
curl -G -s "http://localhost:3100/loki/api/v1/query" \
  --data-urlencode 'query={service="workflow-service"}' \
  --data-urlencode 'limit=10' | jq

# Query range
curl -G -s "http://localhost:3100/loki/api/v1/query_range" \
  --data-urlencode 'query={service="workflow-service"}' \
  --data-urlencode 'start=1h' | jq
```

---

## 📈 Useful Prometheus Queries

Copy-paste these into Prometheus UI (http://localhost:9090):

```promql
# Request rate (requests per second)
rate(http_requests_total[5m])

# Total requests in last hour
increase(http_requests_total[1h])

# Error rate percentage
sum(rate(http_requests_total{status_class=~"4xx|5xx"}[5m])) / sum(rate(http_requests_total[5m])) * 100

# Average response time
rate(http_request_duration_seconds_sum[5m]) / rate(http_request_duration_seconds_count[5m])

# p95 response time
histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))

# Active workflows
active_workflows

# Workflow success rate
rate(workflow_executions_total{status="success"}[5m]) / rate(workflow_executions_total[5m]) * 100

# OpenAI API calls per minute
sum(rate(external_api_calls_total{service="openai"}[1m])) * 60

# Rate limit usage
rate_limit_usage

# Requests by status code
sum by (status_code) (rate(http_requests_total[5m]))
```

---

## 🔍 Useful Loki Queries

Use these in Grafana → Explore → Loki:

```logql
# All logs from workflow service
{service="workflow-service"}

# Only errors
{service="workflow-service"} | json | level="ERROR"

# Specific user's activity
{service="workflow-service"} | json | userId="specific-user-id"

# Trace a specific request
{service="workflow-service"} | json | traceId="specific-trace-id"

# Workflow progress logs
{service="workflow-service"} | json | operation=~"workflow.*"

# Rate limit events
{service="workflow-service"} | json | operation="rate_limiting"

# External API calls
{service="workflow-service"} | json | externalApiCall="true"

# Errors in the last hour
{service="workflow-service"} | json | level="ERROR" [1h]

# Count errors by operation
sum by (operation) (count_over_time({service="workflow-service"} | json | level="ERROR" [5m]))
```

---

## 🛠️ Maintenance Commands

### Clean Up Docker Resources
```bash
# Stop and remove containers
docker-compose down

# Remove volumes (deletes all data!)
docker-compose down -v

# Remove everything including images
docker-compose down --rmi all -v

# View disk usage
docker system df

# Clean up unused resources
docker system prune
```

### Reset Monitoring Stack
```bash
# Stop services
docker-compose down -v

# Start fresh
docker-compose up -d

# Check status
docker-compose ps
```

### Backup Data
```bash
# Backup Prometheus data
docker cp prometheus:/prometheus ./prometheus_backup

# Backup Grafana data
docker cp grafana:/var/lib/grafana ./grafana_backup

# Backup Loki data
docker cp loki:/loki ./loki_backup
```

---

## 🐛 Troubleshooting Commands

### Check Service Health
```bash
# Check if Prometheus is scraping
curl http://localhost:9090/api/v1/targets

# Check Loki health
curl http://localhost:3100/ready

# Check Push Gateway metrics
curl http://localhost:9091/metrics | head -20
```

### Debug Network Issues
```bash
# Inspect Docker network
docker network inspect monitoring

# Check service IPs
docker inspect -f '{{range.NetworkSettings.Networks}}{{.IPAddress}}{{end}}' prometheus
docker inspect -f '{{range.NetworkSettings.Networks}}{{.IPAddress}}{{end}}' loki
docker inspect -f '{{range.NetworkSettings.Networks}}{{.IPAddress}}{{end}}' grafana
```

### View Container Stats
```bash
# Real-time resource usage
docker stats

# Specific container
docker stats grafana
```

---

## 📦 Firebase Deployment

### Deploy Functions
```bash
cd functions

# Deploy all functions
firebase deploy --only functions

# Deploy specific function
firebase deploy --only functions:processWorkflow1HTTP

# Set environment config
firebase functions:config:set prometheus.push_gateway="YOUR_PRODUCTION_URL"

# Get current config
firebase functions:config:get

# View deployed functions
firebase functions:list
```

---

## 🎯 Common Workflows

### 1. Start Development Session
```bash
docker-compose up -d && cd functions && npm run serve
```

### 2. Make a Test Request
```bash
curl -X POST http://localhost:5001/YOUR-PROJECT-ID/us-central1/processWorkflow1HTTP \
  -H "Content-Type: application/json" \
  -H "Origin: http://localhost:4000" \
  -d '{"topic": "test", "followUpAnswers": ["a1", "a2"]}'
```

### 3. Check Metrics in Grafana
```
1. Open http://localhost:3000
2. Login (admin/admin123)
3. Go to Dashboards → Workflow Service Overview
4. Refresh to see latest data
```

### 4. Debug Issues
```bash
# Check Firebase logs
docker-compose logs -f

# Check if metrics are being pushed
curl http://localhost:9091/metrics | grep http_requests

# Query Prometheus
curl 'http://localhost:9090/api/v1/query?query=up'
```

### 5. End Development Session
```bash
# Stop Firebase Functions (Ctrl+C)
# Stop monitoring
docker-compose down
```

---

## 🚀 Production Deployment (Coming Next)

When you're ready to deploy to GCP:

1. Create GCP VM instance
2. Install Docker on VM
3. Copy docker-compose.yml to VM
4. Update Firebase Functions config with production Push Gateway URL
5. Start monitoring stack on VM
6. Deploy Firebase Functions

**Detailed production guide coming in next steps!**

---

## 📚 Quick Reference

| What | Where | Command |
|------|-------|---------|
| View dashboards | Grafana UI | http://localhost:3000 |
| Query metrics | Prometheus UI | http://localhost:9090/graph |
| View logs | Grafana Explore | Grafana → Explore → Loki |
| Push Gateway | Browser | http://localhost:9091 |
| Test function | cURL | See "Testing Commands" |
| View Docker logs | Terminal | `docker-compose logs -f` |
| Restart service | Terminal | `docker-compose restart SERVICE` |

---

**Save this file for quick reference! 📌**