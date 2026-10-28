FROM python:3.12-slim
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1
WORKDIR /app
COPY pyproject.toml ./
COPY requirements.lock ./
COPY discovery ./discovery
RUN pip install --no-cache-dir -c requirements.lock . && useradd --uid 10001 --create-home discovery && mkdir /data && chown discovery /data
COPY alembic.ini ./
COPY migrations ./migrations
USER discovery
EXPOSE 8000
HEALTHCHECK --interval=20s --timeout=5s CMD python -m discovery.health
CMD ["python", "-m", "discovery.central"]
