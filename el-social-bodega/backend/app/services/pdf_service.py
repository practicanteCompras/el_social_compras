"""PDF service — generate savings report using ReportLab."""

from io import BytesIO
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet

from app.services.order_service import get_order_with_savings


def generate_savings_pdf(order_id: int) -> bytes:
    """Generate a PDF cost savings report for the given order."""
    order = get_order_with_savings(order_id)
    items = order.get("items", [])

    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=letter, topMargin=0.5 * inch)
    styles = getSampleStyleSheet()
    elements = []

    elements.append(Paragraph("Reporte de Ahorro - Pedido", styles["Title"]))
    elements.append(Spacer(1, 12))

    meta_data = [
        ["Pedido #", str(order_id)],
        ["Sede", order.get("sede_name", "N/A")],
        ["Estado", order.get("status", "N/A")],
    ]
    meta_table = Table(meta_data, colWidths=[2 * inch, 4 * inch])
    meta_table.setStyle(TableStyle([
        ("FONTNAME", (0, 0), (0, -1), "Helvetica-Bold"),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
    ]))
    elements.append(meta_table)
    elements.append(Spacer(1, 20))

    table_data = [
        [
            "Producto",
            "Cantidad",
            "Proveedor Sugerido",
            "Precio Sugerido",
            "Precio Más Alto",
            "Ahorro",
        ]
    ]
    for item in items:
        suggested = item.get("suggested_price") or 0
        highest = item.get("highest_price") or suggested
        qty = item.get("quantity_requested", 0)
        savings = item.get("savings_per_item", (highest - suggested) * qty)
        table_data.append([
            item.get("product_name", "N/A"),
            str(qty),
            item.get("suggested_supplier_name", "N/A"),
            f"${suggested:,.0f}",
            f"${highest:,.0f}",
            f"${savings:,.0f}",
        ])

    total_suggested = order.get("total_suggested_cost", 0)
    total_highest = order.get("total_highest_cost", 0)
    total_savings = order.get("total_savings", 0)
    table_data.append(["TOTAL", "", "", f"${total_suggested:,.0f}", f"${total_highest:,.0f}", f"${total_savings:,.0f}"])

    col_widths = [1.8 * inch, 0.8 * inch, 1.5 * inch, 1.1 * inch, 1.1 * inch, 1 * inch]
    t = Table(table_data, colWidths=col_widths)
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1B5E20")),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, 0), 9),
        ("BOTTOMPADDING", (0, 0), (-1, 0), 8),
        ("BACKGROUND", (0, -1), (-1, -1), colors.HexColor("#E8F5E9")),
        ("FONTNAME", (0, -1), (-1, -1), "Helvetica-Bold"),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
        ("FONTSIZE", (0, 1), (-1, -1), 8),
        ("ALIGN", (1, 0), (-1, -1), "CENTER"),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("ROWBACKGROUNDS", (0, 1), (-1, -2), [colors.white, colors.HexColor("#F5F5F5")]),
    ]))
    elements.append(t)
    elements.append(Spacer(1, 20))

    elements.append(Paragraph(
        f"<b>Ahorro total estimado: ${total_savings:,.0f}</b>",
        styles["Heading3"],
    ))

    doc.build(elements)
    return buffer.getvalue()
