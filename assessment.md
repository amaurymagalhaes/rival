Rival Assessment
Secure Blog Platform (Public + Private + Social Feed)

Objective
Build a production-ready blog platform with:

User authentication system
Private dashboard
Public blog URLs
Public feed
Like & comment system
Clean frontend and backend architecture

Advanced concepts such as async jobs and rate limiting are optional but recommended and will be considered bonus points.


Time Expectation
6--10 hours
Focus on architecture, correctness, and clean design over UI polish.


Required Stack
Backend
NestJS (latest stable)
TypeScript (strict mode)
PostgreSQL
Prisma ORM
Frontend
Next.js 15 (App Router)
TypeScript
Clean architecture
Proper authentication flow


Functional Requirements

Authentication System
Users must be able to:

Register
Login
Access protected dashboard routes

Requirements:

Password hashing (bcrypt)
JWT-based authentication
Guards for protected routes
Proper DTO validation
Secure error responses

Bonus: - Refresh tokens - Role-based system


Blog Management (Private Dashboard)
Authenticated users can:
Create Blog
POST /blogs
Edit Blog
PATCH /blogs/:id
Delete Blog
DELETE /blogs/:id

Fields: { title: string content: string isPublished: boolean }

Rules: - Only blog owner can modify - Proper validation - Proper status codes - Slug must be unique


Public Blog Access
GET /public/blogs/:slug

Requirements:

Only published blogs accessible
Proper 404 handling
Clean error responses


Public Feed (Required)
Create a public feed endpoint:

GET /public/feed

Return:

Paginated list of published blogs
Author basic info
Like count
Comment count
Publish date

Requirements:

Pagination required
Sorted by newest first
Avoid N+1 query problem
Optimized Prisma queries

Frontend route: /feed

Must include: - Loading state - Empty state - Pagination or infinite scroll


Like System (Optional)
Authenticated users can:

POST /blogs/:id/like DELETE /blogs/:id/like

Rules:

A user can like a post only once
Prevent duplicate likes (DB constraint required)
Must be authenticated
Return updated like count


Comment System (Optional)
Authenticated users can:

POST /blogs/:id/comments GET /blogs/:id/comments

Comment Body: { content: string }

Requirements:

Proper validation
Author info included in response
Sorted by newest first
Indexed by blogId
No page reload on frontend


Database Requirements (Prisma)
User
id
email (unique)
passwordHash
createdAt
Blog
id
userId (relation)
title
slug (unique)
content
summary (nullable)
isPublished
createdAt
updatedAt
Like
id
userId
blogId
createdAt

Constraint: - Unique (userId, blogId)
Comment
id
blogId
userId
content
createdAt

Indexes: - blogId - createdAt


Optional Advanced Concepts (Bonus Points)
🔹 Asynchronous Job Processing
When a blog is published:

Enqueue background job (Redis + BullMQ recommended)
Generate blog summary
Store summary
Log job status

Must not block HTTP response.
🔹 API Rate Limiting
Implement rate limiting for:

Public feed
Blog detail endpoints
Authentication endpoints

Return 429 on violation.
🔹 Structured Logging
Use structured logging (Pino or Winston).


🖥 Frontend Architecture Expectations
We expect strong frontend architecture, not just working UI.

Clean folder structure
Reusable components (BlogCard, CommentItem, LikeButton)
API abstraction layer
Proper authentication handling
Protected routes
Optimistic UI updates for likes (preferred)
Proper loading & error states
No unnecessary re-renders
Basic responsiveness


🔐 Security Expectations
Password hashing
JWT validation
Input validation
Proper status codes
Prevent duplicate likes
Prevent unauthorized edits
No sensitive data exposure


📦 Submission Instructions
1️⃣ Repository
Push to GitHub
Make repository PUBLIC
Maintain clean commit history
2️⃣ Deployment
Deploy your application:

Frontend: - Vercel (recommended)

Backend: - Railway / Render / Fly.io / or any preferred provider

Database: - Neon / Supabase / Railway / etc.
3️⃣ Submit
Provide:

Public GitHub repository link
Live deployed application URL
Updated README including:
Setup instructions
Architecture explanation
Tradeoffs made
What you would improve
How you'd scale to 1M users

As part of this project, please:
Visit https://cortexone.rival.io
Sign up for an account
Create a meaningful function of your choice
There are no restrictions on what you build — we encourage you to think creatively and design something that genuinely improves the platform (e.g., AI-powered tools, automation workflows, analytics, optimization utilities, etc.).
We are hiring engineers to help make this platform better, so we’re evaluating:
Product thinking
System design decisions
Practical usefulness
Code quality and structure



🎯 Evaluation Criteria
Category                               Weight



Backend Architecture                   25% Prisma & DB Modeling                   20% Frontend Architecture & UX             25% Security Practices                     15% Feed / Like / Comment Implementation   10% Advanced Concepts (Bonus)              5%

Advanced features (async jobs, rate limiting, structured logging) are optional but will positively impact evaluation.
