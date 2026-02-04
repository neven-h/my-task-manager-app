FROM mysql:8.0

# Ensure the entrypoint is properly set with full path
# This fixes the "docker-entrypoint.sh: command not found" error on Railway
ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]
CMD ["mysqld"]
