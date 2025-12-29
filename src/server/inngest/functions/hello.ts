import { inngest } from "../client";

export const helloWorld = inngest.createFunction(
  { id: "hello-world" },
  { event: "test/hello.world" },
  async ({ event, step }) => {
    await step.sleep("wait-a-sec", "1s");
    return {
      message: `Hello! You said: ${event.data.message}`,
    };
  }
);
