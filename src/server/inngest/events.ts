import { z } from "zod";

export const eventsMap = {
  "test/hello.world": z.object({
    message: z.string(),
  }),
} as const;

export type CitadelEvents = typeof eventsMap;
