# DefySwarm

DefySwarm is a local development console for object-storage monitoring, canary alerts, containment, and vault recovery.

## Build and run

```sh
bun install --frozen-lockfile
npm run lint
npm run build
npm start
```

Open [the console](http://127.0.0.1:3000). Run `npm run dev` for live code reloads. Set `PORT` to use a different port.

Use **Live Storage** to upload a sample object and inspect its telemetry. **Simulator** runs isolated tests for routine storage traffic, versioning alerts, multi-principal correlation, and SHA-256 recovery. **Analytics** benchmarks those fixtures through the local adapter.

## Credentials

Built-in storage, seeded canaries, simulation, and benchmarks work without API keys.

- For generated canaries, enter a **Groq API key** under **Setup & Settings → Groq BYOK Settings**. The app saves submitted keys in `data/.private-config.json`, with owner-only file permissions, and reloads them after restart. You can also set `GROQ_API_KEY` in a local `.env` file.
- To connect S3-compatible storage, enter its endpoint, bucket names, and monitor access-key pair in **Setup & Settings**. An external vault uses a separate access-key pair. The credential variable names are listed in `.env.example`.
- The ingest token is generated at startup. Set `DEFYSWARM_INGEST_TOKEN` locally if your webhook sender needs a stable token.

The console binds to loopback, and its role picker is for local demonstration. The bundled object store and vault hold sample data in memory.

Monitor keys, vault keys, Groq keys, and the ingest token persist in the private configuration file. The file contains secrets, is excluded from Git, and is readable by the current macOS user. Use the app’s Clear controls to remove saved provider keys. S3 connectivity is verified again at startup.
