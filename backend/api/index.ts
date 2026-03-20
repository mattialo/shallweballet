import { initDB } from "../db";
import app from "../app";

await initDB(3, 1000); // fast retry for cold starts

export default app;
