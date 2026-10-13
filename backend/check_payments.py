
import sqlite3
import os

# Database path: same folder as this Python file
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATABASE_PATH = os.path.join(BASE_DIR, "smartevent.db")

print("Checking SmartEvent database...")
print("Database path:", DATABASE_PATH)

if not os.path.exists(DATABASE_PATH):
    print("ERROR: smartevent.db was not found.")
else:
    connection = None

    try:
        connection = sqlite3.connect(DATABASE_PATH)
        cursor = connection.cursor()

        cursor.execute(
            "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name"
        )
        tables = cursor.fetchall()

        print("\nTables found in database:")
        for table in tables:
            print("-", table[0])

        if any(table[0] == "payments" for table in tables):
            print("\nSUCCESS: The payments table exists.")

            cursor.execute("PRAGMA table_info(payments)")
            print("\nPayment table columns:")
            for column in cursor.fetchall():
                print("-", column[1])
        else:
            print("\nNOTICE: The payments table does not exist yet.")

    except sqlite3.Error as error:
        print("Database error:", error)

    finally:
        if connection:
            connection.close()

print("\nDatabase check completed.")
