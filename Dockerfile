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

# Install PTXprint from sillsdev/ptx2pdf upstream. Pin to a tag/sha at hardening
# time; for Day-1 we track master.
ARG PTX2PDF_REF=master
RUN git clone --depth 1 --branch ${PTX2PDF_REF} \
        https://github.com/sillsdev/ptx2pdf.git /tmp/ptx2pdf \
 && cd /tmp/ptx2pdf \
 && pip install --no-cache-dir . \
 && rm -rf /tmp/ptx2pdf /root/.cache

# FastAPI HTTP handler layer
COPY container/requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir -r /app/requirements.txt
COPY container/main.py /app/main.py

ENV PYTHONUNBUFFERED=1
EXPOSE 8080

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8080", "--log-level", "info"]
