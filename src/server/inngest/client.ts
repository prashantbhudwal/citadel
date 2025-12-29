import { Inngest, EventSchemas } from "inngest";
import { eventsMap } from "./events";

export const inngest = new Inngest({
  id: "citadel",
  schemas: new EventSchemas().fromSchema(eventsMap),
});
