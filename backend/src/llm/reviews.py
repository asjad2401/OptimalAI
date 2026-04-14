import importlib
import json

from src.config import settings
from src.models.amazon import ProductData
from src.models.scraper import ReviewAnalysis


def _to_review_payload(data: ProductData) -> dict:
    payload = {
        "seller_reviews": [
            {"rating": r.rating, "title": r.title, "body": r.body}
            for r in data.reviews
        ],
        "competitor_reviews": {}
    }
    for comp in data.competitors:
        if comp.asin and comp.reviews:
            payload["competitor_reviews"][comp.asin] = [
                {"rating": r.rating, "title": r.title, "body": r.body}
                for r in comp.reviews
            ]
    return payload


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
        "Goal: analyze review themes and patterns to extract actionable insights comparing our product (seller_reviews) against competitors (competitor_reviews).\n"
        "You must output exactly these fields:\n"
        "1. overall_sentiment_summary: A brief objective summary of how customers view our product.\n"
        "2. what_we_do_well: Highlight the strengths and positive patterns of our product based on seller_reviews.\n"
        "3. strategies_to_improve: Suggest actionable business/marketing strategies to fix our weaknesses based on seller_reviews.\n"
        "4. competitor_weaknesses: Surface common complaints and weaknesses from competitor_reviews to help us position against them.\n"
        "5. themes: (Optional) Any specific recurring themes.\n"
        "Write in plain, objective language. Do not output technical jargon or subjective fluff.\n"
    )

    messages = [
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

    try:
        analysis = await structured_llm.ainvoke(messages)
    except Exception as e:
        if "503" in str(e) or "UNAVAILABLE" in str(e):
            print(f"Main model {settings.GEMINI_MODEL} failed, trying fallback {settings.GEMINI_FALLBACK_MODEL}. Error: {e}")
            fallback_llm = ChatGoogleGenerativeAI(
                model=settings.GEMINI_FALLBACK_MODEL,
                google_api_key=settings.GEMINI_API_KEY,
                temperature=0.1,
            )
            fallback_structured_llm = fallback_llm.with_structured_output(ReviewAnalysis)
            analysis = await fallback_structured_llm.ainvoke(messages)
        else:
            raise e

    valid_reviews = [r for r in data.reviews if r.rating]
    if not valid_reviews:
        analysis.overall_sentiment_score = 50
    else:
        total = sum((r.rating - 1) * 25 for r in valid_reviews)
        analysis.overall_sentiment_score = int(total / len(valid_reviews))

    comp_scores = {}
    for comp in data.competitors:
        if not comp.asin:
            continue
        comp_valid_reviews = [r for r in comp.reviews if r.rating]
        if not comp_valid_reviews:
            continue
        comp_total = sum((r.rating - 1) * 25 for r in comp_valid_reviews)
        comp_scores[comp.asin] = int(comp_total / len(comp_valid_reviews))
    
    analysis.competitor_sentiment_scores = comp_scores

    return analysis
