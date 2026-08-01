# Deployment guide (Contabo VPS)

## Target topology

- **Server**: 1× Contabo VPS (Ubuntu 24.04)
- **Backend + Dashboard**: single VPS
- **AI Engine**: same VPS (CPU) or via Colab T4 GPU (cloudflared tunnel)
- **Database**: MongoDB on the same VPS
- **Reverse proxy**: nginx

## First-time server setup

```bash
# Install runtime dependencies
apt update && apt install -y nodejs npm python3 python3-pip mongodb nginx

# Application files
mkdir -p /root/ppe-project
cd /root/ppe-project && git clone https://github.com/Sharmasheeno/ppe-monitoring-system.git
cd ppe-monitoring-system

# Backend
cd server && npm ci && cp .env.example .env  # fill in values
pm2 start server.js --name ppe-backend

# AI engine (CPU)
cd ../ai-engine && python3 -m venv venv && source venv/bin/activate
pip install -r requirements.txt
# Place trained weights under ../Training\ Work/{ppe_model_v8,glove_model_v2}/weights/best.pt
systemctl enable --now sentinel-ai   # or `python main.py &`

# Web build
cd ../client && npm ci && npm run build
cp -r dist/* /var/www/ppe-monitoring/
```

## nginx configuration

Route `/api/*` to `:5001` (backend) and `/stream/*` to `:5002` (AI engine).
Serve the React build from `/var/www/ppe-monitoring/`.

## Switching between CPU and GPU inference

The `/stream/*` upstream can be flipped at runtime with the helper on the server:

```bash
python3 /root/update_stream_upstream.py https://<cloudflare-tunnel>.trycloudflare.com
python3 /root/update_stream_upstream.py local        # back to on-VPS CPU
```

The nginx conf uses a resolver + variable so a dead tunnel cannot prevent nginx from
starting or reloading.
