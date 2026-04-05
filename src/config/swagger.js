import swaggerJsdoc from 'swagger-jsdoc';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'VQuest API',
      version: '1.0.0',
      description: 'VQuest Backend REST API Dokümantasyonu',
    },
    servers: [
      {
        url: 'https://vquest-backend-api.onrender.com',
        description: 'Production Server (Render)',
      },
      {
        url: 'http://localhost:3000',
        description: 'Geliştirme Sunucusu (Local)',
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
        Analysis: {
          type: 'object',
          properties: {
            _id: { type: 'string', example: '64f1a2b3c4d5e6f7a8b9c0d1' },
            analysisText: { type: 'string', example: 'Yazılım kategorisinde %75 başarı oranınız var...' },
          },
        },
        Notification: {
          type: 'object',
          properties: {
            _id: { type: 'string', example: '64f1a2b3c4d5e6f7a8b9c0d2' },
            message: { type: 'string', example: 'Yeni bir yarışma başladı!' },
            isRead: { type: 'boolean', example: false },
          },
        },
        Category: {
          type: 'object',
          properties: {
            _id: { type: 'string', example: '64f1a2b3c4d5e6f7a8b9c0d3' },
            name: { type: 'string', example: 'Yazılım Geliştirme' },
          },
        },
        Question: {
          type: 'object',
          properties: {
            _id: { type: 'string', example: '64f1a2b3c4d5e6f7a8b9c0d4' },
            text: { type: 'string', example: 'JavaScript\'de closure nedir?' },
            options: {
              type: 'array',
              items: { type: 'string' },
              example: ['Bir fonksiyon', 'İç içe fonksiyon kapsamı', 'Nesne yöntemi', 'Döngü yapısı'],
            },
            correctAnswer: { type: 'string', example: 'İç içe fonksiyon kapsamı' },
          },
        },
        Error: {
          type: 'object',
          properties: {
            message: { type: 'string', example: 'Bir hata oluştu' },
          },
        },
      },
    },
  },
  apis: ['./src/routes/*.js'],
};

const swaggerSpec = swaggerJsdoc(options);

export default swaggerSpec;
