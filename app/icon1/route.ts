import { appIcon } from "@/lib/app-icon";
export const dynamic = "force-static";
export async function GET() { return appIcon(192); }
