package com.hpp.market.web;

import com.hpp.market.dto.MarketFilter;
import com.hpp.market.dto.MarketSummary;
import com.hpp.market.dto.PageResponse;
import com.hpp.market.dto.PropertyDto;
import com.hpp.market.dto.SegmentStat;
import com.hpp.market.dto.WhatIfPoint;
import com.hpp.market.dto.WhatIfRequest;
import com.hpp.market.service.ExportService;
import com.hpp.market.service.MarketService;
import com.hpp.market.service.PropertyService;
import com.hpp.market.service.Segment;
import jakarta.validation.Valid;
import java.util.List;
import org.springdoc.core.annotations.ParameterObject;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import com.hpp.market.service.WhatIfService;

@RestController
@RequestMapping("/api/market")
public class MarketController {
    private final MarketService market;
    private final PropertyService properties;
    private final WhatIfService whatIf;
    private final ExportService export;

    public MarketController(MarketService market, PropertyService properties, WhatIfService whatIf, ExportService export) {
        this.market = market;
        this.properties = properties;
        this.whatIf = whatIf;
        this.export = export;
    }

    @GetMapping("/summary")
    public MarketSummary summary(@ParameterObject MarketFilter filter) {
        return market.summary(filter);
    }

    @GetMapping("/segments")
    public List<SegmentStat> segments(@RequestParam Segment by, @ParameterObject MarketFilter filter) {
        return market.segments(filter, by);
    }

    @GetMapping("/properties")
    public PageResponse<PropertyDto> properties(@ParameterObject MarketFilter filter, @ParameterObject Pageable pageable) {
        return properties.page(filter, pageable);
    }

    @PostMapping("/what-if")
    public List<WhatIfPoint> whatIf(@Valid @RequestBody WhatIfRequest request) {
        return whatIf.whatIf(request);
    }

    @GetMapping("/export.csv")
    public ResponseEntity<byte[]> csv(@ParameterObject MarketFilter filter) {
        return download(export.csv(filter), "text/csv", "market-export.csv");
    }

    @GetMapping("/export.pdf")
    public ResponseEntity<byte[]> pdf(@ParameterObject MarketFilter filter) {
        return download(export.pdf(filter), MediaType.APPLICATION_PDF_VALUE, "market-report.pdf");
    }

    private static ResponseEntity<byte[]> download(byte[] body, String type, String filename) {
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(type))
                .header(HttpHeaders.CONTENT_DISPOSITION, ContentDisposition.attachment().filename(filename).build().toString())
                .body(body);
    }
}
