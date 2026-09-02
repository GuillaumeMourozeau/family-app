// Automatic @types/* inclusion isn't picking up @types/jest's ambient
// globals (describe/it/expect) for this project's tsconfig, so pull them
// in explicitly rather than widening compilerOptions.types project-wide.
/// <reference types="jest" />
