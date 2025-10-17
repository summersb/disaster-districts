# ==========================
# Base image with Maven and JDK
# ==========================
FROM maven:3.9.11-eclipse-temurin-25 AS dev

WORKDIR /app

# Copy the Maven configuration first (for dependency caching)
COPY pom.xml ./

# Pre-fetch dependencies
RUN mvn dependency:go-offline

# Copy the rest of the source code
COPY . .

# Expose Quarkus default dev port
EXPOSE 8080

# Run in Quarkus dev mode (listening for file changes)
CMD ["mvn", "-Dquarkus.http.host=0.0.0.0", "quarkus:dev"]
