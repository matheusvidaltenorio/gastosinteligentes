"""Montagem de links wa.me — pronto para evoluir para WhatsApp Cloud API."""
from urllib.parse import quote


def build_whatsapp_url(message: str, phone_e164: str | None = None) -> str:
    """
    phone_e164: ex. 5511999998888 (sem +). Se None, abre WhatsApp Web/App sem destino fixo.
    """
    text = quote(message, safe="")
    if phone_e164 and phone_e164.isdigit():
        return f"https://wa.me/{phone_e164}?text={text}"
    return f"https://wa.me/?text={text}"


def link_pix_no_evento(link_publico: str, participant_id: str) -> str:
    """Link da página pública com âncora do participante (copiar PIX no banco)."""
    base = (link_publico or "").strip()
    if not base:
        return ""
    sep = "&" if "?" in base else "?"
    return f"{base}{sep}p={participant_id}"


def message_evento_geral(*, nome_evento: str, codigo: str, link_publico: str) -> str:
    return (
        f"Olá! Participe do evento *{nome_evento}*.\n"
        f"Código: {codigo}\n"
        f"Acesse: {link_publico}\n"
        "Abra o link para ver valores e status de pagamento."
    )


# wa.me costuma falhar com URLs muito longas; texto PIX EMV pode ser grande.
_MAX_ENCODED_WA_TEXT = 2800


def _encoded_len(s: str) -> int:
    return len(quote(s, safe=""))


def message_participante(
    *,
    nome_evento: str,
    nome_participante: str,
    valor_devido: str,
    valor_total_evento: str,
    codigo: str,
    link_publico: str,
    participant_id: str,
    pix_code: str | None = None,
) -> str:
    """
    Mensagem com:
    - link direto à página do evento (?p=id) para abrir e copiar o PIX;
    - código PIX completo para colar no app do banco (PIX → copia e cola).
    Se o texto codificado exceder o limite do wa.me, mantém o link e orienta a copiar pelo link.
    """
    link_pix = link_pix_no_evento(link_publico, participant_id)

    head = [
        f"Olá, {nome_participante}! 👋",
        f"Você está no evento *{nome_evento}*.",
        "",
        f"💰 Valor total do evento: R$ {valor_total_evento}",
        f"📌 Sua parte a pagar: R$ {valor_devido}",
        f"🔑 Código do evento: {codigo}",
        "",
    ]

    if link_pix:
        head.extend(
            [
                "🔗 *Link para abrir seu PIX e copiar no banco*",
                "(toque no endereço abaixo — precisa começar com https://)",
                "",
                link_pix,
                "",
                "Na página: *Copiar código PIX*. No app do banco: PIX → copia e cola.",
                "",
            ]
        )
    else:
        head.extend([f"🔗 Link do evento: {link_publico}", ""])

    pc = (pix_code or "").strip()
    if pc:
        body = [
            "📋 *Código PIX — copiar e colar no app do banco:*",
            pc,
            "",
            "Passo a passo: abra seu banco → área *PIX* → *Pagar com PIX* ou *Copia e cola* → cole o código acima.",
            "",
        ]
    else:
        body = [
            "O organizador ainda não gerou o código PIX para você.",
            "Abra o link acima e atualize a página mais tarde, ou peça o código por aqui.",
            "",
        ]

    tail = ["Obrigado!"]
    msg = "\n".join(head + body + tail)

    if _encoded_len(msg) > _MAX_ENCODED_WA_TEXT and pc:
        msg = "\n".join(
            head
            + [
                "📋 O código PIX é longo demais para caber inteiro aqui.",
                "Use *só o link acima*: abra no navegador e copie o código completo na página (botão *Copiar código PIX*).",
                "",
                "Depois: banco → PIX → copia e cola → colar.",
                "",
            ]
            + tail
        )

    return msg
