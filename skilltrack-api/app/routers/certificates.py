"""Certificate PDFs for students, and a public page to check that a certificate is genuine."""
from io import BytesIO

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import Response
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4, landscape
from reportlab.pdfbase.pdfmetrics import stringWidth
from reportlab.pdfgen import canvas
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..config import FRONTEND_URL
from ..database import get_db
from ..deps import require_roles
from ..models import Attempt, Certificate, Domain, Level, User

router = APIRouter(tags=["certificates"])

student_only = require_roles("student")

INDIGO = colors.HexColor("#4f46e5")
SLATE = colors.HexColor("#334155")
MUTED = colors.HexColor("#64748b")


def _load(db: Session, code: str) -> tuple[Certificate, User, Level, Domain, int | None]:
    cert = db.scalar(select(Certificate).where(Certificate.code == code))
    if cert is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Certificate not found")
    holder = db.get(User, cert.user_id)
    level = db.get(Level, cert.level_id)
    domain = db.get(Domain, level.domain_id)
    score = db.scalar(
        select(Attempt.score).where(Attempt.user_id == holder.id, Attempt.level_id == level.id, Attempt.passed.is_(True))
        .order_by(Attempt.attempt_no)
    )
    return cert, holder, level, domain, score


def _title(domain: Domain, level: Level) -> str:
    return level.name if domain.is_common else f"{domain.name} – {level.name}"


def _render_pdf(cert: Certificate, holder: User, level: Level, domain: Domain, score: int | None) -> bytes:
    buffer = BytesIO()
    width, height = landscape(A4)
    pdf = canvas.Canvas(buffer, pagesize=(width, height))
    pdf.setTitle(f"Certificate {cert.code}")
    pdf.setAuthor("SkillTrack")

    # Double border
    pdf.setStrokeColor(INDIGO)
    pdf.setLineWidth(4)
    pdf.rect(28, 28, width - 56, height - 56)
    pdf.setLineWidth(1)
    pdf.rect(38, 38, width - 76, height - 76)

    max_text_width = width - 76 - 60  # inside the inner border, with breathing room

    def centred(text: str, y: float, font: str, size: int, colour=SLATE) -> None:
        while size > 8 and stringWidth(text, font, size) > max_text_width:
            size -= 1  # long names and titles shrink to fit instead of running off the page
        pdf.setFont(font, size)
        pdf.setFillColor(colour)
        pdf.drawCentredString(width / 2, y, text)

    centred("SKILLTRACK", height - 90, "Helvetica-Bold", 14, INDIGO)
    centred("Certificate of Achievement", height - 140, "Times-Bold", 36)
    centred("This is to certify that", height - 190, "Helvetica", 14, MUTED)
    centred(holder.name, height - 245, "Times-BoldItalic", 34, INDIGO)

    details = " · ".join(part for part in (holder.reg_no, holder.department) if part)
    if details:
        centred(details, height - 272, "Helvetica", 12, MUTED)

    centred("has successfully cleared", height - 315, "Helvetica", 14, MUTED)
    centred(_title(domain, level), height - 350, "Helvetica-Bold", 20)
    if score is not None:
        centred(f"Score: {score}%", height - 378, "Helvetica", 14)
    if cert.first_attempt:
        centred("Distinction: cleared on the first attempt", height - 402, "Helvetica-Oblique", 13, INDIGO)

    issued = cert.issued_at.strftime("%d %B %Y")
    centred(f"Issued on {issued}", 128, "Helvetica", 12)
    centred(f"Certificate ID: {cert.code}", 106, "Courier-Bold", 12)
    centred(f"Verify at {FRONTEND_URL}/verify/{cert.code}", 86, "Helvetica", 10, MUTED)

    pdf.showPage()
    pdf.save()
    return buffer.getvalue()


@router.get("/me/certificates/{code}/pdf")
def download_certificate(code: str, user: User = Depends(student_only), db: Session = Depends(get_db)):
    cert, holder, level, domain, score = _load(db, code)
    if holder.id != user.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Certificate not found")
    return Response(
        content=_render_pdf(cert, holder, level, domain, score),
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{cert.code}.pdf"'},
    )


@router.get("/verify/{code}")
def verify_certificate(code: str, db: Session = Depends(get_db)):
    """Public: anyone with a certificate ID can confirm it is genuine. Shows the minimum needed."""
    try:
        cert, holder, level, domain, score = _load(db, code)
    except HTTPException:
        return {"valid": False}
    return {
        "valid": True, "code": cert.code, "holder": holder.name, "credential": _title(domain, level),
        "score": score, "issued_at": cert.issued_at, "first_attempt": cert.first_attempt,
    }
