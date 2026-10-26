from collections.abc import Iterator

from fastapi import Request
from sqlalchemy import JSON, Engine, create_engine
from sqlalchemy.orm import DeclarativeBase, Mapped, Session, mapped_column, sessionmaker


class Base(DeclarativeBase):
    pass


class EstimateRow(Base):
    # No schema here: on Postgres the role's search_path (set in data/postgres/init) puts the table in `estimator`.
    __tablename__ = "estimates"

    id: Mapped[int] = mapped_column(primary_key=True)
    label: Mapped[str | None]
    features: Mapped[dict] = mapped_column(JSON)
    price: Mapped[float]
    warnings: Mapped[list[str]] = mapped_column(JSON)
    created_at: Mapped[str]  # ISO-8601 UTC


def make_engine(url: str) -> Engine:
    return create_engine(url, pool_pre_ping=True)


def init_db(engine: Engine) -> None:
    Base.metadata.create_all(engine)


def get_session(request: Request) -> Iterator[Session]:
    """Request-scoped session: commit on success, roll back on error, always close."""
    with request.app.state.session_factory() as session:
        try:
            yield session
            session.commit()
        except BaseException:
            session.rollback()
            raise


def make_session_factory(engine: Engine) -> sessionmaker[Session]:
    return sessionmaker(engine, expire_on_commit=False)
