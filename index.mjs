import { createRequire } from "module";
import serverless from "serverless-http";

const require = createRequire(import.meta.url);

// Load your existing Express application
const app = require("./src/app");

export const handler = serverless(app);
