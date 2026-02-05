# Implementation Plan: WhatsApp Supplier Inventory Automation System

## Overview

This implementation plan converts the WhatsApp Supplier Inventory Automation System design into discrete coding tasks that integrate with the existing NestJS/TypeORM e-commerce platform. The tasks build incrementally from database setup through complete pipeline implementation, with comprehensive testing and validation at each stage.

## Tasks

- [x] 1. Set up database entities and core infrastructure
  - Create new database entities (Supplier, SupplierSubmission, ProcessingLog)
  - Set up database migrations for new tables
  - Configure TypeORM relationships with existing entities
  - Set up basic NestJS modules and dependency injection
  - _Requirements: 5.2, 6.1_

- [x] 2. Implement WhatsApp webhook handler
  - [x] 2.1 Create webhook endpoint and signature verification
    - Implement POST endpoint for WhatsApp webhook reception
    - Add webhook signature validation for security
    - Set up basic message parsing and routing
    - _Requirements: 1.1, 8.5_
  
  - [x]* 2.2 Write property test for webhook message processing
    - **Property 1: Message Processing Completeness**
    - **Validates: Requirements 1.1, 1.2, 1.3, 1.4, 5.3**
  
  - [x] 2.3 Implement media file download and storage
    - Add S3 or local file storage for images and PDFs
    - Implement secure file download from WhatsApp API
    - Add file type validation and security scanning
    - _Requirements: 1.2, 1.3, 1.4, 8.2, 8.3_
  
  - [x] 2.4 Add supplier authentication and message grouping
    - Implement supplier lookup and authentication
    - Add message grouping logic by supplier and timestamp
    - Set up rate limiting and access control
    - _Requirements: 1.5, 5.1, 5.3_
  
  - [x]* 2.5 Write property test for message grouping
    - **Property 2: Message Grouping Consistency**
    - **Validates: Requirements 1.5**

- [-] 3. Checkpoint - Ensure webhook processing works
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Implement AI processing engine
  - [x] 4.1 Set up OCR and text extraction services
    - Add Ollama service to docker-compose.yml (see docker-compose.ollama.yml for reference)
    - Configure Ollama to automatically pull Llama 3.2 1B model on startup
    - Set up Tesseract.js for client-side OCR processing
    - Create PDF text extraction using pdf-parse library
    - Configure environment variables for Ollama API endpoint (OLLAMA_BASE_URL)
    - Add health checks and proper service dependencies
    - _Requirements: 2.2, 2.3_
  
  - [x] 4.2 Create product data extraction logic
    - Implement rule-based extraction patterns for common product formats
    - Create LLM prompt templates for structured data extraction
    - Add confidence scoring based on extraction method and field completeness
    - Create product categorization using existing category mappings
    - _Requirements: 2.1, 2.5_
  
  - [x]* 4.3 Write property test for AI extraction coverage
    - **Property 3: AI Extraction Field Coverage**
    - **Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5**
  
  - [x] 4.4 Implement duplicate detection system
    - Create product similarity matching algorithm
    - Add duplicate flagging and merge suggestion logic
    - Integrate with existing product database for comparison
    - _Requirements: 2.6_
  
  - [x]* 4.5 Write property test for duplicate detection
    - **Property 4: Duplicate Detection Accuracy**
    - **Validates: Requirements 2.6**

- [x] 5. Implement human validation service
  - [x] 5.1 Create validation queue and admin interface
    - Build admin dashboard page at `/admin/validations` with queue listing
    - Implement validation item display with original content side-by-side with extracted data
    - Add filtering and sorting capabilities (by confidence, date, supplier, content type)
    - Create individual validation review page at `/admin/validations/[id]`
    - Add approval, rejection, and editing capabilities with form validation
    - Integrate with existing admin authentication and role-based access control
    - _Requirements: 3.1, 3.2, 3.3, 3.6, 3.7_
  
  - [x] 5.2 Add feedback collection and AI improvement
    - Implement structured feedback capture for rejected items with predefined categories
    - Create feedback categorization system (incorrect extraction, poor quality, missing info, etc.)
    - Add bulk approval and editing features for related submissions
    - Build feedback analytics dashboard for tracking common rejection reasons
    - Create learning mechanism integration points for future AI improvement
    - _Requirements: 3.4, 3.8, 3.9_
  
  - [ ]* 5.3 Write property test for validation workflow
    - **Property 5: Validation Workflow Completeness**
    - **Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5**
  
  - [x] 5.4 Implement validation completion triggers and notifications
    - Add inventory update triggers on approval with proper error handling
    - Implement notification system for stakeholders (email/SMS alerts)
    - Create workflow state management with audit logging
    - Add reminder notifications for pending validations (24-hour threshold)
    - Implement auto-approval system for high-confidence extractions from trusted suppliers
    - _Requirements: 3.5, 3.10, 3.11, 3.12_

- [x] 6. Checkpoint - Ensure validation system works
  - Ensure all tests pass, ask the user if questions arise.

