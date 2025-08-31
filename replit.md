# Overview

This is a React-based wand tracking application that uses computer vision and machine learning to track hand movements and create visual trails. The application captures camera input, detects hand positions using MediaPipe, and renders real-time trails on a canvas overlay. It features an Express.js backend with database support and a modern frontend built with React, TypeScript, and shadcn/ui components.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture
- **Framework**: React 18 with TypeScript and Vite for development and building
- **UI Components**: shadcn/ui component library built on Radix UI primitives
- **Styling**: Tailwind CSS with CSS variables for theming and design tokens
- **Routing**: Wouter for client-side routing (lightweight alternative to React Router)
- **State Management**: TanStack Query (React Query) for server state management
- **Computer Vision**: MediaPipe Hands for real-time hand tracking and gesture detection

## Backend Architecture
- **Framework**: Express.js with TypeScript for the REST API server
- **Database**: PostgreSQL with Drizzle ORM for type-safe database operations
- **Session Management**: Express sessions with PostgreSQL session storage
- **Build System**: ESBuild for production bundling, tsx for development

## Development Tooling
- **Type System**: Strict TypeScript configuration with path mapping
- **Development Server**: Vite with HMR and React plugin
- **Database Migrations**: Drizzle Kit for schema management and migrations
- **Code Quality**: ESLint and Prettier (implied by project structure)

## Key Features
- **Real-time Hand Tracking**: Uses MediaPipe to detect hand landmarks and track finger positions
- **Visual Trail Rendering**: Canvas-based trail system with opacity fade-out effects
- **Camera Integration**: WebRTC camera access with permission handling
- **Responsive UI**: Mobile-first design with dark theme support
- **Component Library**: Comprehensive UI components including sliders, buttons, cards, and overlays

## Data Storage
- **Primary Database**: PostgreSQL via Neon serverless database
- **ORM**: Drizzle ORM with type-safe queries and schema validation
- **Schema Management**: Centralized schema definitions in `/shared` directory
- **Validation**: Zod integration for runtime type checking and form validation

## Security & Authentication
- **Session Storage**: PostgreSQL-backed sessions using connect-pg-simple
- **User Management**: Basic user schema with username/password authentication
- **Type Safety**: Shared TypeScript interfaces between client and server

# External Dependencies

## Core Framework Dependencies
- **@neondatabase/serverless**: PostgreSQL serverless database connection
- **drizzle-orm**: Type-safe database ORM with PostgreSQL dialect
- **express**: Node.js web framework for REST API
- **react**: Frontend UI library with hooks
- **vite**: Modern build tool and development server

## UI and Design Dependencies
- **@radix-ui/***: Headless UI component primitives (30+ components)
- **tailwindcss**: Utility-first CSS framework
- **class-variance-authority**: Component variant management
- **clsx**: Conditional CSS class utility
- **lucide-react**: Icon library

## Development and Tooling
- **typescript**: Static type checking
- **@tanstack/react-query**: Server state management
- **wouter**: Lightweight client-side routing
- **date-fns**: Date manipulation utilities
- **nanoid**: Unique ID generation

## Computer Vision
- **MediaPipe Hands**: Google's hand tracking ML model (loaded via CDN)
- **Canvas API**: Native browser API for real-time drawing and trail rendering

## Build and Deployment
- **esbuild**: Fast JavaScript/TypeScript bundler for production
- **tsx**: TypeScript execution for development
- **drizzle-kit**: Database migration and schema management tool