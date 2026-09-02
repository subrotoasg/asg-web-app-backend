import PDFDocument from "pdfkit";
import axios from "axios";

export class PDFGenerator {
  createDocument(options = {}) {
    return new PDFDocument({
      margin: 20,
      size: "A4",
      ...options,
    });
  }

  async fetchImageBuffer(url) {
    try {
      const response = await axios.get(url, {
        responseType: "arraybuffer",
        timeout: 5000,
      });
      return Buffer.from(response.data, "binary");
    } catch (err) {
      console.error("Failed to load image:", err.message);
      return null;
    }
  }

  generateHeader(
    doc,
    { title, logoBuffer, date, fontSize = 16, textColor = "#333333" }
  ) {
    if (logoBuffer) {
      doc.image(logoBuffer, doc.page.width / 2 - 40, 20, { width: 80 });
    }
    doc.moveDown(2);
    doc
      .fontSize(8)
      .font("Helvetica")
      .fillColor("#666666")
      .text(`Generated on: ${date.toLocaleString()}`, { align: "center" });

    // Divider line
    doc
      .moveTo(40, doc.y)
      .lineTo(doc.page.width - 40, doc.y)
      .strokeColor("#cccccc")
      .lineWidth(1)
      .stroke();
    doc.moveDown(2);
  }

  //   generateSection(doc, { title, content, gap = 50 }) {
  //     // Section title
  //     if (title) {
  //       doc
  //         .fontSize(13)
  //         .fillColor("#155496")
  //         .font("Helvetica-Bold")
  //         .text(title, { align: "left" });

  //       // underline / divider under section title
  //       doc
  //         .moveTo(40, doc.y + 2)
  //         .lineTo(doc.page.width - 40, doc.y + 2)
  //         .strokeColor("#e0e0e0")
  //         .lineWidth(1)
  //         .stroke();
  //       doc.moveDown(1.5);
  //     }

  //     // Section body/content
  //     if (content) {
  //       doc
  //         .fontSize(11)
  //         .fillColor("#000000")
  //         .font("Helvetica")
  //         .text(content, { align: "left" });
  //     }

  //     // Add spacing after section
  //     doc.moveDown();
  //     doc.y += gap;
  //   }
  generateSection(doc, { title, content, gap = 50 }) {
    if (title) {
      // Section title: bold + color
      doc
        .fontSize(13)
        .fillColor("#25384d") // Title color
        .font("Helvetica-Bold") // Bold
        .text(title, 50, doc.y, { align: "left" });

      // Divider line under the title
      doc
        .moveTo(50, doc.y + 2) // start x, y
        .lineTo(doc.page.width - 50, doc.y + 2) // end x, y
        .strokeColor("#e0e0e0")
        .lineWidth(1)
        .stroke();

      doc.moveDown(1.5);
    }

    // Section content
    if (content) {
      doc
        .fontSize(10)
        .fillColor("#25384d")
        .font("Helvetica")
        .text(content, { align: "left" });
    }
  }
  generateTable(doc, options) {
    const {
      data = [],
      headers,
      columnWidths,
      startY = doc.y,
      rowHeight = 30,
      headerColor = "#ffffff",
      headerBg = "#293c50",
      rowColors = { even: "#f9f9f9", odd: "#ffffff" },
      textColor = "#000000",
    } = options;

    if (!data || data.length === 0) {
      doc.text("No data available", 50, startY);
      return startY + rowHeight;
    }

    let y = startY;
    const tableWidth = columnWidths.reduce((a, b) => a + b, 0);

    // Draw table header
    doc.fontSize(10).fillColor(headerColor).font("Helvetica-Bold");
    doc.rect(50, y, tableWidth, rowHeight).fill(headerBg);

    headers.forEach((header, i) => {
      doc
        .fillColor(headerColor)
        .text(
          header,
          50 + columnWidths.slice(0, i).reduce((a, b) => a + b, 0) + 5,
          y + 8,
          {
            width: columnWidths[i] - 10,
            align: "left",
          }
        );
    });

    y += rowHeight;

    // Draw table rows
    data.forEach((row, rowIndex) => {
      if (y + rowHeight > doc.page.height - 60) {
        doc.addPage();
        y = 50;
      }

      const rowColor = rowIndex % 2 === 0 ? rowColors.even : rowColors.odd;
      doc.rect(50, y, tableWidth, rowHeight).fill(rowColor);

      headers.forEach((header, colIndex) => {
        doc
          .fillColor(textColor)
          .font("Helvetica")
          .text(
            row[header]?.toString() || "-",
            50 + columnWidths.slice(0, colIndex).reduce((a, b) => a + b, 0) + 5,
            y + 8,
            {
              width: columnWidths[colIndex] - 10,
              align: "left",
            }
          );
      });

      y += rowHeight;
    });

    doc.moveDown(2);
    return y;
  }

  generateFooter(doc, { text, fontSize = 10, textColor = "#666666" }) {
    const { width, height } = doc.page;
    doc
      .fontSize(fontSize)
      .fillColor(textColor)
      .font("Helvetica")
      .text(text, 40, 800, {
        align: "center",
        width: width - 80,
      });
  }
}