- [x] 7. Implement inventory integration service
  - [x] 7.1 Create product and inventory update logic
    - Implement Product entity creation and updates
    - Add InventoryItem management with supplier tracking
    - Create ProductPrice management across countries
    - _Requirements: 4.1, 4.3_
  
  - [x] 7.2 Add categorization and segment assignment
    - Implement automatic category assignment logic
    - Add product segment classification (PREMIUM, MID_RANGE, REFURBISHED)
    - Create refurbished grade assignment (A, B, C, D)
    - _Requirements: 4.2, 4.4_
  
  - [ ]* 7.3 Write property test for inventory integration
    - **Property 6: Inventory Integration Consistency**
    - **Validates: Requirements 4.1, 4.2, 4.3, 4.4, 4.5**
  
  - [x] 7.4 Add stakeholder notification system
    - Implement notification service for inventory changes
    - Add email/SMS alerts for stock updates
    - Create dashboard updates for real-time visibility
    - _Requirements: 4.5_

- [x] 8. Implement supplier management service
  - [x] 8.1 Create supplier registration and profile management
    - Build supplier registration workflow
    - Implement supplier profile CRUD operations
    - Add performance metrics tracking
    - _Requirements: 5.1, 5.2, 5.4_
  
  - [x] 8.2 Add performance-based privilege management
    - Implement quality rating calculation
    - Add expedited processing for high-performing suppliers
    - Create supplier tier management system
    - _Requirements: 5.5_
  
  - [ ]* 8.3 Write property test for supplier management
    - **Property 7: Supplier Management Authentication**
    - **Validates: Requirements 5.1, 5.2, 5.4, 5.5**

- [ ] 9. Implement comprehensive audit and security systems
  - [ ] 9.1 Create comprehensive audit logging
    - Extend existing AuditLog entity with new actions
    - Implement audit logging for all system operations
    - Add audit trail queries and reporting
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_
  
  - [ ]* 9.2 Write property test for audit logging
    - **Property 8: Comprehensive Audit Logging**
    - **Validates: Requirements 6.1, 6.2, 6.3, 6.4, 6.5**
  
  - [ ] 9.3 Implement security processing pipeline
    - Add content sanitization and malware scanning
    - Implement data encryption for sensitive information
    - Add secure transmission protocols
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_
  
  - [ ]* 9.4 Write property test for security processing
    - **Property 10: Security Processing Universality**
    - **Validates: Requirements 8.1, 8.2, 8.3, 8.4, 8.5**

- [ ] 10. Implement error handling and recovery systems
  - [ ] 10.1 Create retry and recovery mechanisms
    - Implement exponential backoff for webhook retries
    - Add queue management for failed operations
    - Create database transaction rollback logic
    - _Requirements: 10.1, 10.2, 10.3_
  
  - [ ] 10.2 Add error escalation and monitoring
    - Implement critical error escalation system
    - Add health checks and monitoring endpoints
    - Create diagnostic information collection
    - _Requirements: 10.4, 10.5_
  
  - [ ]* 10.3 Write property test for error recovery
    - **Property 9: Error Recovery and Retry Logic**
    - **Validates: Requirements 7.4, 7.5, 10.1, 10.2, 10.3, 10.4, 10.5**

- [ ] 11. Implement template management system
  - [ ] 11.1 Create supplier template system
    - Build template creation and management interface
    - Implement template validation and feedback
    - Add template customization per supplier type
    - _Requirements: 9.1, 9.2, 9.3_
  
  - [ ] 11.2 Add template analytics and improvement
    - Implement submission pattern analysis
    - Add template improvement suggestions
    - Create template update notification system
    - _Requirements: 9.4, 9.5_
  
  - [ ]* 11.3 Write property test for template management
    - **Property 11: Template Management Lifecycle**
    - **Validates: Requirements 9.1, 9.2, 9.3, 9.4, 9.5**

- [ ] 12. Integration and end-to-end testing
  - [ ] 12.1 Wire all components together
    - Connect webhook handler to AI processing pipeline
    - Integrate validation service with inventory updates
    - Set up complete message flow from WhatsApp to inventory
    - _Requirements: All requirements_
  
  - [ ]* 12.2 Write comprehensive round-trip property test
    - **Property 12: Supplier Data Round-Trip Consistency**
    - **Validates: Requirements 1.1, 2.1, 3.5, 4.1, 6.4**
  
  - [ ]* 12.3 Write integration tests for complete pipeline
    - Test end-to-end supplier submission workflow
    - Test error scenarios and recovery mechanisms
    - Test concurrent processing and race conditions
    - _Requirements: All requirements_

- [ ] 13. Final checkpoint - Ensure all systems work together
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation throughout development
- Property tests validate universal correctness properties with 100+ iterations each
- Integration tests verify complete system behavior and error handling
- The implementation integrates seamlessly with existing NestJS/TypeORM architecture