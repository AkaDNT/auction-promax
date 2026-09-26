const expectedNodeVersion = "24.15.0";
const expectedNpmVersion = "11.12.1";

if (process.versions.node !== expectedNodeVersion) {
  throw new Error(
    `Unsupported Node.js ${process.versions.node}. Use Node.js ${expectedNodeVersion}.`,
  );
}

const npmUserAgent = process.env.npm_config_user_agent ?? "";
const npmVersion = npmUserAgent.match(/npm\/(\d+\.\d+\.\d+)/)?.[1];

if (npmVersion !== expectedNpmVersion) {
  throw new Error(
    `Unsupported npm ${npmVersion ?? "unknown"}. Use npm ${expectedNpmVersion}.`,
  );
}
