"""
PIX mock para desenvolvimento — estrutura pronta para trocar por provedor real.

Gera payload textual fictício + QR Code PNG em Base64 (código escaneável genérico).
Integração futura: substituir generate_mock_pix por chamada HTTP ao PSP.
"""
import base64
import io
import secrets

from decimal import Decimal

# Opcional: qrcode só se instalado
try:
    import qrcode

    _HAS_QR = True
except ImportError:
    _HAS_QR = False


def build_mock_pix_copia_cola(*, nome_recebedor: str, valor: Decimal, txid: str) -> str:
    """
    String fictícia no estilo “copia e cola” (NÃO é PIX válido para pagamento real).
    Formato legível para testes e demos.
    """
    v = valor.quantize(Decimal("0.01"))
    return (
        "00020126MOCKPIX01BR.GOV.BCB.PIX0136"
        f"{txid}520400005303986540{v}5802BR5913{nome_recebedor[:13]:<13}6009SAO PAULO"
        "62070503***6304MOCK"
    )


def qr_png_base64(data: str) -> str | None:
    if not _HAS_QR:
        return None
    img = qrcode.make(data, box_size=4, border=2)
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return base64.b64encode(buf.getvalue()).decode("ascii")


def generate_mock_pix_for_participant(
    *,
    participant_nome: str,
    valor: Decimal,
    event_codigo: str,
) -> tuple[str, str | None, str]:
    """
    Retorna (pix_copia_cola, qr_base64_ou_None, payment_token).
    """
    txid = secrets.token_hex(8).upper()
    token = secrets.token_urlsafe(24)
    nome = "".join(c for c in participant_nome if c.isalnum() or c in " ")[:40] or "Participante"
    payload = build_mock_pix_copia_cola(nome_recebedor=nome, valor=valor, txid=txid)
    # Inclui código do evento no payload mock para rastreio visual
    payload = f"{payload}|EVT:{event_codigo}|MOCK"
    b64 = qr_png_base64(payload)
    return payload, b64, token
