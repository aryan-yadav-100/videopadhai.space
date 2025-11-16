# 🚀 Monitoring & Logging Setup Guide

Complete guide to setup Prometheus, Grafana, and Loki for your Firebase Functions backend.

---

## 📋 Prerequisites

- Docker and Docker Compose installed
- Node.js and npm installed
- Firebase CLI installed
- Your Backend 1 code (Firebase Functions)

---

## 🏗️ Project Structure

Create this folder structure in your project root:

```
your-project/
├── functions/                    # Your Firebase Functions code
│   ├── src/
│   │   ├── api/
│   │   │   └── processWorkflow1.ts  (UPDATED)
│   │   ├── services/
│   │   │   └── workflowService.ts   (UPDATED)
│   │   ├── utils/
│   │   │   ├── logger.ts            (UPDATED)
│   │   │   ├── metrics.ts           (NEW)
│   │   │   ├── middleware.ts        (NEW)
│   │   │   ├── auth.ts
│   │   │   ├── rateLimiter.ts
│   │   │   └── input-validation.ts
│   │   └── index.ts                 (UPDATED)
│   └── package.json
│
├── monitoring/                   # Monitoring stack configs
│   ├── prometheus.yml
│   ├── loki-config.yml
│   ├── promtail-config.yml
│   └── grafana/
│       ├── provisioning/
│       │   └── datasources/
│       │       └── datasources.yml
│       └── dashboards/
│           └── (dashboards will go here)
│
├── docker-compose.yml
├── .env
└── README.md
```

---

## 📦 Step 1: Install Dependencies

In your `functions/` directory, install the new dependencies:

```bash
cd functions
npm install prom-client
npm install --save-dev @types/node
```

---

## 🔄 Step 2: Update Your Code Files

Replace/update these files with the new versions provided:

### **Required File Updates:**

1. ✅ **`functions/src/utils/logger.ts`** - Enhanced logger (REPLACE)
2. ✅ **`functions/src/utils/metrics.ts`** - NEW FILE (CREATE)
3. ✅ **`functions/src/utils/middleware.ts`** - NEW FILE (CREATE)
4. ✅ **`functions/src/api/processWorkflow1.ts`** - Updated handler (REPLACE)
5. ✅ **`functions/src/services/workflowService.ts`** - Updated service (REPLACE)

### **Minor Updates Needed:**

6. **`functions/src/utils/rateLimiter.ts`** - Add metrics (see below)
7. **`functions/src/services/httpsservice.ts`** - Add traceId parameter (see below)

---

## ⚙️ Step 3: Create Monitoring Configuration Files

### **3.1 Create `docker-compose.yml`** (in project root)

```bash
# Use the docker-compose.yml artifact provided
```

### **3.2 Create monitoring configs:**

```bash
mkdir -p monitoring/grafana/provisioning/datasources
mkdir -p monitoring/grafana/dashboards
```

Copy these files to the `monitoring/` directory:
- `prometheus.yml`
- `loki-config.yml`
- `promtail-config.yml`

Copy `datasources.yml` to:
- `monitoring/grafana/provisioning/datasources/datasources.yml`

---

## 🔑 Step 4: Environment Variables

Create a `.env` file in your project root:

```env
# Prometheus Push Gateway URL
PROMETHEUS_PUSH_GATEWAY_URL=http://localhost:9091

# Node Environment
NODE_ENV=development

# Your existing Firebase config
FIREBASE_PROJECT_ID=your-project-id
OPENAI_API_KEY=your-openai-key
```

Update your Firebase Functions environment:

```bash
firebase functions:config:set prometheus.push_gateway="http://localhost:9091"
```

---

## 🚀 Step 5: Start the Monitoring Stack

### **5.1 Start all monitoring services:**

```bash
docker-compose up -d
```

