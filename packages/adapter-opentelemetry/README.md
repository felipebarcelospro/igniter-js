# @igniter-js/adapter-opentelemetry

OpenTelemetry adapter for Igniter.js telemetry system. Provides production-ready observability with distributed tracing, metrics, and events.

## 🚀 Features

- **Distributed Tracing** - Full request tracing with OpenTelemetry
- **Metrics Collection** - Counters, histograms, gauges, and timers
- **Multiple Exporters** - Console, Jaeger, OTLP, Prometheus support
- **Auto-Instrumentation** - HTTP, filesystem, DNS instrumentation
- **Graceful Degradation** - Continues working even if telemetry fails
- **Zero Breaking Changes** - Optional telemetry integration
- **Type-Safe** - Full TypeScript support with inference

## 📦 Installation

```bash
npm install @igniter-js/adapter-opentelemetry

# Peer dependencies (install the exporters you need)
npm install @opentelemetry/api @opentelemetry/sdk-node

# Optional exporters
npm install @opentelemetry/exporter-jaeger          # For Jaeger
npm install @opentelemetry/exporter-prometheus     # For Prometheus
npm install @opentelemetry/exporter-otlp-http      # For OTLP
```

## 🎯 Quick Start

### Development Setup

```typescript
import { Igniter } from '@igniter-js/core';
import { createSimpleOpenTelemetryAdapter } from '@igniter-js/adapter-opentelemetry';

// Simple setup for development
const telemetry = await createSimpleOpenTelemetryAdapter('my-api');

const igniter = Igniter
  .context<{ db: Database }>()
  .telemetry(telemetry)
  .create();

export const router = igniter.router({
  getUser: igniter.query({
    handler: async ({ context, input }) => {
      // Telemetry is automatically injected
      const span = context.span; // Current HTTP span
      const childSpan = context.telemetry.startSpan('db.query');
      
      try {
        const user = await context.db.user.findUnique({ where: { id: input.id } });
        childSpan.setTag('user.found', !!user);
        return user;
      } finally {
        childSpan.finish();
      }
    }
  })
});
```

### Production Setup with Jaeger

```typescript
import { createProductionOpenTelemetryAdapter } from '@igniter-js/adapter-opentelemetry';

const telemetry = await createProductionOpenTelemetryAdapter({
  serviceName: 'my-api',
  serviceVersion: '1.0.0',
  jaegerEndpoint: 'http://jaeger:14268/api/traces',
  sampleRate: 0.1, // 10% sampling for production
  resource: {
    'service.instance.id': process.env.INSTANCE_ID || 'unknown',
    'deployment.environment': 'production'
  }
});

const igniter = Igniter
  .context<MyContext>()
  .telemetry(telemetry)
  .create();
```

### Advanced Configuration

```typescript
import { createOpenTelemetryAdapter } from '@igniter-js/adapter-opentelemetry';

const telemetry = await createOpenTelemetryAdapter({
  config: {
    serviceName: 'my-api',
    serviceVersion: '1.0.0',
    environment: 'production',
    
    // Multiple exporters
    exporters: ['jaeger', 'prometheus', 'otlp'],
    
    // Jaeger configuration
    jaeger: {
      endpoint: 'http://jaeger:14268/api/traces'
    },
    
    // OTLP configuration  
    otlp: {
      endpoint: 'http://otel-collector:4318/v1/traces',
      headers: {
        'Authorization': 'Bearer ' + process.env.OTEL_TOKEN
      }
    },
    
    // Prometheus configuration
    prometheus: {
      port: 9090,
      endpoint: '/metrics'
    },
    
    // Sampling and features
    sampleRate: 0.05, // 5% sampling
    enableTracing: true,
    enableMetrics: true,
    enableEvents: true,
    
    // Auto-instrumentation
    instrumentation: {
      http: true,
      fs: false,
      dns: false
    },
    
    // Resource attributes
    resource: {
      'service.instance.id': process.env.HOSTNAME,
      'deployment.environment': process.env.NODE_ENV,
      'service.namespace': 'my-company'
    }
  },
  
  // Initialization options
  autoInit: true,
  shutdownTimeout: 10000
});
```

## 📊 Usage Examples

### Manual Tracing

```typescript
export const complexOperation = igniter.query({
  handler: async ({ context }) => {
    const span = context.telemetry.startSpan('complex.operation');
    span.setTag('operation.type', 'data-processing');
    
    try {
      // Database operation
      const dbSpan = span.child('db.query');
      const users = await context.db.user.findMany();
      dbSpan.setTag('users.count', users.length);
      dbSpan.finish();
      
      // External API call
      const apiSpan = span.child('api.call');
      const enrichedUsers = await enrichUsers(users);
      apiSpan.setTag('api.success', true);
      apiSpan.finish();
      
      return enrichedUsers;
    } catch (error) {
      span.setError(error);
      throw error;
    } finally {
      span.finish();
    }
  }
});
```

### Metrics Collection

