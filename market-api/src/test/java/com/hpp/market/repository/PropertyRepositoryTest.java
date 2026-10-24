package com.hpp.market.repository;

import static org.assertj.core.api.Assertions.assertThat;

import com.hpp.market.config.DataSeeder;
import com.hpp.market.dto.MarketFilter;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.context.annotation.Import;

@DataJpaTest
@Import(DataSeeder.class)
class PropertyRepositoryTest {
    @Autowired PropertyRepository repo;

    @Test
    void csvSeedLoads50Rows() {
        assertThat(repo.count()).isEqualTo(50);
    }

    @Test
    void specificationNarrowsResults() {
        var f = new MarketFilter(4, null, null, null, null, null, null, null);
        var rows = repo.findAll(PropertySpecifications.from(f));
        assertThat(rows).isNotEmpty().hasSizeLessThan(50).allMatch(p -> p.getBedrooms() >= 4);
    }
}
