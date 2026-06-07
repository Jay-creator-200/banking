# Server Actions Directory

This directory contains Next.js Server Actions used for backend mutations directly invoked from client-side or server-side components.

All server actions must follow strict transaction controls and role-based permissions:
1. Validate input using Zod schemas.
2. Verify user session and permissions.
3. Wrap mutations in Mongoose database transactions when performing multi-collection operations.
4. Return standardized responses using the API Response wrapper (`src/utils/api-response.js`).
