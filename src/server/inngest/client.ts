import { EventSchemas, Inngest } from "inngest";
import { eventsMap } from "./events";

export const inngest = new Inngest({
  id: "citadel",
  schemas: new EventSchemas().fromSchema(eventsMap),
});
