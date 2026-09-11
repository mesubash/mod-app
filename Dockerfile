FROM python:3.13-slim

COPY --from=ghcr.io/astral-sh/uv:latest /uv /usr/local/bin/uv

WORKDIR /app

# Dependencies first, so a code change does not reinstall them.
COPY pyproject.toml uv.lock ./
RUN uv sync --frozen --no-dev --no-install-project

COPY api/ api/
COPY data/ data/

ENV PATH="/app/.venv/bin:$PATH"
EXPOSE 8000

# One worker. The graph is about 54 MB resident once loaded and each worker
# holds its own copy, so workers cost memory on a box where memory is the
# constraint. Routing is 5 ms; add workers only if concurrency demands it.
CMD ["uvicorn", "api.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "1"]
