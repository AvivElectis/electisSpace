# API Reference

**electisSpace v1.0.2**

Reference documentation for the SoluM AIMS API integration used by electisSpace.

---

## Table of Contents

1. [Overview](#overview)
2. [Authentication](#authentication)
3. [Endpoints](#endpoints)
4. [Data Models](#data-models)
5. [Error Handling](#error-handling)
6. [Rate Limiting](#rate-limiting)

---

## Overview

electisSpace integrates with the SoluM AIMS (AIoT IoT Management System) API to manage Electronic Shelf Labels (ESL). This document describes the API endpoints and data formats used.

### Base URL

```
https://{server}/api/v2
```

### API Version

electisSpace v1.0.2 uses SoluM AIMS API v2.

---

## Authentication

### Basic Authentication

All API requests use HTTP Basic Authentication:

```http
Authorization: Basic {base64(username:password)}
```

### Request Headers

```http
Content-Type: application/json
Accept: application/json
Authorization: Basic {credentials}
```

---

## Endpoints

### Store Summary

Get store information and label statistics.

```http
GET /store/{storeId}/summary
```

**Response:**
```json
{
  "storeId": "100",
  "storeName": "Main Store",
  "labelCount": 500,
  "activeLabels": 485,
  "offlineLabels": 15
}
```

**Used By:**
- Dashboard statistics
- Connection testing

---

### Fetch Articles

Retrieve articles (labels) from the store.

```http
GET /store/{storeId}/articles
```

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `page` | number | Page number (0-indexed) |
| `size` | number | Items per page (default: 100) |
| `sort` | string | Sort field and direction |

**Response:**
```json
{
  "content": [
    {
      "articleId": "001",
      "articleName": "Product Name",
      "data1": "Category",
      "data2": "Price",
      "data3": "Stock",
      "data4": "Location",
      "data5": "Notes",
      "nfcUrl": "https://example.com/product/001"
    }
  ],
  "totalElements": 500,
  "totalPages": 5,
  "size": 100,
  "number": 0
}
```

**Used By:**
- Spaces view
- People Manager (Sync from AIMS)

---

### Push Articles

Send articles to AIMS (create or update).

```http
POST /store/{storeId}/articles
```

**Request Body:**
```json
[
  {
    "articleId": "001",
    "articleName": "Updated Name",
    "data1": "New Data 1",
    "data2": "New Data 2",
    "data3": "New Data 3",
    "data4": "New Data 4",
    "data5": "New Data 5",
    "nfcUrl": "https://example.com/updated"
  }
]
```

**Response:**
```json
{
  "success": true,
  "processed": 1,
  "failed": 0,
  "errors": []
}
```

**Used By:**
- Sync to AIMS
- People Manager (Send to AIMS)
- Space updates

---

### Delete Articles

Remove articles from the store.

```http
DELETE /store/{storeId}/articles
```

**Request Body:**
```json
{
  "articleIds": ["001", "002", "003"]
}
```

**Response:**
```json
{
  "success": true,
  "deleted": 3
}
```

---

### Get Single Article

Retrieve a specific article by ID.

```http
GET /store/{storeId}/articles/{articleId}
```

**Response:**
```json
{
  "articleId": "001",
  "articleName": "Product Name",
  "data1": "Category",
  "data2": "Price",
  "data3": "Stock",
  "data4": "Location",
  "data5": "Notes",
  "nfcUrl": "https://example.com/product/001",
  "lastUpdated": "2024-12-29T12:00:00Z"
}
```

---

## Data Models

### Article (Space/Person)

The core data model for ESL content.

```typescript
interface Article {
  articleId: string;      // Unique identifier (max 50 chars)
  articleName: string;    // Display name (max 100 chars)
  data1?: string;         // Custom field 1 (max 100 chars)
  data2?: string;         // Custom field 2 (max 100 chars)
  data3?: string;         // Custom field 3 (max 100 chars)
  data4?: string;         // Custom field 4 (max 100 chars)
  data5?: string;         // Custom field 5 (max 100 chars)
  nfcUrl?: string;        // NFC URL link (max 500 chars)
}
```

### Store Summary

Store information model.

```typescript
interface StoreSummary {
  storeId: string;
  storeName: string;
  labelCount: number;
  activeLabels: number;
  offlineLabels: number;
}
```

### Paginated Response

Standard pagination wrapper.

```typescript
interface PagedResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
}
```

### Sync Response

Response from push operations.

```typescript
interface SyncResponse {
  success: boolean;
  processed: number;
  failed: number;
  errors: SyncError[];
}

interface SyncError {
  articleId: string;
  message: string;
  code: string;
}
```

---

## Error Handling

### HTTP Status Codes

| Code | Meaning | Action |
|------|---------|--------|
| 200 | Success | Request completed |
| 201 | Created | Resource created |
| 400 | Bad Request | Check request format |
| 401 | Unauthorized | Check credentials |
| 403 | Forbidden | Check permissions |
| 404 | Not Found | Check endpoint/ID |
| 429 | Too Many Requests | Reduce request rate |
| 500 | Server Error | Contact AIMS admin |

### Error Response Format

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid article ID format",
    "details": {
      "field": "articleId",
      "value": "invalid id!",
      "constraint": "alphanumeric only"
    }
  }
}
```

### Common Error Codes

| Code | Description |
|------|-------------|
| `AUTH_FAILED` | Authentication failed |
| `INVALID_STORE` | Store ID not found |
| `VALIDATION_ERROR` | Data validation failed |
| `DUPLICATE_ID` | Article ID already exists |
| `RATE_LIMITED` | Too many requests |
| `SERVER_ERROR` | Internal server error |

---

## Rate Limiting

### Default Limits

| Endpoint | Rate Limit |
|----------|------------|
| GET requests | 100/minute |
| POST requests | 50/minute |
| DELETE requests | 20/minute |

### Handling Rate Limits

When rate limited, the API returns:

```http
HTTP/1.1 429 Too Many Requests
Retry-After: 60
```

electisSpace automatically:
1. Detects rate limiting
2. Waits for retry period
3. Retries the request
4. Notifies user if persistent

### Best Practices

1. Use batch operations when possible
2. Implement exponential backoff
3. Cache responses when appropriate
4. Use pagination for large datasets

---

## Integration Examples

### Fetching All Articles

```typescript
async function fetchAllArticles(storeId: string): Promise<Article[]> {
  const articles: Article[] = [];
  let page = 0;
  let hasMore = true;

  while (hasMore) {
    const response = await fetch(
      `${baseUrl}/store/${storeId}/articles?page=${page}&size=100`
    );
    const data = await response.json();
    
    articles.push(...data.content);
    hasMore = page < data.totalPages - 1;
    page++;
  }

  return articles;
}
```

### Pushing Articles in Batches

```typescript
async function pushArticles(
  storeId: string, 
  articles: Article[]
): Promise<SyncResponse> {
  const batchSize = 100;
  const results: SyncResponse = {
    success: true,
    processed: 0,
    failed: 0,
    errors: []
  };

  for (let i = 0; i < articles.length; i += batchSize) {
    const batch = articles.slice(i, i + batchSize);
    const response = await fetch(
      `${baseUrl}/store/${storeId}/articles`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(batch)
      }
    );
    
    const data = await response.json();
    results.processed += data.processed;
    results.failed += data.failed;
    results.errors.push(...data.errors);
  }

  results.success = results.failed === 0;
  return results;
}
```

---

## API Changelog

### v2 (Current)
- Pagination support
- Batch operations
- Enhanced error responses
- Rate limiting

### v1 (Deprecated)
- Basic CRUD operations
- Single item operations only
- Limited error information

---

**electisSpace** - ESL Management System  
© 2025 Aviv Electis
