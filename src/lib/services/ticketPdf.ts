import PDFDocument from "pdfkit";
import QRCode from "qrcode";
import path from "path";
import fs from "fs";
import arabicReshaper from "arabic-reshaper";

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

// دالة لمعالجة الحروف العربية وربطها بشكل صحيح
function processText(text: string) {
  if (!text) return "";
  const hasArabic = /[\u0600-\u06FF]/.test(text);
  if (hasArabic) {
    // ربط الحروف ثم عكسها لأن PDFKit يطبع من اليسار لليمين
    return arabicReshaper.reshape(text).split("").reverse().join("");
  }
  return text;
}

export async function renderTicketPdf(data: TicketPdfData): Promise<Buffer> {
  const verifyUrl = `${data.appUrl}/ticket/verify/${data.qrToken}`;
  const qrDataUrl = await QRCode.toDataURL(verifyUrl, {
    margin: 1,
    width: 400,
    color: { dark: "#0A0A0F", light: "#FFFFFF" },
  });
  const qrBuffer = Buffer.from(qrDataUrl.split(",")[1], "base64");

  return new Promise((resolve, reject) => {
    // تم زيادة طول الصفحة إلى 750 لمنع ظهور صفحات بيضاء إضافية
    const doc = new PDFDocument({ size: [420, 750], margin: 0 });
    const chunks: Buffer[] = [];
    doc.on("data", (c) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const pageW = doc.page.width;
    const pageH = doc.page.height;

    // مسارات الخطوط العربية (تأكد من وجودها في مجلد public/fonts)
    const regularFontPath = path.join(process.cwd(), "public", "fonts", "Cairo-Regular.ttf");
    const boldFontPath = path.join(process.cwd(), "public", "fonts", "Cairo-Bold.ttf");
    
    // التحقق من وجود الخطوط لمنع الأخطاء في السيرفر
    const fontRegular = fs.existsSync(regularFontPath) ? regularFontPath : "Helvetica";
    const fontBold = fs.existsSync(boldFontPath) ? boldFontPath : "Helvetica-Bold";

    // 1. الخلفية الأساسية
    doc.rect(0, 0, pageW, pageH).fill("#0A0A0F");

    // 2. شريط الألوان العلوي
    doc.rect(0, 0, pageW, 10).fill("#D4AF37");

    // 3. اسم البراند
    doc
      .fillColor("#8A8A99")
      .fontSize(10)
      .font(fontBold)
      .text("AFTERDARK.JO — OFFICIAL TICKET", 32, 40, { characterSpacing: 2 });

    // 4. اسم الحدث (مع دعم العربي)
    doc
      .fillColor("#FFFFFF")
      .fontSize(26)
      .font(fontBold)
      .text(processText(data.eventName), 32, 65, { width: pageW - 64, align: "left" });

    // 5. نوع التذكرة
    doc
      .fillColor("#D4AF37")
      .fontSize(14)
      .font(fontBold)
      .text(processText(data.ticketTypeName).toUpperCase(), 32, 105, { characterSpacing: 1.5 });

    // خط فاصل بتصميم متقطع
    doc
      .moveTo(32, 135)
      .lineTo(pageW - 32, 135)
      .strokeColor("#26262E")
      .lineWidth(2)
      .dash(5, { space: 5 })
      .stroke()
      .undash();

    // 6. البيانات الأساسية
    const labelColor = "#8A8A99";
    const valueColor = "#FFFFFF";

    function field(label: string, value: string, x: number, y: number, w: number, alignRight = false) {
      doc
        .fillColor(labelColor)
        .fontSize(9)
        .font(fontRegular)
        .text(label, x, y, { width: w, align: alignRight ? "right" : "left" });
      doc
        .fillColor(valueColor)
        .fontSize(13)
        .font(fontBold)
        .text(processText(value), x, y + 14, { width: w, align: alignRight ? "right" : "left" });
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
    const venueFull = `${data.venueName}, ${data.venueCity}`;

    // ترتيب شبكي (Grid) أنظف للمعلومات
    field("GUEST NAME", data.customerName, 32, 160, pageW - 64);
    field("DATE", dateStr, 32, 210, 150);
    field("TIME", timeStr, 220, 210, 160, true);
    
    field("VENUE", venueFull, 32, 260, pageW - 64);
    
    field("TICKET NUMBER", data.ticketNumber, 32, 310, 150);
    field("ORDER NUMBER", data.orderNumber, 220, 310, 160, true);

    // 7. الـ QR Code داخل مربع ذو حواف دائرية واضحة
    const qrSize = 190;
    const qrX = (pageW - qrSize) / 2;
    const qrY = 380;
    
    doc
      .roundedRect(qrX - 12, qrY - 12, qrSize + 24, qrSize + 24, 16)
      .fill("#FFFFFF");
    doc.image(qrBuffer, qrX, qrY, { width: qrSize, height: qrSize });

    // 8. حالة التذكرة
    const statusY = qrY + qrSize + 40;
    const isValid = data.status === "VALID";
    
    doc
      .roundedRect(32, statusY, pageW - 64, 44, 8)
      .fill(isValid ? "#064E3B" : "#7F1D1D"); // ألوان أعمق للخلفية

    doc
      .fillColor(isValid ? "#34D399" : "#FCA5A5")
      .fontSize(15)
      .font(fontBold)
      .text(isValid ? "VALID TICKET" : data.status, 32, statusY + 14, {
        width: pageW - 64,
        align: "center",
        characterSpacing: 2,
      });

    // 9. نص توضيحي سفلي
    doc
      .fillColor("#52525B")
      .fontSize(8)
      .font(fontRegular)
      .text(
        "This ticket is valid for one (1) admission and can only be scanned once.\nPresent this PDF or its QR code at the entrance.",
        32,
        statusY + 65,
        { width: pageW - 64, align: "center", lineGap: 3 }
      );

    doc.end();
  });
}
