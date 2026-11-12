// Baked into the client bundle for repository-based GitHub Pages hosting.
export const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
export function assetPath(path: string) { return `${BASE_PATH}${path}`; }
