# Security Policy

## Supported versions

The `main` branch is the actively supported version. Fixes are only backported to
tagged releases within the last 6 months.

## Reporting a vulnerability

Please **do not** open a public GitHub issue for security problems.

Email the maintainer directly at **abdisharmahassan@gmail.com** with:

1. A description of the issue and impact.
2. Steps to reproduce.
3. (Optional) A suggested fix.

You'll receive an acknowledgement within 7 days and a fix timeline within 14 days.

## Known considerations

- The system stores camera snapshots in MongoDB — these may contain images of workers.
- JWTs are used for API auth; rotate `JWT_SECRET` periodically.
- The embedded Aedes MQTT broker does not require auth by default; only expose port 1883 on trusted networks.
