FROM mysql:8.0

# Ensure docker-entrypoint.sh is in PATH and executable
# This fixes the "docker-entrypoint.sh: command not found" error on Railway
# Railway may run commands through /bin/bash -c, so we need the script in PATH
ENV PATH="/usr/local/bin:${PATH}"

# Use the entrypoint script name (will be resolved via PATH)
# This matches how the official MySQL image works
ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["mysqld"]
