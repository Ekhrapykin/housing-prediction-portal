package com.hpp.market.service;

import com.hpp.market.domain.Property;
import com.hpp.market.dto.MarketFilter;
import com.hpp.market.dto.PageResponse;
import com.hpp.market.dto.PropertyDto;
import com.hpp.market.exception.BadRequestException;
import com.hpp.market.repository.PropertyRepository;
import com.hpp.market.repository.PropertySpecifications;
import java.util.List;
import java.util.Set;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;

@Service
public class PropertyService {
    private static final Set<String> SORTABLE = Set.of("id", "squareFootage", "bedrooms", "bathrooms", "yearBuilt",
            "lotSize", "distanceToCityCenter", "schoolRating", "price");

    private final PropertyRepository repo;

    public PropertyService(PropertyRepository repo) {
        this.repo = repo;
    }

    public PageResponse<PropertyDto> page(MarketFilter f, Pageable pageable) {
        // accept snake_case sort keys (square_footage) like everywhere else in the API
        Sort sort = Sort.by(pageable.getSort().stream().map(o -> {
            String prop = camel(o.getProperty());
            if (!SORTABLE.contains(prop)) throw new BadRequestException("Unknown sort property: " + o.getProperty());
            return o.withProperty(prop);
        }).toList());
        var page = repo.findAll(PropertySpecifications.from(f),
                org.springframework.data.domain.PageRequest.of(pageable.getPageNumber(), pageable.getPageSize(), sort));
        return new PageResponse<>(page.map(PropertyDto::of).getContent(), page.getTotalElements(),
                page.getNumber(), page.getSize());
    }

    public List<Property> all(MarketFilter f) {
        return repo.findAll(PropertySpecifications.from(f), Sort.by("id"));
    }

    private static String camel(String s) {
        StringBuilder b = new StringBuilder();
        boolean up = false;
        for (char c : s.toCharArray()) {
            if (c == '_') up = true;
            else { b.append(up ? Character.toUpperCase(c) : c); up = false; }
        }
        return b.toString();
    }
}
