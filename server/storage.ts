/**
 * @deprecated
 * DEPRECATED: In-memory storage engine has been decommissioned.
 * The application has transitioned to PostgreSQL via Supabase and the Service/Repository layer:
 *
 * React -> API -> Service Layer (server/services/*) -> Supabase -> PostgreSQL
 *
 * The PostgreSQL database is the single authoritative source of truth.
 * This file is retained only as a deprecated reference stub.
 */

export class DeprecatedStorageEngine {
  constructor() {
    console.warn(
      'WARNING: DeprecatedStorageEngine was initialized. Core entities must be queried through PostgreSQL services in server/services/*.'
    );
  }
}

export const storage = new DeprecatedStorageEngine();
