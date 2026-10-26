package com.hpp.market.repository;

import static org.assertj.core.api.Assertions.assertThat;

import com.hpp.market.ingest.CsvPropertySync;
import com.hpp.market.dto.MarketFilter;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.context.annotation.Import;

@DataJpaTest
@Import(CsvPropertySync.class)
class PropertyRepositoryTest {
    @Autowired PropertyRepository repo;

    @Test
    void csvSeedLoads50Rows() {
        assertThat(repo.count()).isEqualTo(50);
    }

    @Test
    void bedroomsIsAnyOf() {
        var f = new MarketFilter(List.of(2, 4), null, null, null, null, null, null);
        var rows = repo.findAll(PropertySpecifications.from(f));
        assertThat(rows).isNotEmpty().hasSizeLessThan(50).allMatch(p -> p.getBedrooms() == 2 || p.getBedrooms() == 4);
    }
}
