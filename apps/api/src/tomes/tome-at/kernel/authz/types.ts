/**
 * AuthZ core types (Tome @).
 *
 * Doctrine:
 * - capabilities are strings (scoped, composable)
 * - guards/decorators operate on arrays of caps
 *
 * This file is a tiny shared contract to avoid circular imports.
 */

/** Capability identifier. Example: "cases:read", "media:submit" */
export type Cap = string;

/** Optional role identifier (kept generic; RBAC can be layered on top of caps). */
export type Role = string;

/**
 * Shape expected on req.user after authentication.
 * JwtAuthGuard (or equivalent) should attach this object.
 */
export interface AuthUser {
  sub?: string;
  email?: string;
  caps?: Cap[];
  roles?: Role[];
}
