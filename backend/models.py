from pydantic import BaseModel
from typing import Optional


# ─────────────────────────────────────────
# AGENCY
# ─────────────────────────────────────────
class AgencyCreate(BaseModel):
    name: str
    name_arabic: Optional[str] = None
    category: Optional[str] = None
    description: Optional[str] = None
    zone: Optional[str] = None
    address: Optional[str] = None
    city: str = "Tunis"
    website: Optional[str] = None
    google_maps_url: Optional[str] = None
    google_place_id: Optional[str] = None
    google_rating: Optional[float] = None
    google_reviews_count: Optional[int] = None
    status: str = "active"
    source: Optional[str] = None
    notes: Optional[str] = None

class AgencyUpdate(BaseModel):
    name: Optional[str] = None
    category: Optional[str] = None
    zone: Optional[str] = None
    website: Optional[str] = None
    status: Optional[str] = None
    notes: Optional[str] = None


# ─────────────────────────────────────────
# CONTACT
# ─────────────────────────────────────────
class ContactCreate(BaseModel):
    agency_id: int
    phone: Optional[str] = None
    phone_2: Optional[str] = None
    whatsapp: Optional[str] = None
    email_general: Optional[str] = None
    email_decision_maker: Optional[str] = None
    instagram_url: Optional[str] = None
    facebook_url: Optional[str] = None
    linkedin_url: Optional[str] = None
    tiktok_url: Optional[str] = None
    youtube_url: Optional[str] = None
    source: Optional[str] = None


# ─────────────────────────────────────────
# DECISION MAKER
# ─────────────────────────────────────────
class DecisionMakerCreate(BaseModel):
    agency_id: int
    full_name: str
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    job_title: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    whatsapp: Optional[str] = None
    linkedin_url: Optional[str] = None
    instagram_url: Optional[str] = None
    source: Optional[str] = None
    notes: Optional[str] = None


# ─────────────────────────────────────────
# AGENCY INTELLIGENCE
# ─────────────────────────────────────────
class IntelligenceCreate(BaseModel):
    agency_id: int
    instagram_followers: Optional[int] = None
    instagram_posts_count: Optional[int] = None
    instagram_last_post: Optional[str] = None
    instagram_post_frequency: Optional[str] = None
    instagram_content_quality: Optional[str] = None
    instagram_content_gaps: Optional[str] = None
    facebook_followers: Optional[int] = None
    facebook_last_post: Optional[str] = None
    facebook_activity: Optional[str] = None
    linkedin_followers: Optional[int] = None
    linkedin_last_post: Optional[str] = None
    linkedin_employee_count: Optional[int] = None
    last_job_posted: Optional[str] = None
    hired_videographer_before: int = 0
    services_they_offer: Optional[str] = None
    opportunity_score: int = 0
    pitch_angle: Optional[str] = None


# ─────────────────────────────────────────
# OPPORTUNITY
# ─────────────────────────────────────────
class OpportunityCreate(BaseModel):
    title: str
    description: Optional[str] = None
    platform: str
    url: Optional[str] = None
    external_id: Optional[str] = None
    category: Optional[str] = None
    type: Optional[str] = None
    client_name: Optional[str] = None
    client_location: Optional[str] = None
    agency_id: Optional[int] = None
    budget_min: Optional[float] = None
    budget_max: Optional[float] = None
    budget_currency: str = "TND"
    budget_type: Optional[str] = None
    posted_date: Optional[str] = None
    deadline: Optional[str] = None
    status: str = "new"
    notes: Optional[str] = None

class OpportunityUpdate(BaseModel):
    status: Optional[str] = None
    notes: Optional[str] = None
    is_read: Optional[int] = None


# ─────────────────────────────────────────
# OUTREACH
# ─────────────────────────────────────────
class OutreachCreate(BaseModel):
    agency_id: Optional[int] = None
    decision_maker_id: Optional[int] = None
    opportunity_id: Optional[int] = None
    channel: str
    message_sent: Optional[str] = None
    responded: int = 0
    response_date: Optional[str] = None
    response_content: Optional[str] = None
    response_sentiment: Optional[str] = None
    follow_up_date: Optional[str] = None
    outcome: Optional[str] = None
    notes: Optional[str] = None
