package com.hpp.market.service;

import com.hpp.market.domain.Property;
import com.hpp.market.dto.MarketFilter;
import com.hpp.market.dto.MarketSummary;
import com.hpp.market.dto.SegmentStat;
import com.hpp.market.repository.PropertyRepository;
import com.hpp.market.repository.PropertySpecifications;
import java.util.Comparator;
import java.util.List;
import java.util.stream.Collectors;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;

/** ponytail: aggregates run in Java over the filtered list; move to JPQL aggregates if the data grows. */
@Service
public class MarketService {
    private final PropertyRepository repo;

    public MarketService(PropertyRepository repo) {
        this.repo = repo;
    }

    @Cacheable("summary")
    public MarketSummary summary(MarketFilter f) {
        List<Property> all = repo.findAll(PropertySpecifications.from(f));
        if (all.isEmpty()) return new MarketSummary(0, 0, 0, 0, 0, 0);
        double[] prices = all.stream().mapToDouble(Property::getPrice).sorted().toArray();
        int n = prices.length;
        double median = n % 2 == 1 ? prices[n / 2] : (prices[n / 2 - 1] + prices[n / 2]) / 2;
        return new MarketSummary(n, avg(all, Property::getPrice), median, prices[0], prices[n - 1], avgPpsf(all));
    }

    @Cacheable("segments")
    public List<SegmentStat> segments(MarketFilter f, Segment by) {
        return repo.findAll(PropertySpecifications.from(f)).stream()
                .collect(Collectors.groupingBy(by.order::applyAsInt))
                .entrySet().stream()
                .sorted(Comparator.comparingInt(java.util.Map.Entry::getKey))
                .map(e -> new SegmentStat(by.label.apply(e.getKey()), e.getValue().size(),
                        avg(e.getValue(), Property::getPrice), avgPpsf(e.getValue())))
                .toList();
    }

    private static double avg(List<Property> l, java.util.function.ToDoubleFunction<Property> g) {
        return l.stream().mapToDouble(g).average().orElse(0);
    }

    private static double avgPpsf(List<Property> l) {
        return avg(l, p -> p.getPrice() / p.getSquareFootage());
    }
}
