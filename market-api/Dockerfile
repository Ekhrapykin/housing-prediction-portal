FROM eclipse-temurin:21-jdk AS build
WORKDIR /src
COPY gradlew settings.gradle.kts build.gradle.kts gradle.properties ./
COPY gradle ./gradle
RUN ./gradlew --no-daemon dependencies >/dev/null
COPY src ./src
RUN ./gradlew bootJar --no-daemon

FROM eclipse-temurin:21-jre
RUN useradd --system --no-create-home app
WORKDIR /app
COPY --from=build /src/build/libs/*.jar app.jar
ENV JAVA_TOOL_OPTIONS="-Xmx256m -XX:+UseSerialGC"
# Listen port (server.port reads PORT); EXPOSE is documentation only, so it keeps the default.
ENV PORT=8080
USER app
EXPOSE 8080
CMD ["java", "-jar", "app.jar"]
