package com.hpp.market.service;

import com.hpp.market.domain.Property;
import com.hpp.market.dto.MarketFilter;
import com.hpp.market.dto.MarketSummary;
import com.lowagie.text.Document;
import com.lowagie.text.FontFactory;
import com.lowagie.text.PageSize;
import com.lowagie.text.Paragraph;
import com.lowagie.text.pdf.PdfPTable;
import com.lowagie.text.pdf.PdfWriter;
import java.io.ByteArrayOutputStream;
import java.nio.charset.StandardCharsets;
import java.util.List;
import org.springframework.stereotype.Service;

@Service
public class ExportService {
    private static final String[] COLS = {"id", "square_footage", "bedrooms", "bathrooms", "year_built", "lot_size",
            "distance_to_city_center", "school_rating", "price"};

    private final PropertyService properties;
    private final MarketService market;

    public ExportService(PropertyService properties, MarketService market) {
        this.properties = properties;
        this.market = market;
    }

    public byte[] csv(MarketFilter f) {
        StringBuilder sb = new StringBuilder(String.join(",", COLS)).append('\n');
        for (Property p : properties.all(f)) sb.append(String.join(",", row(p))).append('\n');
        return sb.toString().getBytes(StandardCharsets.UTF_8);
    }

    public byte[] pdf(MarketFilter f) {
        List<Property> rows = properties.all(f);
        MarketSummary s = market.summary(f);
        var out = new ByteArrayOutputStream();
        var doc = new Document(PageSize.A4.rotate());
        PdfWriter.getInstance(doc, out);
        doc.open();
        doc.add(new Paragraph("Property Market Report", FontFactory.getFont(FontFactory.HELVETICA_BOLD, 16)));
        doc.add(new Paragraph("Properties: %d | Avg price: %,.0f | Median: %,.0f | Min: %,.0f | Max: %,.0f | Avg $/sqft: %.1f"
                .formatted(s.count(), s.avgPrice(), s.medianPrice(), s.minPrice(), s.maxPrice(), s.avgPricePerSqft())));
        var table = new PdfPTable(COLS.length);
        table.setSpacingBefore(10);
        for (String c : COLS) table.addCell(c);
        for (Property p : rows) for (String v : row(p)) table.addCell(v);
        doc.add(table);
        doc.close();
        return out.toByteArray();
    }

    private static String[] row(Property p) {
        return new String[]{String.valueOf(p.getId()), fmt(p.getSquareFootage()), String.valueOf(p.getBedrooms()),
                fmt(p.getBathrooms()), String.valueOf(p.getYearBuilt()), fmt(p.getLotSize()),
                fmt(p.getDistanceToCityCenter()), fmt(p.getSchoolRating()), fmt(p.getPrice())};
    }

    private static String fmt(double d) {
        return d == Math.rint(d) ? String.valueOf((long) d) : String.valueOf(d);
    }
}
