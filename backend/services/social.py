"""
Social spread simulation and tracking service.
Models how manipulated images propagate across social media platforms.
Computes viral coefficient, reach estimates, and bot probability.
"""

import random
import math
from datetime import datetime, timedelta
from typing import List, Dict
from models.schemas import SocialSpreadGraph, SocialSpreadNode

PLATFORMS = [
    {"name": "Twitter",    "base_reach": 5000,  "share_rate": 0.12},
    {"name": "Instagram",  "base_reach": 8000,  "share_rate": 0.08},
    {"name": "Facebook",   "base_reach": 3000,  "share_rate": 0.15},
    {"name": "Reddit",     "base_reach": 12000, "share_rate": 0.20},
    {"name": "Telegram",   "base_reach": 1500,  "share_rate": 0.30},
    {"name": "TikTok",     "base_reach": 15000, "share_rate": 0.10},
    {"name": "WhatsApp",   "base_reach": 500,   "share_rate": 0.40},
    {"name": "4chan",       "base_reach": 2000,  "share_rate": 0.25},
]

BOT_ACCOUNT_PATTERNS = ["bot_", "auto_", "news_bot", "share_bot", "feed_", "auto"]


def _generate_account_name(platform: str, is_bot: bool) -> str:
    if is_bot:
        prefix = random.choice(BOT_ACCOUNT_PATTERNS)
        return f"{prefix}{random.randint(100, 9999)}"
    adjectives = ["info", "news", "daily", "real", "official", "truth", "viral"]
    nouns = ["media", "posts", "share", "feed", "hub", "desk"]
    return f"{random.choice(adjectives)}_{random.choice(nouns)}_{random.randint(10, 999)}"


def simulate_social_spread(image_id: str, deepfake_score: float, base_time: datetime) -> SocialSpreadGraph:
    """
    Simulate the viral spread of an image across social media platforms.
    Higher deepfake score → more aggressive spread (sensational content spreads faster).
    """
    # Number of platforms the image reaches
    num_platforms = random.randint(2, min(6, len(PLATFORMS)))
    selected_platforms = random.sample(PLATFORMS, num_platforms)

    spread_nodes: List[SocialSpreadNode] = []
    current_time = base_time
    total_reach = 0
    platform_names = []

    # Virality multiplier based on deepfake score (manipulated = more sensational = more viral)
    virality_mult = 1.0 + deepfake_score * 2.0

    for i, platform in enumerate(selected_platforms):
        platform_names.append(platform["name"])
        delay_hours = random.uniform(0.1, 6) * (i + 1)
        post_time = current_time + timedelta(hours=delay_hours)

        # Number of posts on this platform
        num_posts = random.randint(1, 5)
        for j in range(num_posts):
            post_time_j = post_time + timedelta(hours=random.uniform(0, 12))
            is_bot = random.random() < (0.2 + deepfake_score * 0.3)

            reach = int(platform["base_reach"] * virality_mult * random.uniform(0.5, 2.0))
            shares = int(reach * platform["share_rate"] * random.uniform(0.5, 1.5))
            likes = int(reach * random.uniform(0.05, 0.25))
            total_reach += reach

            node = SocialSpreadNode(
                platform=platform["name"],
                account_id=f"acc_{random.randint(100000, 999999)}",
                account_name=_generate_account_name(platform["name"], is_bot),
                timestamp=post_time_j.isoformat(),
                shares=shares,
                likes=likes,
                reach=reach,
                deepfake_score=round(min(deepfake_score + random.uniform(-0.05, 0.05), 1.0), 4),
                is_bot=is_bot
            )
            spread_nodes.append(node)

    # Sort by timestamp
    spread_nodes.sort(key=lambda x: x.timestamp)

    # Viral coefficient (branching factor) — R0 style
    if spread_nodes:
        avg_shares = sum(n.shares for n in spread_nodes) / len(spread_nodes)
        viral_coefficient = round(avg_shares / max(len(spread_nodes), 1), 2)
    else:
        viral_coefficient = 0.0

    first_seen = spread_nodes[0].timestamp if spread_nodes else base_time.isoformat()
    # Peak time = node with highest reach
    peak_node = max(spread_nodes, key=lambda n: n.reach, default=None)
    peak_time = peak_node.timestamp if peak_node else base_time.isoformat()

    return SocialSpreadGraph(
        image_id=image_id,
        platforms=platform_names,
        total_reach=total_reach,
        viral_coefficient=viral_coefficient,
        spread_timeline=spread_nodes,
        first_seen=first_seen,
        peak_spread_time=peak_time
    )
