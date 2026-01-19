/**
 * SoluM ESL API Service
 * 
 * This file now re-exports from the split service modules for backward compatibility.
 * The service has been split into focused modules:
 * - solum/authService.ts - Authentication, token management, URL building
 * - solum/articlesService.ts - Article CRUD operations
 * - solum/labelsService.ts - Label operations
 * - solum/storeService.ts - Store operations
 */

// Re-export all functions from the split modules
export * from './solum';

