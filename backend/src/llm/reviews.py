import importlib
import json

from src.config import settings
from src.models.amazon import ProductData
from src.models.scraper import ReviewAnalysis


def _to_review_payload(data: ProductData) -> dict:
    return {
        "seller_reviews": [
            {
                "rating": r.rating,
                "title": r.title,
                "body": r.body
            }
            for r in data.reviews
        ]
    }


async def generate_review_themes(data: ProductData) -> ReviewAnalysis:
    if not settings.GEMINI_API_KEY:
        raise RuntimeError("GEMINI_API_KEY is not configured")

    langchain_core_messages = importlib.import_module("langchain_core.messages")
    langchain_google_genai = importlib.import_module("langchain_google_genai")
    HumanMessage = getattr(langchain_core_messages, "HumanMessage")
    SystemMessage = getattr(langchain_core_messages, "SystemMessage")
    ChatGoogleGenerativeAI = getattr(langchain_google_genai, "ChatGoogleGenerativeAI")

    llm = ChatGoogleGenerativeAI(
        model=settings.GEMINI_MODEL,
        google_api_key=settings.GEMINI_API_KEY,
        temperature=0.1,
    )

    structured_llm = llm.with_structured_output(ReviewAnalysis)
    payload = _to_review_payload(data)

    prompt_rules = (
        "Goal: analyze review themes and patterns to extract actionable insights.\n"
        "Go through the reviews and identify common themes (e.g. 'Build Quality', 'Customer Service').\n"
        "For each theme, provide a concise description, whether the sentiment is positive, negative, or mixed, "
        "and its prevalence ('high', 'medium', 'low').\n"
        "Write in plain, objective language.\n"
        "Do not output technical jargon or subjective fluff.\n"
        "Ensure the overall sentiment summary accurately reflects the aggregate review sentiment."
    )

    return await structured_llm.ainvoke(
        [
            SystemMessage(
                content=(
                    "You are a qualitative data analyst specializing in customer sentiment and reviews. "
                    "Extract structured themes and patterns from customer feedback. "
                    "Prefer concise, high-signal analysis."
                )
            ),
            HumanMessage(
                content=(
                    "Analyze the product reviews and determine the main themes and patterns.\n"
                    f"Rules:\n{prompt_rules}\n\n"
                    f"Product reviews:\n{json.dumps(payload, ensure_ascii=False)}"
                )
            ),
        ]
    )
