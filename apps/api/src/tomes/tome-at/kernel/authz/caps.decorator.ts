import { SetMetadata } from "@nestjs/common";

export const REQ_CAPS_KEY = "req_caps";
export const RequireCaps = (...caps: string[]) => SetMetadata(REQ_CAPS_KEY, caps);
