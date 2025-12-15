const express = require('express');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const OMS_URL = process.env.OMS_URL || 'http://localhost:4000';

// Middleware
app.use(cors());
app.use(express.json());

// Load products from JSON file
const productsPath = path.join(__dirname, '../data/products.json');
let products = [];
try {
  products = JSON.parse(fs.readFileSync(productsPath, 'utf8'));
} catch (error) {
  console.error('Error loading products:', error);
  products = [];
}

// In-memory orders store (for local tracking before OMS sync)
const orders = new Map();

// ============================================
// API ROUTES
// ============================================

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'ecommerce', timestamp: new Date().toISOString() });
});

// GET /api/products - Get all products
app.get('/api/products', (req, res) => {
  res.json({
    success: true,
    data: products,
    total: products.length
  });
});

// GET /api/products/:id - Get single product
app.get('/api/products/:id', (req, res) => {
  const product = products.find(p => p.id === req.params.id);
  
  if (!product) {
    return res.status(404).json({
      success: false,
      error: 'Product not found'
    });
  }
  
  res.json({
    success: true,
    data: product
  });
});

// POST /api/orders/create - Create a new order
app.post('/api/orders/create', async (req, res) => {
  try {
    const { items, customer } = req.body;
    
    // Validate request
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Items array is required and cannot be empty'
      });
    }
    
    if (!customer || !customer.email || !customer.name) {
      return res.status(400).json({
        success: false,
        error: 'Customer information (name, email) is required'
      });
    }
    
    // Validate products and calculate total
    let totalAmount = 0;
    const orderItems = [];
    
    for (const item of items) {
      const product = products.find(p => p.id === item.productId);
      
      if (!product) {
        return res.status(400).json({
          success: false,
          error: `Product not found: ${item.productId}`
        });
      }
      
      if (item.quantity <= 0) {
        return res.status(400).json({
          success: false,
          error: `Invalid quantity for product: ${item.productId}`
        });
      }
      
      // Use server canonical product name and price to avoid client tampering
      const unitPrice = product.price;
      const subtotal = Math.round(unitPrice * item.quantity * 100) / 100;
      
      orderItems.push({
        productId: product.id,
        name: product.name,
        price: unitPrice,
        quantity: item.quantity,
        unitPrice,
        subtotal
      });
      
      totalAmount += subtotal;
    }
    
    // Create order object
    const orderId = uuidv4();
    const order = {
      id: orderId,
      items: orderItems,
      customer: {
        name: customer.name,
        email: customer.email,
        address: customer.address || null,
        phone: customer.phone || null
      },
      totalAmount: Math.round(totalAmount * 100) / 100,
      currency: 'USD',
      status: 'pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    // Store order locally
    orders.set(orderId, order);
    
    // (OMS forwarding kept commented as in your original code)
    // Try to forward to OMS (Step 3 in the chain)
    // try {
    //   const omsResponse = await fetch(`${OMS_URL}/api/orders/create`, {
    //     method: 'POST',
    //     headers: { 'Content-Type': 'application/json' },
    //     body: JSON.stringify(order)
    //   });
    //   ...
    // } catch (omsError) { ... }
    
    console.log(order)
    res.status(201).json({
      success: true,
      message: 'Order created successfully',
      data: order
    });
    
  } catch (error) {
    console.error('Error creating order:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});


// GET /api/orders/:id - Get order status (for polling)
app.get('/api/orders/:id', async (req, res) => {
  const orderId = req.params.id;
  let order = orders.get(orderId);
  
  if (!order) {
    return res.status(404).json({
      success: false,
      error: 'Order not found'
    });
  }
  
  // Try to get latest status from OMS
  try {
    const omsResponse = await fetch(`${OMS_URL}/api/orders/${orderId}`);
    if (omsResponse.ok) {
      const omsData = await omsResponse.json();
      if (omsData.data) {
        order.status = omsData.data.status || order.status;
        order.updatedAt = omsData.data.updatedAt || order.updatedAt;
        orders.set(orderId, order);
      }
    }
  } catch (omsError) {
    // OMS not available, return local order data
    console.warn('Could not reach OMS for status update');
  }
  
  res.json({
    success: true,
    data: order
  });
});

// GET /api/orders - List all orders (utility endpoint)
app.get('/api/orders', (req, res) => {
  const allOrders = Array.from(orders.values());
  res.json({
    success: true,
    data: allOrders,
    total: allOrders.length
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    error: 'Something went wrong!'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found'
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🛒 E-commerce Service running on port ${PORT}`);
  console.log(`📦 Loaded ${products.length} products`);
  console.log(`🔗 OMS URL: ${OMS_URL}`);
});
