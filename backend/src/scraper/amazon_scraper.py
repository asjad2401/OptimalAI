import re
import asyncio

from bs4 import BeautifulSoup
from playwright.async_api import TimeoutError as PlaywrightTimeout

from src.models.amazon import CompetitorData, ProductData
from src.scraper.amazon_parser import AmazonParser
from src.scraper.browser import amazon_page

_BASE_URL = "https://www.amazon.com/dp/{asin}"
_STATIC_DELAY_MS = 1_500
_DYNAMIC_TIMEOUT_MS = 8_000

_READY_SELECTORS = [
    "#productTitle",
    "#feature-bullets",
    "#acrCustomerReviewText",
    "span.a-price",
]


def _asin_from_identifier(identifier: str) -> str:
    if re.fullmatch(r"[A-Z0-9]{10}", identifier, re.IGNORECASE):
        return identifier.upper()
    match = re.search(r"/dp/([A-Z0-9]{10})", identifier, re.IGNORECASE)
    if match:
        return match.group(1).upper()
    raise ValueError(f"Cannot extract ASIN from: {identifier!r}")


async def _wait_for_content(page) -> None:
    await page.wait_for_timeout(_STATIC_DELAY_MS)
    for selector in _READY_SELECTORS:
        try:
            await page.wait_for_selector(selector, timeout=_DYNAMIC_TIMEOUT_MS)
            return
        except PlaywrightTimeout:
            continue
    print("[scraper] warning: no content selectors matched, proceeding with current DOM.")


async def _load_soup(asin: str) -> tuple[str, BeautifulSoup]:
    url = _BASE_URL.format(asin=asin)

    async with amazon_page() as page:
        try:
            await page.goto(url, wait_until="domcontentloaded", timeout=30_000)
        except PlaywrightTimeout as exc:
            raise RuntimeError(f"Navigation timed out for {url}") from exc

        await _wait_for_content(page)
        html = await page.content()

    return url, BeautifulSoup(html, "html.parser")


def _build_product_payload(asin: str, url: str, soup: BeautifulSoup) -> dict:
    title = AmazonParser.parse_title(soup)
<<<<<<< HEAD

    return ProductData(
        asin=asin,
        url=url,
        title=title,
        bullet_points=AmazonParser.parse_bullet_points(soup),
        specifications=AmazonParser.parse_specifications(soup),
        rating=AmazonParser.parse_rating(soup),
        review_count=AmazonParser.parse_review_count(soup),
        price=AmazonParser.parse_price(soup),
        image_url=AmazonParser.parse_image_url(soup),
        reviews=AmazonParser.parse_reviews(soup, limit=10),
        best_seller_link=AmazonParser.get_best_seller_link(soup),
=======
    best_seller_link = AmazonParser.get_best_seller_link(soup)
    return {
        "asin": asin,
        "url": url,
        "title": title,
        "bullet_points": AmazonParser.parse_bullet_points(soup),
        "specifications": AmazonParser.parse_specifications(soup),
        "rating": AmazonParser.parse_rating(soup),
        "review_count": AmazonParser.parse_review_count(soup),
        "price": AmazonParser.parse_price(soup),
        "image_url": AmazonParser.parse_image_url(soup),
        "reviews": AmazonParser.parse_reviews(soup, limit=10),
        "best_seller_link": best_seller_link,
    }


async def _scrape_competitor_product(asin: str) -> CompetitorData | None:
    try:
        url, soup = await _load_soup(asin)
        payload = _build_product_payload(asin, url, soup)
        return CompetitorData(**payload)
    except Exception as exc:
        print(f"[scraper] competitor scrape failed for {asin}: {exc}")
        return None


async def scrape_product(identifier: str) -> ProductData:
    asin = _asin_from_identifier(identifier)
    url, soup = await _load_soup(asin)
    payload = _build_product_payload(asin, url, soup)
    best_seller_link = payload["best_seller_link"]

    competitor_asins = AmazonParser.parse_competitor_asins(soup, exclude_asin=asin)

    if len(competitor_asins) < 5 and best_seller_link:
        try:
            from_bs = await scrape_competitors(best_seller_link, exclude_asin=asin)
            for c in from_bs:
                if c not in competitor_asins:
                    competitor_asins.append(c)
                if len(competitor_asins) >= 5:
                    break
        except Exception as exc:
            print(f"[scraper] bestseller competitor scrape failed: {exc}")

    competitor_asins = competitor_asins[:5]
    scraped_competitors = await asyncio.gather(
        *[_scrape_competitor_product(c_asin) for c_asin in competitor_asins]
    )
    competitors = [c for c in scraped_competitors if c is not None]

    return ProductData(
        **payload,
        competitor_asins=competitor_asins,
        competitors=competitors,
>>>>>>> 6e2bd83 (scraping: SC24 - scrape competitor product data)
    )
