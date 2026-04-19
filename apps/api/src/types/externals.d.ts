// Minimal type shims to keep the API build green on fresh installs.
// We intentionally avoid pulling extra @types packages during Phase A (P0 mécaniques).

declare module "bcryptjs";
declare module "passport-jwt";
