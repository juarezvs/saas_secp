import os

from alembic import context
from sqlalchemy import create_engine

from discovery.db import Base

engine = create_engine(os.environ["DISCOVERY_DATABASE_URL"])
with engine.connect() as connection:
    context.configure(connection=connection, target_metadata=Base.metadata, version_table="discovery_alembic_version")
    with context.begin_transaction():
        context.run_migrations()
