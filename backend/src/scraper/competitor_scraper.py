import re

from bs4 import BeautifulSoup
from playwright.async_api import TimeoutError as PlaywrightTimeout

from src.scraper.browser import amazon_page

_AMAZON_BASE = "https://www.amazon.com"
_STATIC_DELAY_MS = 3_000
_DYNAMIC_TIMEOUT_MS = 8_000


def _parse_bestseller_asins(soup: BeautifulSoup, exclude_asin: str, limit: int) -> list[str]:
    asins: list[str] = []

    def push(asin: str) -> None:
        clean = asin.strip().upper()
        if (
            clean
            and clean != exclude_asin
            and re.fullmatch(r"[A-Z0-9]{10}", clean)
            and clean not in asins
            and len(asins) < limit
        ):
            asins.append(clean)

    ranked_nodes = soup.select(
        ".s-main-slot div.s-result-item[data-component-type='s-search-result'][data-asin]"
    )

    for node in ranked_nodes:
        if len(asins) >= limit:
            break
        asin = (node.get("data-asin") or "").strip().upper()
        title_el = node.select_one("h2 span")
        title = title_el.get_text(" ", strip=True) if title_el else ""

        if not asin or not re.fullmatch(r"[A-Z0-9]{10}", asin):
            continue

        if asin == exclude_asin:
            continue

        if title:
            push(asin)

    return asins[:limit]


async def scrape_competitors(bestseller_path: str, exclude_asin: str, limit: int = 5) -> list[str]:
    url = bestseller_path if bestseller_path.startswith("http") else f"{_AMAZON_BASE}{bestseller_path}"

    async with amazon_page() as page:
        try:
            await page.goto(url, wait_until="domcontentloaded", timeout=30_000)
        except PlaywrightTimeout as exc:
            raise RuntimeError(f"Navigation timed out for {url}") from exc

        await page.wait_for_timeout(_STATIC_DELAY_MS)
        try:
            await page.wait_for_selector(".s-main-slot", timeout=_DYNAMIC_TIMEOUT_MS)
        except PlaywrightTimeout:
            pass

        html = await page.content()

    return _parse_bestseller_asins(BeautifulSoup(html, "html.parser"), exclude_asin, limit)
