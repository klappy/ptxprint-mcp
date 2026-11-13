# syntax=docker/dockerfile:1
#
# PTXprint MCP container.
#
# Mirrors the upstream sillsdev/ptx2pdf Dockerfile (installs PTXprint + XeTeX
# + bundled SIL fonts), then layers a FastAPI HTTP handler on top.
#
# Day-1 PoC note re session-3 C-007 ("container excludes fonts-* packages"):
# the upstream Dockerfile installs Charis et al. by default. For Day-1 we
# inherit upstream's font bundle so the operator's "no config, just USFM"
# minimal-payload smoke test can succeed (PTXprint falls back to Charis when
# no font is specified). C-007 stripping is a Day-2 hardening pass.

FROM python:3.11-slim-bookworm AS ptxprint-base

WORKDIR /app

# Use bash so heredocs can use bash-only options like `pipefail`.
SHELL ["/bin/bash", "-eo", "pipefail", "-c"]

# Apt dependencies — pinned to the upstream sillsdev/ptx2pdf set, minus
# ttf-mscorefonts-installer (license interactivity) and minus the noto fonts
# that upstream commented out.
RUN <<EOF
set -eux
apt-get update
apt-get install --no-install-recommends -y \
    git ca-certificates curl \
    python3-gi python3-cairo gir1.2-gtk-3.0 \
    tex-common teckit texlive-base texlive-binaries texlive-latex-base fontconfig \
    fonts-sil-ezra fonts-sil-galatia \
    fonts-sil-charis fonts-sil-gentium fonts-sil-andika \
    fonts-sil-scheherazade fonts-sil-harmattan fonts-sil-lateef fonts-sil-awami-nastaliq \
    fonts-sil-annapurna fonts-sil-padauk
apt-get download texlive-xetex
dpkg --install --force-depends texlive-xetex_*_all.deb
rm texlive-xetex_*_all.deb
rm -fr /usr/share/texlive/texmf-dist/tex /usr/share/texlive/texmf-dist/fonts
apt-get clean
rm -rf /var/lib/apt/lists/*
EOF

# The lock is the shared source of engine identity for Worker and container.
# Keep the upstream TeX and bundled-font workaround until real render tests
# demonstrate that packaging includes them. Never install mutable usfmtc/main.
COPY engine-lock.json /app/engine-lock.json
RUN <<'EOF'
set -eux
PTX_SHA=$(python -c 'import json; print(json.load(open("/app/engine-lock.json"))["ptxprint"]["commit"])')
git init /tmp/ptx2pdf
git -C /tmp/ptx2pdf remote add origin https://github.com/sillsdev/ptx2pdf.git
git -C /tmp/ptx2pdf fetch --depth 1 origin "$PTX_SHA"
git -C /tmp/ptx2pdf checkout --detach FETCH_HEAD
test "$(git -C /tmp/ptx2pdf rev-parse HEAD)" = "$PTX_SHA"
python - <<'PATCH'
import json, re
from pathlib import Path
lock = json.loads(Path('/app/engine-lock.json').read_text())
assert re.fullmatch(r'[a-f0-9]{40}', lock['usfmtc']['commit'])
p = Path('/tmp/ptx2pdf/pyproject.toml')
s = p.read_text()
old = 'https://github.com/usfm-bible/usfmtc/archive/main.zip'
assert s.count(old) == 1, 'Upstream dependency changed; review lock patch manually'
p.write_text(s.replace(old, 'https://github.com/usfm-bible/usfmtc/archive/' + lock['usfmtc']['commit'] + '.zip'))
PATCH
pip install --no-cache-dir /tmp/ptx2pdf
pip check
mkdir -p /usr/local/share/ptx2pdf /usr/local/share/fonts/ptx2pdf
cp -r /tmp/ptx2pdf/src/. /usr/local/share/ptx2pdf/
cp /tmp/ptx2pdf/fonts/*.ttf /usr/local/share/fonts/ptx2pdf/
fc-cache -fv
rm -rf /tmp/ptx2pdf /root/.cache
EOF

# Make the ptx2pdf TeX macros findable by XeTeX (kpsewhich).
# Trailing // means recursive search; trailing : means "then standard paths".
ENV TEXINPUTS=/usr/local/share/ptx2pdf//:

# PTXprint3.1.6 imports Gtk via report/parlocs even in headless mode.
# Debian bookworm and this image both use Python3.11; expose distro gi bindings.
ENV PYTHONPATH=/usr/lib/python3/dist-packages

# FastAPI HTTP handler layer
COPY container/requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir -r /app/requirements.txt
COPY container/main.py /app/main.py

ENV PYTHONUNBUFFERED=1
EXPOSE 8080

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8080", "--log-level", "info"]
