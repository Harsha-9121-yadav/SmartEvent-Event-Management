
import sqlite3
from pathlib import Path


# Locate the existing database in the backend folder.
BASE_DIR = Path(__file__).resolve().parent
DATABASE_PATH = BASE_DIR / "smartevent.db"


def migrate_database():
    if not DATABASE_PATH.exists():
        print(f"Database not found: {DATABASE_PATH}")
        print("Check that smartevent.db exists in the backend folder.")
        return

    connection = sqlite3.connect(DATABASE_PATH)

    try:
        cursor = connection.cursor()

        # Confirm the bookings table exists.
        cursor.execute("""
            SELECT name
            FROM sqlite_master
            WHERE type = 'table'
              AND name = 'bookings'
        """)

        if cursor.fetchone() is None:
            print("The bookings table does not exist.")
            print("Start the backend once to create the tables, then rerun this migration.")
            return

        # Read the columns already present.
        cursor.execute("PRAGMA table_info(bookings)")
        existing_columns = {
            row[1] for row in cursor.fetchall()
        }

        # Add only columns that are missing.
        migrations = {
            "coupon_id": (
                "ALTER TABLE bookings "
                "ADD COLUMN coupon_id INTEGER "
                "REFERENCES coupons(id)"
            ),
            "discount_amount": (
                "ALTER TABLE bookings "
                "ADD COLUMN discount_amount FLOAT "
                "NOT NULL DEFAULT 0.0"
            ),
            "final_amount": (
                "ALTER TABLE bookings "
                "ADD COLUMN final_amount FLOAT"
            ),
        }

        for column_name, sql in migrations.items():
            if column_name not in existing_columns:
                cursor.execute(sql)
                print(f"Added column: {column_name}")
            else:
                print(f"Column already exists: {column_name}")

        # Preserve existing booking totals for old records.
        cursor.execute("""
            UPDATE bookings
            SET final_amount = total_price
            WHERE final_amount IS NULL
              AND coupon_id IS NULL
        """)

        connection.commit()
        print("Database migration completed successfully.")

    except sqlite3.Error as error:
        connection.rollback()
        print(f"Database migration failed: {error}")
        raise

    finally:
        connection.close()


if __name__ == "__main__":
    migrate_database()
