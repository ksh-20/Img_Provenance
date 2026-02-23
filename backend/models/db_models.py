from datetime import datetime
from sqlalchemy import (
    Column, Integer, String, Float, Boolean,
    DateTime, ForeignKey, Text, JSON
)
from sqlalchemy.orm import relationship
from database import Base


class User(Base):
    __tablename__ = "users"

    id              = Column(Integer, primary_key=True, index=True)
    username        = Column(String(64), unique=True, nullable=False, index=True)
    email           = Column(String(128), unique=True, nullable=False, index=True)
    hashed_password = Column(String(256), nullable=False)
    is_active       = Column(Boolean, default=True)
    created_at      = Column(DateTime, default=datetime.utcnow)
    last_login      = Column(DateTime, nullable=True)

    # relationships
    analyses        = relationship("AnalysisRecord", back_populates="user", cascade="all, delete-orphan")
    graphs          = relationship("ProvenanceRecord", back_populates="user", cascade="all, delete-orphan")
    social_spreads  = relationship("SocialRecord", back_populates="user", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<User id={self.id} username={self.username}>"


class AnalysisRecord(Base):
    __tablename__ = "analyses"

    id               = Column(Integer, primary_key=True, index=True)
    user_id          = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    image_id         = Column(String(64), nullable=False, index=True)
    filename         = Column(String(256), nullable=False)
    file_size        = Column(Integer, nullable=True)
    image_width      = Column(Integer, nullable=True)
    image_height     = Column(Integer, nullable=True)
    image_format     = Column(String(16), nullable=True)

    # deepfake results
    verdict          = Column(String(32), nullable=True)  # AUTHENTIC | SUSPICIOUS | DEEPFAKE | MANIPULATED
    deepfake_score   = Column(Float, default=0.0)
    gan_score        = Column(Float, default=0.0)
    ela_score        = Column(Float, default=0.0)
    face_swap_score  = Column(Float, default=0.0)
    is_deepfake      = Column(Boolean, default=False)

    # metadata
    has_exif         = Column(Boolean, default=False)
    camera_make      = Column(String(64), nullable=True)
    camera_model     = Column(String(64), nullable=True)
    stego_detected   = Column(Boolean, default=False)
    suspicious_flags = Column(JSON, default=list)

    analyzed_at      = Column(DateTime, default=datetime.utcnow)

    user             = relationship("User", back_populates="analyses")

    def __repr__(self):
        return f"<AnalysisRecord id={self.id} image_id={self.image_id} verdict={self.verdict}>"


class ProvenanceRecord(Base):
    __tablename__ = "provenance_graphs"

    id              = Column(Integer, primary_key=True, index=True)
    user_id         = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    image_id        = Column(String(64), nullable=False, index=True)
    node_count      = Column(Integer, default=0)
    edge_count      = Column(Integer, default=0)
    integrity_score = Column(Float, default=1.0)
    spread_depth    = Column(Integer, default=0)
    chain_broken    = Column(Boolean, default=False)
    graph_data      = Column(JSON, nullable=True) # Full D3/ReactFlow JSON
    created_at      = Column(DateTime, default=datetime.utcnow)

    user            = relationship("User", back_populates="graphs")


class SocialRecord(Base):
    __tablename__ = "social_spreads"

    id               = Column(Integer, primary_key=True, index=True)
    user_id          = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    image_id         = Column(String(64), nullable=False, index=True)
    total_reach      = Column(Integer, default=0)
    viral_coefficient= Column(Float, default=0.0)
    platforms        = Column(JSON, default=list)   # ["Twitter", "Instagram", ...]
    bot_ratio        = Column(Float, default=0.0)
    spread_data      = Column(JSON, nullable=True) # Full graph/time JSON
    created_at       = Column(DateTime, default=datetime.utcnow)

    user             = relationship("User", back_populates="social_spreads")
