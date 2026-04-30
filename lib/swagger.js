const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Finance API',
      version: '1.0.0',
      description: 'Семейный финансовый трекер — API документация',
      contact: {
        name: 'API Support',
      },
    },
    servers: [
      {
        url: 'http://localhost:5000',
        description: 'Development server',
      },
      {
        url: process.env.PRODUCTION_URL || 'https://api.example.com',
        description: 'Production server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
      schemas: {
        User: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            email: { type: 'string', format: 'email' },
            name: { type: 'string' },
            family_id: { type: 'integer', nullable: true },
          },
        },
        Transaction: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            user_id: { type: 'integer' },
            category_id: { type: 'integer' },
            amount: { type: 'number' },
            type: { type: 'string', enum: ['income', 'expense'] },
            date: { type: 'string', format: 'date-time' },
            comment: { type: 'string', nullable: true },
            is_private: { type: 'boolean' },
          },
        },
        Goal: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            name: { type: 'string' },
            target_amount: { type: 'number' },
            current_amount: { type: 'number' },
            deadline: { type: 'string', format: 'date-time', nullable: true },
          },
        },
        Wish: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            name: { type: 'string' },
            cost: { type: 'number' },
            saved_amount: { type: 'number' },
            priority: { type: 'integer' },
            status: { type: 'string', enum: ['active', 'completed'] },
          },
        },
        Error: {
          type: 'object',
          properties: {
            message: { type: 'string' },
            code: { type: 'string' },
          },
        },
      },
    },
    security: [{ bearerAuth: [] }],
  },
  apis: ['./routes/*.js'],
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = { swaggerSpec, swaggerJsdoc };
