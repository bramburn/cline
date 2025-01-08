# Dependency Injection (DI) Infrastructure

## Overview
This directory contains the core Dependency Injection (DI) infrastructure for the Cline VSCode extension, utilizing InversifyJS and RxJS.

## Key Components

### `types.ts`
- Defines type symbols and interfaces for dependency injection
- Centralized management of service identifiers
- Provides core interfaces for services

### `container.ts`
- Implements a singleton DI container
- Provides utility methods for service binding and resolution
- Supports different service lifetimes (Singleton, Transient, Request)

### `rxjs-services.ts`
- Base classes for reactive services
- Implements state management with RxJS
- Provides error handling and utility functions

## Usage Examples

### Binding a Service
```typescript
import { DIContainer } from './container';
import { TYPES } from './types';
import { UserService } from '../services/UserService';

DIContainer.bind(TYPES.UserService, UserService);
```

### Resolving a Service
```typescript
const userService = DIContainer.resolve(TYPES.UserService);
```

## Best Practices
- Use `@injectable()` decorator for classes
- Always define interfaces for services
- Prefer constructor injection
- Use `DIContainer` for service management

## Dependencies
- InversifyJS
- RxJS
- reflect-metadata

## Troubleshooting
- Ensure `experimentalDecorators` and `emitDecoratorMetadata` are enabled in `tsconfig.json`
- Check that all services are properly decorated and bound

## Extension-Specific Considerations
- Services are bound during extension activation
- Use `TYPES` from `types.ts` for consistent service identification
- Leverage RxJS for reactive service interactions
