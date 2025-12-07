# E-commerce Service

A simple, primitive e-commerce service built with Express.js, designed to simulate the e-commerce system in a chain of microservices.

## API Endpoints

### Products

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/products` | Get all products |
| GET | `/api/products/:id` | Get single product by ID |

### Orders

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/orders/create` | Create a new order |
| GET | `/api/orders/:id` | Get order status (for polling) |
| GET | `/api/orders` | List all orders |

### Health

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Health check endpoint |

## Request/Response Examples

### Get Products
```bash
curl http://localhost:3000/api/products
```

### Create Order
```bash
curl -X POST http://localhost:3000/api/orders/create \
  -H "Content-Type: application/json" \
  -d '{
    "items": [
      { "productId": "prod-001", "quantity": 2 },
      { "productId": "prod-003", "quantity": 1 }
    ],
    "customer": {
      "name": "John Doe",
      "email": "john@example.com",
      "address": "123 Main St, City",
      "phone": "+1234567890"
    }
  }'
```

### Get Order Status
```bash
curl http://localhost:3000/api/orders/{order-id}
```

## Running with Docker

### Build and Run
```bash
# Build the image
docker build -t ecommerce-service .

# Run the container
docker run -p 3000:3000 ecommerce-service
```

### Using Docker Compose
```bash
# Start the service
docker-compose up -d

# View logs
docker-compose logs -f

# Stop the service
docker-compose down
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| PORT | 3000 | Server port |
| OMS_URL | http://localhost:4000 | OMS service URL |
| NODE_ENV | production | Node environment |

## Integration with OMS

This service is designed to integrate with an Order Management System (OMS):

1. **Order Creation Flow:**
   - E-commerce receives order → Validates products → Creates order locally → Forwards to OMS

2. **Order Status Polling:**
   - Client polls `/api/orders/:id` → E-commerce fetches latest status from OMS → Returns combined data

## Network Configuration

When running with OMS in Docker, ensure both services are on the same network:

```yaml
# In docker-compose.yml
networks:
  ecommerce-network:
    external: true
```

## Local Development

```bash
# Install dependencies
npm install

# Start in development mode (with auto-reload)
npm run dev

# Start in production mode
npm start
```
