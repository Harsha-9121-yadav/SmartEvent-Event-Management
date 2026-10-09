import sqlite3


DATABASE_FILE = "smartevent.db"


def get_column_names(cursor, table_name):
    cursor.execute(
        f"PRAGMA table_info({table_name})"
    )

    columns = cursor.fetchall()

    return [
        column[1]
        for column in columns
    ]


def migrate_users_table(cursor):
    columns = get_column_names(
        cursor,
        "users"
    )

    if "role" not in columns:
        cursor.execute(
            """
            ALTER TABLE users
            ADD COLUMN role VARCHAR(20)
            DEFAULT 'USER'
            NOT NULL
            """
        )

        print(
            "SUCCESS: role column added to users table."
        )

    else:
        print(
            "INFO: role column already exists in users table."
        )

    cursor.execute(
        """
        UPDATE users
        SET role = 'USER'
        WHERE role IS NULL
        """
    )

    print(
        "SUCCESS: Existing users checked for USER role."
    )


def migrate_events_table(cursor):
    columns = get_column_names(
        cursor,
        "events"
    )

    if "organizer_id" not in columns:
        cursor.execute(
            """
            ALTER TABLE events
            ADD COLUMN organizer_id INTEGER
            """
        )

        print(
            "SUCCESS: organizer_id column added to events table."
        )

    else:
        print(
            "INFO: organizer_id column already exists in events table."
        )

    if "event_status" not in columns:
        cursor.execute(
            """
            ALTER TABLE events
            ADD COLUMN event_status VARCHAR(20)
            DEFAULT 'UPCOMING'
            NOT NULL
            """
        )

        print(
            "SUCCESS: event_status column added to events table."
        )

    else:
        print(
            "INFO: event_status column already exists in events table."
        )

    cursor.execute(
        """
        UPDATE events
        SET event_status = 'UPCOMING'
        WHERE event_status IS NULL
        """
    )

    print(
        "SUCCESS: Existing events checked for UPCOMING status."
    )


def migrate_database():
    connection = sqlite3.connect(
        DATABASE_FILE
    )

    try:
        cursor = connection.cursor()

        migrate_users_table(cursor)

        migrate_events_table(cursor)

        connection.commit()

        print(
            "SUCCESS: Phase 2 database migration completed."
        )

    except Exception as error:
        connection.rollback()

        print(
            "ERROR: Database migration failed."
        )

        print(error)

    finally:
        connection.close()


if __name__ == "__main__":
    migrate_database()