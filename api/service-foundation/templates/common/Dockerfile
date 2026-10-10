# syntax=docker/dockerfile:1
FROM docker.io/library/amazoncorretto:21.0.12-al2023-headless@sha256:a1659a04c445036c54b49fe5163e46554ca24030e94c6eeffefe46fad127b400

WORKDIR /app

COPY --chown=10001:10001 target/__SERVICE_ID__-0.0.1-SNAPSHOT.jar /app/app.jar

USER 10001:10001

EXPOSE 8080

ENTRYPOINT ["java", "-jar", "/app/app.jar"]