This will start:
- ✅ Prometheus (http://localhost:9090)
- ✅ Push Gateway (http://localhost:9091)
- ✅ Loki (http://localhost:3100)
- ✅ Promtail (log shipper)
- ✅ Grafana (http://localhost:3000)

### **5.2 Verify services are running:**

```bash
docker-compose ps
```

You should see all 5 services as "Up"

### **5.3 Check logs:**

```bash
docker-compose logs -f grafana
```

---

## 🎯 Step 6: Access Grafana

1. Open browser: **http://localhost:3000**
2. Login credentials:
   - Username: `admin`
   - Password: `admin123`

3. Change password when prompted (optional for local dev)

---

## 📊 Step 7: Verify Data Sources

In Grafana:

1. Go to **Configuration → Data Sources**
2. You should see:
   - ✅ **Prometheus** (default)
   - ✅ **Loki**

3. Click "Test" on each to verify connection

---

## 🧪 Step 8: Test Your Setup

### **8.1 Deploy Firebase Functions locally:**

```bash
cd functions
npm run serve
```

Firebase Functions will run on http://localhost:5001

### **8.2 Make a test request:**

```bash
curl -X POST http://localhost:5001/your-project/us-central1/processWorkflow1HTTP \
  -H "Content-Type: application/json" \
  -H "Origin: http://localhost:4000" \
  -d '{
    "topic": "test topic",
    "followUpAnswers": ["answer 1", "answer 2"]
  }'
```

### **8.3 Check metrics in Prometheus:**

1. Open http://localhost:9090
2. Go to **Graph** tab
3. Try these queries:

```promql
# Total HTTP requests
http_requests_total

# Request duration
http_request_duration_seconds

# Workflow executions
workflow_executions_total

# External API calls
external_api_calls_total
```

### **8.4 Check logs in Grafana:**

1. Open http://localhost:3000
2. Go to **Explore**
3. Select **Loki** data source
4. Try this query:

```logql
{service="workflow-service"} |= "workflow"
```

---

## 📈 Step 9: Create Your First Dashboard

### **9.1 Import a basic dashboard:**

1. In Grafana, click **+ → Import**
2. I'll create a pre-built dashboard JSON for you (next artifact)

### **9.2 Or create manually:**

1. Click **+ → Dashboard**
2. Add Panel
3. Select **Prometheus** data source
4. Add this query:

```promql
rate(http_requests_total[5m])
```

5. Title: "HTTP Requests per Second"
6. Click **Apply**

---

## 🔍 Step 10: Query Examples

### **Prometheus Queries (PromQL):**

```promql
# HTTP request rate (requests per second)
rate(http_requests_total[5m])

# Average request duration
rate(http_request_duration_seconds_sum[5m]) / rate(http_request_duration_seconds_count[5m])

# Error rate (4xx and 5xx responses)
sum(rate(http_requests_total{status_class=~"4xx|5xx"}[5m]))

# Active workflows
active_workflows

# Workflow success rate
rate(workflow_executions_total{status="success"}[5m]) / rate(workflow_executions_total[5m]) * 100

# External API call duration (p95)
histogram_quantile(0.95, rate(external_api_call_duration_seconds_bucket[5m]))

# Rate limit usage
rate_limit_usage
```

### **Loki Queries (LogQL):**

```logql
# All logs from workflow service
{service="workflow-service"}

# Only error logs
{service="workflow-service"} |= "ERROR"

# Logs for a specific user
{service="workflow-service"} |= "userId" |= "user-123"

# Logs for a specific trace
{service="workflow-service"} | json | traceId="abc-123"

# Workflow progression logs
{service="workflow-service"} |= "workflow" |= "progress"

# Rate limit blocks
{service="workflow-service"} |= "rate_limit" |= "blocked"

# External API failures
{service="workflow-service"} |= "external" |= "error"
```

---

## 🎨 Step 11: Dashboards to Create

I recommend creating these dashboards:

### **1. Overview Dashboard:**
- Total requests (counter)
- Error rate (gauge)
- Average response time (graph)
- Active workflows (gauge)

### **2. Workflow Performance:**
- Workflow 1 vs Workflow 2 duration
- Success/failure breakdown
- Step-by-step timing

### **3. External Services:**
- OpenAI API calls (count, duration, errors)
- Backend 2 calls (count, retry attempts)
- Firestore operations

### **4. Rate Limiting:**
- User limit usage
- Daily limit usage
- Blocked requests over time

### **5. Errors & Validation:**
- Error breakdown by type
- Validation failures by check type
- Failed origins (auth errors)

---

## 🐛 Troubleshooting

### **Metrics not appearing in Prometheus:**

1. Check if Push Gateway is receiving metrics:
```bash
curl http://localhost:9091/metrics | grep http_requests_total
```

2. Check Firebase Functions logs:
```bash
firebase functions:log
```

3. Verify environment variable:
```bash
firebase functions:config:get
```

### **Logs not appearing in Loki:**

1. Check Loki is running:
```bash
docker-compose logs loki
```

2. For local testing, write logs to file:
```bash
mkdir -p logs
echo '{"timestamp":"2024-01-01T00:00:00Z","level":"INFO","message":"test"}' > logs/test.log
```

### **Grafana can't connect to data sources:**

1. Check Docker network:
```bash
docker network ls
docker network inspect monitoring
```

2. Restart services:
```bash
docker-compose restart grafana
```

---

## 🔐 Security Notes

**For local development (current setup):**
- ✅ No authentication required
- ✅ Services only accessible on localhost

**For production deployment:**
- ❌ Change Grafana admin password
- ❌ Enable authentication on Prometheus
- ❌ Use HTTPS/TLS
- ❌ Restrict network access
- ❌ Use secrets management for API keys

---

## 📊 Next Steps

1. ✅ **Create custom dashboards** for your specific needs
2. ✅ **Set up alerts** (when you need them)
3. ✅ **Deploy to GCP** when ready for production
4. ✅ **Add Backend 2** monitoring when it's ready

---

## 🆘 Need Help?

Common issues and solutions:

| Issue | Solution |
|-------|----------|
| Metrics not pushing | Check `PROMETHEUS_PUSH_GATEWAY_URL` |
| Logs not structured | Verify logger is using `functions.logger` |
| High memory usage | Reduce retention periods |
| Slow queries | Add more specific label filters |

---

## 📚 Resources

- [Prometheus Documentation](https://prometheus.io/docs/)
- [Grafana Documentation](https://grafana.com/docs/)
- [Loki Documentation](https://grafana.com/docs/loki/)
- [Firebase Functions Monitoring](https://firebase.google.com/docs/functions/monitoring)

---

**You're all set! 🎉**

Your monitoring stack is now running locally. Test it with some requests and explore the metrics and logs in Grafana!