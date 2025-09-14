# Srinagar Local Gems - Backend API

Node.js backend API for managing curated local gems data and serving the mobile application.

## Features

- 🔐 JWT-based admin authentication
- 📊 RESTful API for gem management
- 🗄️ MongoDB database integration
- 🖼️ Image upload and management
- 🛡️ Security middleware and rate limiting
- 📝 Comprehensive API documentation

## Project Structure

```
src/
├── server.js             # Application entry point
├── config/               # Configuration files
├── controllers/          # Request handlers
├── models/              # Database models
├── routes/              # API route definitions
├── middleware/          # Custom middleware
├── services/            # Business logic services
└── utils/               # Utility functions
```

## Getting Started

### Prerequisites
- Node.js 18.x or higher
- MongoDB (local or cloud instance)
- npm or yarn

### Installation

1. Install dependencies:
```bash
npm install
```

2. Configure environment:
```bash
cp .env.example .env
# Edit .env with your configuration
```

3. Start development server:
```bash
npm run dev
```

## Environment Variables

```env
# Server Configuration
PORT=3000
NODE_ENV=development

# Database Configuration
MONGODB_URI=mongodb://localhost:27017/srinagar_gems

# JWT Configuration
JWT_SECRET=your_jwt_secret_key_here
JWT_EXPIRES_IN=24h

# Image Storage Configuration
UPLOAD_PATH=uploads/
MAX_FILE_SIZE=5242880

# API Configuration
API_RATE_LIMIT=100
```

## API Endpoints

### Health Check
- `GET /health` - Server health status

### Gems Management
- `GET /api/gems` - Get all gems (with optional category filtering)
- `GET /api/gems/:id` - Get specific gem details
- `POST /api/gems` - Create new gem (admin only)
- `PUT /api/gems/:id` - Update gem (admin only)
- `DELETE /api/gems/:id` - Delete gem (admin only)

### Authentication
- `POST /api/auth/login` - Admin login
- `POST /api/auth/refresh` - Token refresh
- `POST /api/auth/logout` - Admin logout

## Dependencies

### Core Dependencies
- `express: ^4.18.2` - Web framework
- `mongoose: ^8.0.3` - MongoDB ODM
- `jsonwebtoken: ^9.0.2` - JWT authentication
- `bcryptjs: ^2.4.3` - Password hashing
- `multer: ^1.4.5-lts.1` - File upload handling
- `helmet: ^7.1.0` - Security middleware
- `cors: ^2.8.5` - Cross-origin resource sharing
- `morgan: ^1.10.0` - HTTP request logger
- `joi: ^17.11.0` - Input validation
- `express-rate-limit: ^7.1.5` - Rate limiting

### Development Dependencies
- `nodemon: ^3.0.2` - Development server
- `jest: ^29.7.0` - Testing framework
- `supertest: ^6.3.3` - HTTP testing
- `mongodb-memory-server: ^9.1.3` - In-memory MongoDB for testing

## Scripts

```bash
npm start          # Start production server
npm run dev        # Start development server with nodemon
npm test           # Run tests
npm run test:watch # Run tests in watch mode
```

## Testing

Run tests:
```bash
npm test
```

Run tests with coverage:
```bash
npm run test:coverage
```

## Security Features

- Helmet.js for security headers
- CORS configuration
- Rate limiting
- JWT token authentication
- Input validation and sanitization
- Environment-based configuration

## Database Schema

### Gem Model
```javascript
{
  name: String,
  description: String,
  category: String, // 'Food', 'Craft', 'Viewpoint', 'Shopping', 'Experience'
  location: {
    latitude: Number,
    longitude: Number,
    address: String
  },
  image: {
    url: String,
    thumbnail: String,
    alt: String
  },
  contact: {
    phone: String,
    whatsapp: String
  },
  isActive: Boolean,
  createdAt: Date,
  updatedAt: Date
}
```