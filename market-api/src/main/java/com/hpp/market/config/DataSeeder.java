package com.hpp.market.config;

import com.hpp.market.domain.Property;
import com.hpp.market.repository.PropertyRepository;
import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.io.UncheckedIOException;
import java.nio.charset.StandardCharsets;
import java.util.List;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Component;

/** Loads data/house_prices.csv (id,square_footage,bedrooms,bathrooms,year_built,lot_size,distance,school,price). */
@Component
public class DataSeeder implements ApplicationRunner {
    private final PropertyRepository repo;

    public DataSeeder(PropertyRepository repo) {
        this.repo = repo;
    }

    @Override
    public void run(ApplicationArguments args) throws IOException {
        try (var in = new BufferedReader(new InputStreamReader(
                new ClassPathResource("data/house_prices.csv").getInputStream(), StandardCharsets.UTF_8))) {
            List<Property> rows = in.lines()
                    .map(l -> l.replace("﻿", "").trim())
                    .filter(l -> !l.isEmpty() && !l.startsWith("id,"))
                    .map(DataSeeder::parse)
                    .toList();
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
