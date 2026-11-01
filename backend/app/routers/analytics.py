"""
Token Usage Analytics and Dashboard API Router.
Aggregates prompt tokens, completion tokens, total consumption, and estimated costs.
"""

from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy import desc, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.session import ConversationSession
from app.models.token_usage import TokenUsageLog
from app.schemas.token_usage import (
    ModelUsageSummary,
    SessionUsageSummary,
    TokenDashboardSummary,
    TokenLogItem,
)
from app.routers.config import _load_active_config

router = APIRouter(prefix="/api/analytics", tags=["Analytics"])


@router.get("/tokens", response_model=TokenDashboardSummary)
async def get_token_analytics(db: AsyncSession = Depends(get_db)):
    """Aggregate token usage and cost metrics across sessions and models."""
    # 1. Total aggregates
    tot_stmt = select(
        func.coalesce(func.sum(TokenUsageLog.prompt_tokens), 0).label("tot_prompt"),
        func.coalesce(func.sum(TokenUsageLog.completion_tokens), 0).label("tot_comp"),
        func.coalesce(func.sum(TokenUsageLog.total_tokens), 0).label("tot_all"),
        func.coalesce(func.sum(TokenUsageLog.estimated_cost_usd), 0.0).label("tot_cost"),
        func.count(TokenUsageLog.id).label("tot_requests"),
    )
    tot_res = await db.execute(tot_stmt)
    tot_row = tot_res.one()

    # 2. Aggregates by Model
    by_model_stmt = (
        select(
            TokenUsageLog.model,
            TokenUsageLog.provider,
            func.count(TokenUsageLog.id).label("calls"),
            func.sum(TokenUsageLog.prompt_tokens).label("p_tok"),
            func.sum(TokenUsageLog.completion_tokens).label("c_tok"),
            func.sum(TokenUsageLog.total_tokens).label("t_tok"),
            func.sum(TokenUsageLog.estimated_cost_usd).label("cost"),
        )
        .group_by(TokenUsageLog.model, TokenUsageLog.provider)
        .order_by(desc("t_tok"))
    )
    model_res = await db.execute(by_model_stmt)
    by_model = [
        ModelUsageSummary(
            model=r[0],
            provider=r[1],
            total_calls=r[2],
            total_prompt_tokens=r[3],
            total_completion_tokens=r[4],
            total_tokens=r[5],
            total_cost_usd=round(r[6], 6),
        )
        for r in model_res.all()
    ]

    # 3. Aggregates by Session
    by_sess_stmt = (
        select(
            TokenUsageLog.session_id,
            ConversationSession.title,
            func.sum(TokenUsageLog.prompt_tokens).label("p_tok"),
            func.sum(TokenUsageLog.completion_tokens).label("c_tok"),
            func.sum(TokenUsageLog.total_tokens).label("t_tok"),
            func.sum(TokenUsageLog.estimated_cost_usd).label("cost"),
        )
        .join(ConversationSession, TokenUsageLog.session_id == ConversationSession.id)
        .group_by(TokenUsageLog.session_id, ConversationSession.title)
        .order_by(desc("t_tok"))
        .limit(20)
    )
    sess_res = await db.execute(by_sess_stmt)
    by_session = [
        SessionUsageSummary(
            session_id=r[0],
            session_title=r[1],
            total_prompt_tokens=r[2],
            total_completion_tokens=r[3],
            total_tokens=r[4],
            total_cost_usd=round(r[5], 6),
        )
        for r in sess_res.all()
    ]

    # 4. Recent logs
    rec_stmt = select(TokenUsageLog).order_by(TokenUsageLog.timestamp.desc()).limit(25)
    rec_res = await db.execute(rec_stmt)
    recent_logs = [TokenLogItem.model_validate(l) for l in rec_res.scalars().all()]

    active_cfg = await _load_active_config(db)

    return TokenDashboardSummary(
        total_prompt_tokens=tot_row.tot_prompt,
        total_completion_tokens=tot_row.tot_comp,
        total_tokens=tot_row.tot_all,
        total_cost_usd=round(tot_row.tot_cost, 6),
        total_requests=tot_row.tot_requests,
        active_provider=active_cfg.provider,
        active_model=active_cfg.model,
        by_model=by_model,
        by_session=by_session,
        recent_logs=recent_logs,
    )

