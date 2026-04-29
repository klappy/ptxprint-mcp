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

# Install PTXprint from sillsdev/ptx2pdf upstream.
#
# Pinned to a tagged release (3.0.20, released ~2026-04-28) for reproducibility.
# Bumping is a deliberate change.
#
# Upstream-pyproject patch: as of 3.0.20, pyproject.toml declares a dependency
# named "markdown_it" which does not exist on PyPI (the real package is
# "markdown-it-py"). We sed-fix it in place after the clone. Worth filing
# upstream as a bug in sillsdev/ptx2pdf.
#
# Upstream-package-data bug: pyproject.toml's [tool.setuptools.package-data]
# declares "ptxprint" = ["ptx2pdf/**/*", "xetex/**/*"], but those subdirs
# don't exist under python/lib/ptxprint/ in the source tree (verified on
# both master and 3.0.20). The actual TeX macros (paratext2.tex et al.)
# live at src/ at the repo root and ship as zero files via pip install.
# Workaround: copy src/ into a stable location in the image and add it to
# TEXINPUTS so XeTeX can find paratext2.tex et al. at typeset time.
# Also worth filing upstream.
#
# Upstream-bundled fonts: ptx2pdf bundles a small fonts/ directory at the
# repo root (Charis-{Regular,Bold,Italic,BoldItalic}.ttf, OrnamentTest.ttf,
# SourceCodePro-Regular.ttf, empties.ttf). The upstream Dockerfile pulls
# these in via COPY fonts/. We need at least SourceCodePro-Regular.ttf
# because src/ptx-cropmarks.tex line 38 unconditionally does
#     \font\idf@nt="Source Code Pro" at 8pt
# during macro setup — meaning every Phase 1 typeset attempt would die at
# this line without it. Apt has no fonts-source-code-pro package, so we
# copy from /tmp/ptx2pdf/fonts/ before cleanup and run fc-cache. Total
# image-size cost ~3.6 MB.
ARG PTX2PDF_REF=3.0.20
RUN git clone --depth 1 --branch ${PTX2PDF_REF} \
        https://github.com/sillsdev/ptx2pdf.git /tmp/ptx2pdf \
 && cd /tmp/ptx2pdf \
 && sed -i 's/"markdown_it"/"markdown-it-py"/' pyproject.toml \
 && pip install --no-cache-dir . \
 && mkdir -p /usr/local/share/ptx2pdf \
 && cp -r /tmp/ptx2pdf/src/. /usr/local/share/ptx2pdf/ \
 && mkdir -p /usr/local/share/fonts/ptx2pdf \
 && cp /tmp/ptx2pdf/fonts/*.ttf /usr/local/share/fonts/ptx2pdf/ \
 && fc-cache -fv \
 && rm -rf /tmp/ptx2pdf /root/.cache

# Make the ptx2pdf TeX macros findable by XeTeX (kpsewhich).
# Trailing // means recursive search; trailing : means "then standard paths".
ENV TEXINPUTS=/usr/local/share/ptx2pdf//:

# FastAPI HTTP handler layer
COPY container/requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir -r /app/requirements.txt
COPY container/main.py /app/main.py

ENV PYTHONUNBUFFERED=1
EXPOSE 8080

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8080", "--log-level", "info"]
