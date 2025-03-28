import { postgres } from "../deps.js";

const PGPASS = Deno.env.get("PGPASS").trim();
if (!PGPASS) {
  throw new Error("PGPASS environment variable is not set");
}
const PGPASS_PARTS = PGPASS.split(":");

const host = PGPASS_PARTS[0];
const port = PGPASS_PARTS[1];
const database = PGPASS_PARTS[2];
const username = PGPASS_PARTS[3];
const password = PGPASS_PARTS[4];

const sql = postgres({
  host,
  port,
  database,
  username,
  password,
});

export { sql };