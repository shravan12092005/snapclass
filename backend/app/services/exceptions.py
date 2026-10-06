"""Custom exceptions for the database layer."""


class DatabaseError(Exception):
    """Raised when a database operation fails.

    Callers in the UI layer should catch this and display the error
    via ``st.error`` — the DB layer itself never calls ``st.error``.
    """
