# Running Sentinel AI on Windows

Three double-click scripts are provided for Windows:
`run_local.bat` · `run_mobile_web.bat` · `status.bat`
(These are the Windows versions of the `.sh` scripts — friends on Windows should use the `.bat` ones.)

## 1. Install these first (one time)
| Tool | Link | Needed for |
|---|---|---|
| **Node.js** (LTS) | nodejs.org | backend + web client |
| **Python 3** (add to PATH!) | python.org | AI engine |
| **MongoDB Community** | mongodb.com/try/download/community | database |
| **Flutter** (add to PATH) | docs.flutter.dev | mobile app (optional) |
| **Brave** | brave.com | mobile app in browser (optional) |

> When installing Python, tick **"Add python.exe to PATH"**. Same for Node and Flutter.

## 2. IMPORTANT — clean the Linux-built folders first
This project was set up on Linux, so a few folders won't work on Windows. **Delete these before the first run** (the scripts rebuild them automatically for Windows):
- `server\node_modules`
- `client\node_modules`
- `ai-engine\venv`
- `mobile\.dart_tool`  and  `mobile\build`  (only if running the mobile app)

*(Tip: when sharing the project, zip it **without** those folders — smaller and avoids this step.)*

## 3. Start MongoDB
If you installed it as a Windows service it may already run. Otherwise open a terminal:
```
net start MongoDB
```

## 4. Create the login accounts (first time only)
Your database starts empty, so create the demo users. Open **Command Prompt** in the project folder:
```
cd server
npm install
node seed_local.js
```
This creates **`mo`** (worker), **`admin`**, **`supervisor`** — all with password **`@Asharma4582`**.
*(To use a different password: `node seed_local.js MyPassword123`)*

## 5. Run it
Double-click **`run_local.bat`** — three windows open (Backend, AI engine, Web client).
When they're ready, open **http://localhost:5173** and sign in:
- **`admin`** / `@Asharma4582` → dashboard + CCTV Monitor
- **`mo`** / `@Asharma4582` → worker (activates the webcam)

Check everything is up any time by double-clicking **`status.bat`**.

## 6. Mobile app in Brave (optional)
With the backend running, double-click **`run_mobile_web.bat`** → the app opens in Brave at
**http://localhost:8080**. (First build takes 1–2 minutes.)

## Ports used
| Part | Port |
|---|---|
| Web client | 5173 |
| Mobile (Brave) | 8080 |
| Backend API | 5001 |
| MQTT broker | 1883 |
| AI engine | 5002 |
| MongoDB | 27017 |

## Notes
- The AI engine reads the **built-in webcam** automatically (no extra camera setup).
- To stop everything, close the three console windows opened by `run_local.bat`.
- If a script says a command "is not recognized", the tool (node / python / flutter) isn't on PATH — reinstall it with the *Add to PATH* option ticked, then reopen the terminal.
