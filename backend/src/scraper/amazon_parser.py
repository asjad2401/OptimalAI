import re
from typing import Dict, List, Optional

from bs4 import BeautifulSoup

from src.models.amazon import Review


class AmazonParser:

    @staticmethod
    def _select_first(node, selectors: List[str]):
        for selector in selectors:
            el = node.select_one(selector)
            if el:
                return el
        return None

    @staticmethod
    def _text_first(node, selectors: List[str]) -> Optional[str]:
        el = AmazonParser._select_first(node, selectors)
        if not el:
            return None
        text = el.get_text(" ", strip=True)
        return text or None

    @staticmethod
    def _extract_numeric_token(text: str) -> Optional[float]:
        if not text:
            return None

        cleaned = text.replace("\u00a0", " ").strip()
        match = re.search(r"(\d+[\d.,]*)", cleaned)
        if not match:
            return None

        token = match.group(1).replace(" ", "")
        if "," in token and "." in token:
            if token.rfind(",") > token.rfind("."):
                token = token.replace(".", "").replace(",", ".")
            else:
                token = token.replace(",", "")
        elif token.count(",") == 1 and token.count(".") == 0:
            token = token.replace(",", ".")
        else:
            token = token.replace(",", "")

        try:
            return float(token)
        except Exception:
            return None

    @staticmethod
    def parse_title(soup: BeautifulSoup) -> Optional[str]:
        try:
            tag = soup.select_one("#productTitle")
            if tag:
                return tag.get_text(strip=True)
        except Exception:
            pass
        return None

    @staticmethod
    def parse_bullet_points(soup: BeautifulSoup) -> List[str]:
        try:
            return [
                li.get_text(strip=True)
                for li in soup.select("#feature-bullets li:not(.a-hidden)")
                if li.get_text(strip=True)
            ]
        except Exception:
            return []

    @staticmethod
    def parse_specifications(soup: BeautifulSoup) -> Dict[str, str]:
        try:
            specs: Dict[str, str] = {}
            for row in soup.select("table.a-normal tr"):
                cols = row.find_all("td")
                if len(cols) == 2:
                    k = cols[0].get_text(strip=True)
                    v = cols[1].get_text(strip=True)
                    if k and v:
                        specs[k] = v
            return specs
        except Exception:
            return {}

    @staticmethod
    def parse_rating(soup: BeautifulSoup) -> Optional[float]:
        try:
            selectors = [
                "span[data-hook='rating-out-of-text']",
                "span#acrPopover",
                "span#acrPopover span.a-icon-alt",
                "i.a-icon-star span.a-icon-alt",
                "div#averageCustomerReviews span.a-icon-alt",
                "i[data-hook='average-star-rating'] span.a-icon-alt",
            ]

            for selector in selectors:
                tag = soup.select_one(selector)
                if not tag:
                    continue

                text = tag.get_text(" ", strip=True)
                value = AmazonParser._extract_numeric_token(text)
                if value is not None and 0 <= value <= 5:
                    return value
        except Exception:
            pass
        return None

    @staticmethod
    def parse_review_count(soup: BeautifulSoup) -> int:
        try:
            selectors = [
                "#acrCustomerReviewText",
                "span[data-hook='total-review-count']",
                "div#averageCustomerReviews span[data-csa-c-content-id='acrCustomerReviewText']",
                "a[href*='#customerReviews'] span",
            ]

            for selector in selectors:
                tag = soup.select_one(selector)
                if not tag:
                    continue
                text = tag.get_text(" ", strip=True)
                match = re.search(r"([\d.,\s]+)", text)
                if not match:
                    continue
                normalized = re.sub(r"[^\d]", "", match.group(1))
                if normalized:
                    return int(normalized)
        except Exception:
            pass
        return 0

    @staticmethod
    def parse_price(soup: BeautifulSoup) -> Optional[float]:
        try:
            selectors = [
                "span.a-price span.a-offscreen",
                "#corePrice_feature_div span.a-price span.a-offscreen",
                "#corePriceDisplay_desktop_feature_div span.a-price span.a-offscreen",
                "#apex_desktop span.a-price span.a-offscreen",
                "#priceblock_ourprice",
                "#priceblock_dealprice",
                "#price_inside_buybox",
                "span[data-a-color='price'] span.a-offscreen",
                "span.aok-offscreen",
            ]

            for selector in selectors:
                tag = soup.select_one(selector)
                if not tag:
                    continue

                text = tag.get_text(" ", strip=True) or tag.get("aria-label", "")
                value = AmazonParser._extract_numeric_token(text)
                if value is not None and value > 0:
                    return value
        except Exception:
            pass
        return None

    @staticmethod
    def parse_image_url(soup: BeautifulSoup) -> Optional[str]:
        try:
            tag = soup.select_one("#landingImage, #imgBlkFront")
            if tag:
                return tag.get("data-old-hires") or tag.get("src")
        except Exception:
            pass
        return None

    @staticmethod
    def parse_reviews(soup: BeautifulSoup, limit: int = 10) -> List[Review]:
        try:
            reviews: List[Review] = []
            for review in soup.select("[data-hook='review']"):
                if len(reviews) >= limit:
                    break
                try:
                    title = AmazonParser._text_first(
                        review,
                        [
                            "a[data-hook='review-title'] span:last-child",
                            "span[data-hook='review-title'] span:last-child",
                            "a[data-hook='review-title'] span:not(.a-icon-alt):not(.a-letter-space)",
                            "span[data-hook='review-title']",
                        ],
                    )
                    body = AmazonParser._text_first(
                        review,
                        [
                            "span[data-hook='review-body'] span[data-hook='review-collapsed'] span",
                            "span[data-hook='review-body'] div[data-hook='review-collapsed'] span",
                            "span[data-hook='review-body'] span",
                            "div[data-hook='review-collapsed'] span",
                            "span[data-hook='review-body']",
                        ],
                    )
                    rating_text = AmazonParser._text_first(
                        review,
                        [
                            "i[data-hook='review-star-rating'] span.a-icon-alt",
                            "i[data-hook='cmps-review-star-rating'] span.a-icon-alt",
                            "i.review-rating span.a-icon-alt",
                            "span[data-hook='review-star-rating']",
                        ],
                    )
                    verified_text = AmazonParser._text_first(
                        review,
                        [
                            "span[data-hook='avp-badge']",
                            "span[data-hook='vine-badge']",
                        ],
                    )

                    if title and body and rating_text:
                        rating_match = re.search(r"([\d.]+)", rating_text)
                        if not rating_match:
                            continue
                        reviews.append(
                            Review(
                                title=title,
                                body=body,
                                rating=float(rating_match.group(1)),
                                is_verified=bool(
                                    verified_text and "verified purchase" in verified_text.lower()
                                ),
                            )
                        )
                except Exception as e:
                    print(f"Review parsing exception: {e}")
                    continue
            return reviews
        except Exception:
            return []

    @staticmethod
    def get_best_seller_link(soup: BeautifulSoup) -> Optional[str]:
        # Step 1: from breadcrumbs, use the last anchor (most specific category)
        _SELECTORS = [
            "#wayfinding-breadcrumbs_feature_div ul a",
            "#wayfinding-breadcrumbs_feature_div a",
        ]
        try:
            for selector in _SELECTORS:
                anchors = soup.select(selector)
                anchors = [a for a in anchors if a.get("href")]
                if anchors:
                    return anchors[-1].get("href")
        except Exception:
            pass
        return None

    @staticmethod
    def parse_competitor_asins(soup: BeautifulSoup, exclude_asin: str, limit: int = 5) -> List[str]:
        try:
            asins: List[str] = []
            items = (
                soup.select("div[id^='gridItemRoot']")
                or soup.select("li.a-carousel-card")
                or soup.select("div[data-asin]")
                or soup.select("div.s-result-item")
            )
            for item in items:
                if len(asins) >= limit:
                    break
                item_asin = (item.get("data-asin") or "").strip().upper()
                if re.fullmatch(r"[A-Z0-9]{10}", item_asin) and item_asin != exclude_asin and item_asin not in asins:
                    asins.append(item_asin)
                    if len(asins) >= limit:
                        break
                link = item.select_one("a[href*='/dp/']")
                if not link:
                    continue
                match = re.search(r"/dp/([A-Z0-9]{10})", link.get("href", ""))
                if match:
                    asin = match.group(1).upper()
                    if asin != exclude_asin and asin not in asins:
                        asins.append(asin)
            return asins
        except Exception:
            return []
