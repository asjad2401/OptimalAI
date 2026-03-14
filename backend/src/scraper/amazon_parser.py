import re
from typing import Dict, List, Optional

from bs4 import BeautifulSoup

from src.models.amazon import Review


class AmazonParser:

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
                    title_elem = review.select_one(
                        "a[data-hook='review-title'] span:not(.a-icon-alt):not(.a-letter-space)"
                    ) or review.select_one("a[data-hook='review-title'] span")
                    body_elem = review.select_one("span[data-hook='review-body'] span")
                    rating_elem = review.select_one("i[data-hook='review-star-rating'] span")
                    verified_elem = review.select_one("span[data-hook='avp-badge']")

                    if title_elem and body_elem and rating_elem:
                        rating_match = re.search(r"([\d.]+)", rating_elem.get_text())
                        if not rating_match:
                            continue
                        rating = float(rating_match.group(1))
                        reviews.append(
                            Review(
                                title=title_elem.get_text(strip=True),
                                body=body_elem.get_text(strip=True),
                                rating=rating,
                                is_verified=bool(
                                    verified_elem
                                    and "Verified Purchase" in verified_elem.get_text()
                                ),
                            )
                        )
                    else:
                        print(
                            f"Skipped malformed review. "
                            f"Title: {bool(title_elem)}, "
                            f"Body: {bool(body_elem)}, "
                            f"Rating: {bool(rating_elem)}"
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

