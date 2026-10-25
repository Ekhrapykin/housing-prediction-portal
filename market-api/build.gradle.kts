plugins {
    java
    alias(libs.plugins.spring.boot)
    alias(libs.plugins.spring.deps)
}

group = "com.hpp"
version = "0.1.0"

java {
    toolchain { languageVersion = JavaLanguageVersion.of(21) }
}

repositories { mavenCentral() }

dependencies {
    implementation("org.springframework.boot:spring-boot-starter-web")
    implementation("org.springframework.boot:spring-boot-starter-validation")
    implementation("org.springframework.boot:spring-boot-starter-data-jpa")
    implementation("org.springframework.boot:spring-boot-starter-cache")
    implementation("org.springframework.boot:spring-boot-starter-actuator")
    implementation("com.github.ben-manes.caffeine:caffeine")
    implementation(libs.springdoc.ui)
    implementation(libs.openpdf)
    runtimeOnly("com.h2database:h2")
    runtimeOnly("org.postgresql:postgresql")
    testImplementation("org.springframework.boot:spring-boot-starter-test")
    testRuntimeOnly("org.junit.platform:junit-platform-launcher")
}

tasks.withType<Test> {
    useJUnitPlatform()
    // ../contracts holds the shared contracts; ContractTest reads them. Declared as an input so a contract edit re-runs the tests.
    val contracts = layout.projectDirectory.dir("../contracts")
    inputs.dir(contracts)
    systemProperty("contracts.dir", contracts.asFile.absolutePath)
}
tasks.withType<JavaCompile> { options.compilerArgs.add("-parameters") }