```typescript
export const trackingHandler = igniter.query({
  handler: async ({ context }) => {
    // Counters
    context.telemetry.increment('api.requests.total', 1, {
      method: 'GET',
      endpoint: '/users'
    });
    
    // Histograms
    context.telemetry.histogram('request.size.bytes', requestSize, {
      method: 'POST'
    });
    
    // Gauges
    context.telemetry.gauge('active.connections', getActiveConnections());
    
    // Timers
    const timer = context.telemetry.timer('operation.duration', {
      operation: 'user.create'
    });
    
    try {
      const result = await performOperation();
      return result;
    } finally {
      timer.finish({ success: 'true' });
    }
  }
});
```

### Events and Logging

```typescript
export const auditHandler = igniter.mutation({
  handler: async ({ context, input }) => {
    // Record structured events
    context.telemetry.event('user.action', {
      userId: input.userId,
      action: 'profile.update',
      timestamp: new Date().toISOString(),
      metadata: input.changes
    });
    
    const result = await updateUserProfile(input);
    
    context.telemetry.event('user.action.completed', {
      userId: input.userId,
      action: 'profile.update',
      success: true,
      duration: Date.now() - startTime
    });
    
    return result;
  }
});
```

## 🔧 Configuration Options

### OpenTelemetryConfig

```typescript
interface OpenTelemetryConfig {
  // Required
  serviceName: string;
  
  // Optional
  serviceVersion?: string;
  environment?: 'development' | 'staging' | 'production';
  
  // Features
  enableTracing?: boolean;     // Default: true
  enableMetrics?: boolean;     // Default: true  
  enableEvents?: boolean;      // Default: true
  sampleRate?: number;         // Default: 1.0 (0-1)
  
  // Exporters
  exporters?: ('console' | 'jaeger' | 'otlp' | 'prometheus')[];
  
  // Exporter configurations
  jaeger?: {
    endpoint?: string;         // Default: http://localhost:14268/api/traces
    serviceName?: string;
  };
  
  otlp?: {
    endpoint?: string;         // Default: http://localhost:4318/v1/traces
    headers?: Record<string, string>;
  };
  
  prometheus?: {
    endpoint?: string;         // Default: /metrics
    port?: number;            // Default: 9090
  };
  
  // Auto-instrumentation
  instrumentation?: {
    http?: boolean;           // Default: true
    fs?: boolean;            // Default: false
    dns?: boolean;           // Default: false
  };
  
  // Resource attributes (added to all telemetry)
  resource?: Record<string, string>;
  
  // Global tags (added to all metrics)
  tags?: Record<string, string>;
}
```

## 🐳 Docker Setup

### Jaeger All-in-One

```yaml
# docker-compose.yml
version: '3.8'
services:
  jaeger:
    image: jaegertracing/all-in-one:latest
    ports:
      - "16686:16686"    # Jaeger UI
      - "14268:14268"    # Jaeger collector
    environment:
      - COLLECTOR_OTLP_ENABLED=true
      
  my-api:
    build: .
    environment:
      - JAEGER_ENDPOINT=http://jaeger:14268/api/traces
    depends_on:
      - jaeger
```

### OpenTelemetry Collector

```yaml
# docker-compose.yml
version: '3.8'
services:
  otel-collector:
    image: otel/opentelemetry-collector:latest
    command: ["--config=/etc/otel-collector-config.yaml"]
    volumes:
      - ./otel-collector-config.yaml:/etc/otel-collector-config.yaml
    ports:
      - "4317:4317"   # OTLP gRPC receiver
      - "4318:4318"   # OTLP HTTP receiver
      
  my-api:
    build: .
    environment:
      - OTLP_ENDPOINT=http://otel-collector:4318/v1/traces
    depends_on:
      - otel-collector
```

## 🚨 Error Handling

The adapter is designed for graceful degradation:

```typescript
// Telemetry failures won't break your application
const telemetry = await createOpenTelemetryAdapter({
  config: {
    serviceName: 'my-api',
    exporters: ['jaeger'], // Even if Jaeger is down
  }
});

// Your API continues working normally
// Telemetry operations fail silently with console warnings
```

## 🔍 Troubleshooting

### Common Issues

1. **Missing peer dependencies**
   ```bash
   npm install @opentelemetry/api @opentelemetry/sdk-node
   ```

2. **Jaeger connection failed**
   ```typescript
   // Check if Jaeger is running
   docker run -d --name jaeger \
     -p 16686:16686 \
     -p 14268:14268 \
     jaegertracing/all-in-one:latest
   ```

3. **High memory usage**
   ```typescript
   // Reduce sampling in production
   const telemetry = await createOpenTelemetryAdapter({
     config: {
       serviceName: 'my-api',
       sampleRate: 0.01 // 1% sampling
     }
   });
   ```

### Debug Mode

```typescript
// Enable debug logging
process.env.OTEL_LOG_LEVEL = 'debug';

const telemetry = await createOpenTelemetryAdapter({
  config: {
    serviceName: 'my-api',
    exporters: ['console'] // See all telemetry in console
  }
});
```

## 📚 Learn More

- [OpenTelemetry JavaScript Documentation](https://opentelemetry.io/docs/instrumentation/js/)
- [Jaeger Documentation](https://www.jaegertracing.io/docs/)
- [Igniter.js Core Documentation](../core/README.md)

## 🤝 Contributing

Contributions are welcome! Please read our [Contributing Guide](../../CONTRIBUTING.md) for details.

## 📄 License

MIT License - see [LICENSE](../../LICENSE) for details. 