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

    ranked_nodes = (
        soup.select("div[id^='p13n-asin-index-']")
        or soup.select("div[id='gridItemRoot'], div[id^='gridItemRoot']")
        or soup.select("ol li")
    )

    for node in ranked_nodes:
        if len(asins) >= limit:
            break
        data_asin_holder = node.select_one("[data-asin]")
        if data_asin_holder and data_asin_holder.get("data-asin"):
            push(data_asin_holder.get("data-asin", ""))
            if len(asins) >= limit:
                break
        link = node.select_one("a[href*='/dp/']")
        if link:
            match = re.search(r"/dp/([A-Z0-9]{10})", link.get("href", ""))
            if match:
                push(match.group(1))

    for el in soup.select("[data-asin]"):
        if len(asins) >= limit:
            break
        push(el.get("data-asin", ""))

    if len(asins) < limit:
        for a in soup.select("a[href*='/dp/']"):
            if len(asins) >= limit:
                break
            match = re.search(r"/dp/([A-Z0-9]{10})", a.get("href", ""))
            if match:
                push(match.group(1))

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
