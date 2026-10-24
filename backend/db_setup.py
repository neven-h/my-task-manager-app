"""Set up the database for a deploy: create and migrate the tables, then bring
every encrypted value to the current key (rekey.py).

Runs once per deploy, before the web process starts: the pre-deploy job on
DigitalOcean App Platform, preDeployCommand on Railway (railway.toml), or by
hand. The web process never does this on import, so it answers health checks
in seconds. Exits non-zero on failure, which stops the deploy.

    python db_setup.py
"""
import sys

from config import init_db

if __name__ == '__main__':
    sys.exit(0 if init_db() else 1)
