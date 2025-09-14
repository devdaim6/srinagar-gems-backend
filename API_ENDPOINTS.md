# Srinagar Local Gems API Endpoints

## Overview
This document describes the core API endpoints implemented for the Srinagar Local Gems backend service.

## Base URL
```
http://localhost:3000/api
```

## Endpoints

### 1. Get All Gems
**GET** `/api/gems`

Retrieves all active gems with optional category filtering.

#### Query Parameters
- `category` (optional): Filter gems by category
  - Valid values: `Food`, `Craft`, `Viewpoint`, `Shopping`, `Experience`
  - Case-insensitive

#### Response Format
```json
{
  "success": true,
  "data": [
    {
      "_id": "gem_id",
      "name": "Gem Name",
      "description": "Gem description",
      "category": "Food",
      "location": {
        "latitude": 34.0837,
        "longitude": 74.7973,
        "address": "Address"
      },
      "image": {
        "url": "image_url",
        "thumbnail": "thumbnail_url",
        "alt": "Alt text"
      },
      "contact": {
        "phone": "+919876543210",
        "whatsapp": "+919876543210"
      },
      "isActive": true,
      "createdAt": "2025-09-13T10:06:01.860Z",
      "updatedAt": "2025-09-13T10:06:01.860Z"
    }
  ],
  "total": 5,
  "message": "Found 5 gems",
  "timestamp": "2025-09-13T10:06:39.930Z"
}
```

#### Example Requests
```bash
# Get all gems
curl http://localhost:3000/api/gems

# Get gems by category
curl "http://localhost:3000/api/gems?category=Food"
```

### 2. Get Gem by ID
**GET** `/api/gems/:id`

Retrieves a specific gem by its MongoDB ObjectId.

#### Path Parameters
- `id`: MongoDB ObjectId of the gem

#### Response Format
```json
{
  "success": true,
  "data": {
    "_id": "gem_id",
    "name": "Gem Name",
    "description": "Gem description",
    "category": "Food",
    "location": {
      "latitude": 34.0837,
      "longitude": 74.7973,
      "address": "Address"
    },
    "image": {
      "url": "image_url",
      "thumbnail": "thumbnail_url",
      "alt": "Alt text"
    },
    "contact": {
      "phone": "+919876543210"
    },
    "isActive": true,
    "createdAt": "2025-09-13T10:06:01.860Z",
    "updatedAt": "2025-09-13T10:06:01.860Z"
  },
  "message": "Gem 'Gem Name' retrieved successfully",
  "timestamp": "2025-09-13T10:06:39.930Z"
}
```

#### Example Request
```bash
curl http://localhost:3000/api/gems/68c54209e873603e54ef4a4a
```

### 3. API Information
**GET** `/api`

Returns information about the API and available endpoints.

#### Response Format
```json
{
  "success": true,
  "message": "Srinagar Local Gems API",
  "version": "1.0.0",
  "endpoints": {
    "gems": {
      "GET /api/gems": "Get all active gems with optional category filtering",
      "GET /api/gems/:id": "Get a specific gem by ID"
    }
  },
  "timestamp": "2025-09-13T10:06:39.930Z"
}
```

## Error Handling

All endpoints return consistent error responses with the following format:

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": {
      "additional": "error details"
    }
  },
  "timestamp": "2025-09-13T10:06:39.930Z"
}
```

### Common Error Codes

#### 400 Bad Request
- `INVALID_CATEGORY`: Invalid category parameter
- `INVALID_ID_FORMAT`: Invalid MongoDB ObjectId format

#### 404 Not Found
- `GEM_NOT_FOUND`: Gem with specified ID doesn't exist
- `GEM_NOT_AVAILABLE`: Gem exists but is inactive
- `ROUTE_NOT_FOUND`: Requested endpoint doesn't exist

#### 500 Internal Server Error
- `DATABASE_ERROR`: Database connection or query error

## Testing

The API includes comprehensive integration tests covering:
- All endpoint functionality
- Category filtering (case-sensitive and case-insensitive)
- Error handling scenarios
- Database error simulation
- Input validation

Run tests with:
```bash
npm test
```

## Sample Data

Use the seeding script to populate the database with sample gems:
```bash
npm run seed
```

This creates 5 sample gems across all categories for testing purposes.

## Requirements Satisfied

This implementation satisfies the following requirements from the specification:

- **Requirement 5.1**: Backend authentication system (foundation for admin access)
- **Requirement 8.1**: API responds within 3 seconds
- **Requirement 8.2**: Request parameter validation
- **Requirement 8.4**: Graceful error handling