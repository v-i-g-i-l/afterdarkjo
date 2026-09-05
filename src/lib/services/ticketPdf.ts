import PDFDocument from "pdfkit";
import QRCode from "qrcode";

export interface TicketPdfData {
  eventName: string;
  eventDate: Date;
  venueName: string;
  venueCity: string;
  ticketTypeName: string;
  customerName: string;
  ticketNumber: string;
  orderNumber: string;
  qrToken: string;
  appUrl: string;
  status: "VALID" | "USED" | "CANCELLED" | "REFUNDED";
}

/** Renders a single, individually-scannable PDF ticket. Returns a Buffer. */
export async function renderTicketPdf(data: TicketPdfData): Promise<Buffer> {
  const verifyUrl = `${data.appUrl}/ticket/verify/${data.qrToken}`;
  const qrDataUrl = await QRCode.toDataURL(verifyUrl, {
    margin: 1,
    width: 400,
    color: { dark: "#0A0A0F", light: "#FFFFFF" },
  });
  const qrBuffer = Buffer.from(qrDataUrl.split(",")[1], "base64");

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: [419.5, 595.3], margin: 0 }); // ~148x210mm ticket card
    const chunks: Buffer[] = [];
    doc.on("data", (c) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const pageW = doc.page.width;
    const pageH = doc.page.height;

    // Background
    doc.rect(0, 0, pageW, pageH).fill("#0A0A0F");

    // Top accent gradient bar
    doc.rect(0, 0, pageW, 8).fill("#D4AF37");

    // Brand / event name block
    doc
      .fillColor("#8A8A99")
      .fontSize(9)
      .font("Helvetica")
      .text("AFTERDARK.JO — OFFICIAL TICKET", 32, 36, { characterSpacing: 1.5 });

    doc
      .fillColor("#FFFFFF")
      .fontSize(24)
      .font("Helvetica-Bold")
      .text(data.eventName, 32, 56, { width: pageW - 64 });

    doc
      .fillColor("#D4AF37")
      .fontSize(13)
      .font("Helvetica-Bold")
      .text(data.ticketTypeName.toUpperCase(), 32, 100, { characterSpacing: 1 });

    // Divider
    doc
      .moveTo(32, 128)
      .lineTo(pageW - 32, 128)
      .strokeColor("#26262E")
      .lineWidth(1)
      .stroke();

    const labelColor = "#8A8A99";
    const valueColor = "#FFFFFF";

    function field(label: string, value: string, x: number, y: number, w: number) {
      doc.fillColor(labelColor).fontSize(8).font("Helvetica").text(label, x, y, {
        width: w,
        characterSpacing: 1,
      });
      doc
        .fillColor(valueColor)
        .fontSize(12)
        .font("Helvetica-Bold")
        .text(value, x, y + 12, { width: w });
    }

    const dateStr = data.eventDate.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
    const timeStr = data.eventDate.toLocaleTimeString("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
    });

    field("GUEST NAME", data.customerName, 32, 148, pageW - 64);
    field("DATE", dateStr, 32, 190, 170);
    field("TIME", timeStr, 220, 190, 160);
    field("VENUE", `${data.venueName}, ${data.venueCity}`, 32, 232, pageW - 64);
    field("TICKET NUMBER", data.ticketNumber, 32, 274, 170);
    field("ORDER NUMBER", data.orderNumber, 220, 274, 160);

    // QR block
    const qrSize = 210;
    const qrX = (pageW - qrSize) / 2;
    const qrY = 330;
    doc.roundedRect(qrX - 16, qrY - 16, qrSize + 32, qrSize + 32, 12).fill("#FFFFFF");
    doc.image(qrBuffer, qrX, qrY, { width: qrSize, height: qrSize });

    const statusY = qrY + qrSize + 36;
    const isValid = data.status === "VALID";
    doc
      .roundedRect(32, statusY, pageW - 64, 34, 6)
      .fill(isValid ? "#123822" : "#3A1414");
    doc
      .fillColor(isValid ? "#4ADE80" : "#F87171")
      .fontSize(13)
      .font("Helvetica-Bold")
      .text(isValid ? "VALID TICKET" : data.status, 32, statusY + 10, {
        width: pageW - 64,
        align: "center",
        characterSpacing: 1.5,
      });

    doc
      .fillColor("#8A8A99")
      .fontSize(7.5)
      .font("Helvetica")
      .text(
        "This ticket is valid for one (1) admission and can only be scanned once. Present this PDF or its QR code at the entrance.",
        32,
        statusY + 54,
        { width: pageW - 64, align: "center" }
      );

    doc.end();
  });
}
