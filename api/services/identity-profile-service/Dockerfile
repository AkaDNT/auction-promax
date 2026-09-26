# syntax=docker/dockerfile:1
FROM docker.io/library/amazoncorretto:21.0.12-al2023-headless@sha256:82eb6e99cb91fb87f5a65a933750ae5bb23cab4ab396e4bba4a5b0b07dcd32ff

WORKDIR /app

COPY --chown=10001:10001 target/identity-profile-service-0.0.1-SNAPSHOT.jar /app/app.jar

USER 10001:10001

EXPOSE 8080

ENTRYPOINT ["java", "-jar", "/app/app.jar"]
