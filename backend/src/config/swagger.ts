import swaggerJsdoc from 'swagger-jsdoc';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'TXAI Support API',
      version: '1.0.0',
      description: 'API documentation for TXAI Support system - A helpdesk management platform with WhatsApp integration',
      contact: {
        name: 'TXAI Support Team',
        url: 'https://github.com/yourusername/txai-support',
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT',
      },
    },
    servers: [
      {
        url: 'http://localhost:3001',
        description: 'Development server',
      },
      {
        url: 'https://api.txai.com',
        description: 'Production server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Enter your JWT token in the format: Bearer <token>',
        },
      },
      schemas: {
        User: {
          type: 'object',
          properties: {
            id: {
              type: 'integer',
              description: 'User ID',
            },
            name: {
              type: 'string',
              description: 'User full name',
            },
            email: {
              type: 'string',
              format: 'email',
              description: 'User email address',
            },
            phone: {
              type: 'string',
              description: 'User phone number',
            },
            profile: {
              type: 'string',
              enum: ['USER', 'ADMIN'],
              description: 'User role',
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: 'Creation timestamp',
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
              description: 'Last update timestamp',
            },
          },
        },
        Call: {
          type: 'object',
          properties: {
            id: {
              type: 'integer',
              description: 'Call ID',
            },
            title: {
              type: 'string',
              description: 'Call title/location',
            },
            description: {
              type: 'string',
              description: 'Detailed description',
            },
            status: {
              type: 'string',
              enum: ['OPEN', 'IN_PROGRESS', 'CLOSED'],
              description: 'Call status',
            },
            priority: {
              type: 'string',
              enum: ['LOW', 'MEDIUM', 'HIGH'],
              description: 'Call priority',
            },
            userId: {
              type: 'integer',
              description: 'ID of user who created the call',
            },
            user: {
              $ref: '#/components/schemas/User',
            },
            images: {
              type: 'array',
              items: {
                $ref: '#/components/schemas/CallImage',
              },
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: 'Creation timestamp',
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
              description: 'Last update timestamp',
            },
          },
        },
        CallImage: {
          type: 'object',
          properties: {
            id: {
              type: 'integer',
              description: 'Image ID',
            },
            filename: {
              type: 'string',
              description: 'Original filename',
            },
            path: {
              type: 'string',
              description: 'Storage path',
            },
            callId: {
              type: 'integer',
              description: 'Associated call ID',
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: 'Upload timestamp',
            },
          },
        },
        WhatsAppStatus: {
          type: 'object',
          properties: {
            connected: {
              type: 'boolean',
              description: 'Connection status',
            },
            qrCode: {
              type: 'string',
              nullable: true,
              description: 'QR code for authentication (base64)',
            },
            phone: {
              type: 'string',
              nullable: true,
              description: 'Connected phone number',
            },
          },
        },
        Error: {
          type: 'object',
          properties: {
            message: {
              type: 'string',
              description: 'Error message',
            },
            error: {
              type: 'string',
              description: 'Error details',
            },
          },
        },
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
  },
  apis: ['./src/routes/*.ts', './src/controllers/*.ts'],
};

export const swaggerSpec = swaggerJsdoc(options);

