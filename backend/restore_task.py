# noinspection SqlNoDataSourceInspection,SqlResolve
import mysql.connector

conn = mysql.connector.connect(
    host='localhost',
    user='root',
    password='',
    database='task_tracker'
)

cursor = conn.cursor()

query = """
INSERT INTO tasks 
(title, description, category, categories, client, task_date, task_time, status, notes)
VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
"""

values = (
    'קנייה של משרד תיקון כמו עזבון המתוח מדית של משה',
    'פתקתיד הצורך עבר הניסוח כמו המתוח (4 ימים) - מד35.1 וגד9.1\nתכלנון רל משכת שנרחאר ועל תורא דרגיח וסח מלך תעוגן דרך\nלובל שניכ אלניס פרן במעהנ דג בשונקח בצענד רער משפנם רערוב',
    'banking',
    'banking,moshe',
    'banking',
    '2025-12-28',
    '18:12:36',
    'uncompleted',
    'ליטשיני'
)

cursor.execute(query, values)
conn.commit()

print(f"✅ Task restored successfully! ID: {cursor.lastrowid}")

cursor.execute("SELECT COUNT(*) FROM tasks")
count = cursor.fetchone()[0]
print(f"✅ Total tasks in database: {count}")

conn.close()
