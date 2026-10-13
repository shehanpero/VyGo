# ---- Build stage: compile the Spring Boot jar ----
FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /app
COPY pom.xml .
RUN mvn -q -B dependency:go-offline
COPY src ./src
RUN mvn -q -B clean package -DskipTests

# ---- Run stage: small JRE image ----
FROM eclipse-temurin:21-jre
WORKDIR /app
COPY --from=build /app/target/vygo-backend-1.0.0.jar app.jar
EXPOSE 8080
# Hosts set SPRING_PROFILES_ACTIVE=prod; default keeps local behaviour sane.
ENV SPRING_PROFILES_ACTIVE=prod
ENTRYPOINT ["java", "-jar", "app.jar"]
