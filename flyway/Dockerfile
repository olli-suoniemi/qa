# Use the official Flyway image
FROM flyway/flyway:9.8.3-alpine

# Copy the SQL migration scripts into the Flyway container
COPY sql/ /flyway/sql/

# Use shell form for entrypoint to get access to env variables
ENTRYPOINT ./flyway migrate -user=$FLYWAY_USER -password=$FLYWAY_PASSWORD -url="jdbc:postgresql://${DATABASE_CLUSTER_RW_SERVICE_HOST}:${DATABASE_CLUSTER_RW_SERVICE_PORT}/${FLYWAY_USER}"
