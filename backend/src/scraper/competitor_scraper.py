import re

from bs4 import BeautifulSoup
from playwright.async_api import TimeoutError as PlaywrightTimeout

from src.scraper.browser import amazon_page

_AMAZON_BASE = "https://www.amazon.com"
_STATIC_DELAY_MS = 3_000
_DYNAMIC_TIMEOUT_MS = 8_000


def _parse_bestseller_asins(soup: BeautifulSoup, exclude_asin: str, limit: int) -> list[str]:
    asins: list[str] = []

    for el in soup.select("[data-asin]"):
        if len(asins) >= limit:
            break
        asin = el.get("data-asin", "").strip().upper()
        if asin and asin != exclude_asin and re.fullmatch(r"[A-Z0-9]{10}", asin) and asin not in asins:
            asins.append(asin)

    if len(asins) < limit:
        for a in soup.select("a[href*='/dp/']"):
            if len(asins) >= limit:
                break
            match = re.search(r"/dp/([A-Z0-9]{10})", a.get("href", ""))
            if match:
                asin = match.group(1).upper()
                if asin != exclude_asin and asin not in asins:
                    asins.append(asin)

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
            await page.wait_for_selector("[data-asin]", timeout=_DYNAMIC_TIMEOUT_MS)
        except PlaywrightTimeout:
            pass

        html = await page.content()

    return _parse_bestseller_asins(BeautifulSoup(html, "html.parser"), exclude_asin, limit)
