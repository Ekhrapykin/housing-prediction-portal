package com.hpp.market.ingest;

import com.hpp.market.domain.Property;
import com.hpp.market.repository.PropertyRepository;
import java.io.BufferedReader;
import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

/**
 * Syncs the {@code market} store from the dataset file at {@code data.path} on every start.
 *
 * <p>Not a one-off seed: the CSV is the source of truth (ml-api trains from the same file), and the market
 * table is a read model derived from it. Reloading on start keeps the dashboard and the model on the same
 * data after the file changes, needs no migration, and fills the in-memory H2 used in dev and tests.
 * Set {@code market.sync-on-startup=false} once a migration tool (Flyway) owns the data.
 *
 * <p>Columns: id,square_footage,bedrooms,bathrooms,year_built,lot_size,distance,school,price.
 */
@Component
@ConditionalOnProperty(name = "market.sync-on-startup", havingValue = "true", matchIfMissing = true)
public class CsvPropertySync implements ApplicationRunner {
    private final PropertyRepository repo;
    private final Path csv;

    // Bound as a String: Spring's Path conversion treats a relative value like "../data/x.csv" as a
    // classpath resource and fails, so resolve it against the working directory ourselves.
    public CsvPropertySync(PropertyRepository repo, @Value("${data.path}") String csv) {
        this.repo = repo;
        this.csv = Path.of(csv);
    }

    @Override
    public void run(ApplicationArguments args) throws IOException {
        try (BufferedReader in = Files.newBufferedReader(csv, StandardCharsets.UTF_8)) {
            List<Property> rows = in.lines()
                    .map(l -> l.replace("﻿", "").trim())
                    .filter(l -> !l.isEmpty() && !l.startsWith("id,"))
                    .map(CsvPropertySync::parse)
                    .toList();
            repo.deleteAllInBatch(); // full replace, so a restart never duplicates or keeps stale rows
            repo.saveAll(rows);
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
    }

    private static Property parse(String line) {
        String[] c = line.split(",");
        return new Property(Long.parseLong(c[0]), Double.parseDouble(c[1]), Integer.parseInt(c[2]),
                Double.parseDouble(c[3]), Integer.parseInt(c[4]), Double.parseDouble(c[5]),
                Double.parseDouble(c[6]), Double.parseDouble(c[7]), Double.parseDouble(c[8]));
    }
}
