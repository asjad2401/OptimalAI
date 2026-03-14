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
            tag = soup.select_one(
                "span[data-hook='rating-out-of-text'], span#acrPopover, i.a-icon-star span"
            )
            if tag and (match := re.search(r"([\d.]+) out of", tag.get_text())):
                return float(match.group(1))
        except Exception:
            pass
        return None

    @staticmethod
    def parse_review_count(soup: BeautifulSoup) -> int:
        try:
            tag = soup.select_one("#acrCustomerReviewText")
            if tag and (match := re.search(r"([\d,]+)", tag.get_text(strip=True))):
                return int(match.group(1).replace(",", ""))
        except Exception:
            pass
        return 0

    @staticmethod
    def parse_price(soup: BeautifulSoup) -> Optional[float]:
        try:
            tag = soup.select_one("span.a-price span.a-offscreen")
            if tag and (match := re.search(r"[\d.]+", tag.get_text(strip=True))):
                return float(match.group(0))
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
        try:
            block = soup.select_one("#detailBullets_feature_div")
            if not block:
                return None
            links = block.select("ul.zg_hrsr li a")
            if links:
                return links[-1].get("href")
            main_link = block.select_one("a[href*='/bestsellers/']")
            return main_link.get("href") if main_link else None
        except Exception:
            return None

